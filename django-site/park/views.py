from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import BooleanField, Case, Q, Value, When
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_http_methods, require_POST

from .forms import ObservationForm, ReportForm
from .models import AREA_CHOICES, MunicipalImage, Observation, Report


def public_reports():
    return Report.objects.filter(state=Report.State.PUBLIC)


def observation_rows(queryset):
    return queryset.defer("photo").annotate(has_photo=Case(
        When(photo=b"", then=Value(False)), default=Value(True), output_field=BooleanField(),
    ))


def public_observations():
    return observation_rows(Observation.objects.filter(report__state=Report.State.PUBLIC))


def home(request):
    reports = list(public_reports())
    latest_by_area = {}
    photos_by_area = {}
    observations = public_observations().select_related("report").order_by("-report__visited_on", "-report_id")
    for row in observations:
        latest_by_area.setdefault(row.area, row.report_id)
        if row.has_photo:
            photos_by_area.setdefault(row.area, row)
    plan_areas = set(MunicipalImage.objects.values_list("area", flat=True))
    return render(request, "park/home.html", {
        "reports": reports,
        "latest": reports[0] if reports else None,
        "areas": [
            (area, name, latest_by_area.get(area), area in plan_areas, photos_by_area.get(area))
            for area, name in AREA_CHOICES
        ],
    })


def coordinator(user):
    return user.has_perm("park.publish_report")


def accessible_report(user, pk, lock=False):
    reports = Report.objects.select_for_update() if lock else Report.objects
    report = get_object_or_404(reports, pk=pk)
    if report.owner_id != user.pk and not coordinator(user):
        raise Http404
    return report


def report_page(request, report, preview=False):
    history = list(public_observations().filter(
        Q(report__visited_on__lt=report.visited_on) |
        Q(report__visited_on=report.visited_on, report_id__lt=report.pk)
    ).select_related("report").order_by("-report__visited_on", "-report_id"))
    current = {item.area: item for item in observation_rows(report.observations.all())}
    plans = {item.area: item for item in MunicipalImage.objects.defer("image")}
    return render(request, "park/report.html", {
        "report": report, "preview": preview, "overview": plans.get(0),
        "areas": [
            (area, name, plans.get(area), ([current[area]] if area in current else []) +
             [item for item in history if item.area == area])
            for area, name in AREA_CHOICES
        ],
    })


def report_detail(request, pk):
    return report_page(request, get_object_or_404(public_reports(), pk=pk))


@login_required
def preview(request, pk):
    return report_page(request, accessible_report(request.user, pk), preview=True)


def photo_response(data):
    if not data:
        raise Http404
    response = HttpResponse(bytes(data), content_type="image/jpeg")
    response["Cache-Control"] = "private, no-store"
    return response


def observation_photo(request, pk):
    item = get_object_or_404(Observation.objects.select_related("report"), pk=pk)
    if item.report.state != Report.State.PUBLIC and not (
        request.user.is_authenticated and (item.report.owner_id == request.user.pk or coordinator(request.user))
    ):
        raise Http404
    return photo_response(item.photo)


def municipal_photo(request, area):
    return photo_response(get_object_or_404(MunicipalImage, area=area).image)


@login_required
def desk(request):
    return render(request, "park/desk.html", {
        "mine": Report.objects.filter(owner=request.user),
        "queue": Report.objects.filter(state=Report.State.REVIEW).exclude(owner=request.user) if coordinator(request.user) else [],
    })


@login_required
@require_http_methods(["GET", "POST"])
@transaction.atomic
def edit(request, pk=None):
    report = accessible_report(request.user, pk, lock=request.method == "POST") if pk else Report(owner=request.user)
    editable = report.owner_id == request.user.pk and report.state == Report.State.DRAFT
    if request.method == "POST" and not editable:
        raise PermissionDenied
    form = ReportForm(request.POST or None, instance=report)
    if request.method == "POST" and form.is_valid():
        form.save()
        return redirect("edit", pk=report.pk)
    return render(request, "park/edit.html", {
        "report": report, "form": form, "editable": editable,
        "can_review": coordinator(request.user) and report.owner_id != request.user.pk and report.state == Report.State.REVIEW,
        "observations": report.observations.defer("photo") if report.pk else [],
    })


@login_required
@require_http_methods(["GET", "POST"])
@transaction.atomic
def observation_edit(request, pk, area=None):
    report = accessible_report(request.user, pk, lock=request.method == "POST")
    if report.owner_id != request.user.pk or report.state != Report.State.DRAFT:
        raise PermissionDenied
    row = get_object_or_404(report.observations, area=area) if area is not None else Observation(report=report)
    form = ObservationForm(request.POST or None, request.FILES or None, instance=row)
    used = report.observations.exclude(pk=row.pk).values_list("area", flat=True)
    form.fields["area"].choices = [(key, name) for key, name in AREA_CHOICES if key not in used]
    if request.method == "POST" and form.is_valid():
        form.save()
        return redirect("edit", pk=pk)
    return render(request, "park/observation.html", {"form": form, "report": report, "observation": row})


@login_required
@require_POST
@transaction.atomic
def transition(request, pk, action):
    report = accessible_report(request.user, pk, lock=True)
    if action == "submit" and report.state == Report.State.DRAFT and report.owner_id == request.user.pk:
        if not report.observations.exists() and not report.summary.strip():
            messages.error(request, "הוסיפו דיווח על אזור או סיכום לפני השליחה.")
            return redirect("edit", pk=pk)
        report.state = Report.State.REVIEW
    elif report.state == Report.State.REVIEW and coordinator(request.user) and report.owner_id != request.user.pk:
        if action == "publish":
            report.state = Report.State.PUBLIC
            report.published_at = timezone.now()
        elif action == "return":
            report.state = Report.State.DRAFT
        else:
            raise PermissionDenied
    else:
        raise PermissionDenied
    report.save(update_fields=["state", "published_at"])
    return redirect("edit", pk=pk)
