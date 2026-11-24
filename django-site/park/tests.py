from datetime import date
from io import BytesIO

from django.contrib.auth.models import Permission, User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from PIL import Image

from .models import Report


class PublicationTests(TestCase):
    def test_partial_report_with_photo_and_independent_approval(self):
        author = User.objects.create_user("vladi")
        reviewer = User.objects.create_user("ariel")
        permission = Permission.objects.get(codename="publish_report")
        author.user_permissions.add(permission)
        reviewer.user_permissions.add(permission)
        self.client.force_login(author)
        image = BytesIO()
        Image.new("RGB", (12, 10)).save(image, "PNG")
        response = self.client.post(reverse("new"), {
            "visited_on": "2026-11-10", "reviewers": [author.pk], "summary": "סיור בדיקה",
            "areas-TOTAL_FORMS": "1", "areas-INITIAL_FORMS": "0",
            "areas-0-area": "4", "areas-0-status": "active",
            "areas-0-clear_path": "yes", "areas-0-continuous_access": "unknown",
            "areas-0-camera": SimpleUploadedFile("capture.png", image.getvalue(), content_type="image/png"),
        })
        self.assertEqual(response.status_code, 302)
        report = Report.objects.get()
        self.assertContains(self.client.get(response.url), "הוספת אזור")
        item = report.observations.get()
        photo_url = reverse("observation_photo", args=[item.pk])
        public_url = reverse("report", args=[report.pk])
        self.assertEqual(self.client.get(photo_url).status_code, 200)
        self.assertContains(self.client.get(reverse("preview", args=[report.pk])), photo_url)
        self.assertEqual(self.client.post(reverse("transition", args=[report.pk, "submit"])).status_code, 302)
        self.assertEqual(self.client.post(reverse("transition", args=[report.pk, "publish"])).status_code, 403)
        self.client.logout()
        self.assertEqual(self.client.get(photo_url).status_code, 404)
        self.assertEqual(self.client.get(public_url).status_code, 404)
        self.client.force_login(reviewer)
        self.assertContains(self.client.get(reverse("edit", args=[report.pk])), "פרסום דו״ח")
        self.assertEqual(self.client.post(reverse("transition", args=[report.pk, "publish"])).status_code, 302)
        self.client.logout()
        self.assertEqual(self.client.get(photo_url).status_code, 200)
        self.assertContains(self.client.get(public_url), "מצללת מטפסים")
        self.assertContains(self.client.get(reverse("home")), f"{public_url}#area-4")

        newest = Report.objects.create(owner=author, visited_on=date(2026, 11, 20), state=Report.State.PUBLIC)
        home = self.client.get(reverse("home"))
        self.assertEqual(home.context["latest"], newest)
        self.assertContains(home, f"{public_url}#area-4")
        self.assertContains(self.client.get(reverse("report", args=[newest.pk])), "מוצג דיווח מסיור קודם")
