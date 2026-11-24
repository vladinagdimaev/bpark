from django.conf import settings
from django.db import models
from django.utils import timezone

AREAS = [
    "מתקני הכושר", "בין צמרות", "משחק לפעוטות", "מצללת מטפסים", "רחבת נורדאו",
    "המעיין הפועם", "אזור נדנדות", "דק הפרלמנט", "שביל נגיש",
    "פרגולות הזית והחורשה", "חצר כלבים",
]
AREA_CHOICES = list(enumerate(AREAS, 1))


class Report(models.Model):
    class State(models.TextChoices):
        DRAFT = "draft", "טיוטה"
        REVIEW = "review", "ממתין לאישור"
        PUBLIC = "public", "פורסם"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    visited_on = models.DateField(default=timezone.localdate, verbose_name="תאריך סיור")
    reviewers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="visits", verbose_name="סוקרים")
    summary = models.TextField(blank=True, verbose_name="סיכום")
    next_visit = models.DateField(null=True, blank=True, verbose_name="הסיור הבא")
    state = models.CharField(max_length=8, choices=State, default=State.DRAFT)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-visited_on", "-pk"]
        permissions = [("publish_report", "Can review and publish another user's report")]

    def __str__(self):
        return str(self.visited_on)


class Observation(models.Model):
    class Status(models.TextChoices):
        TODO = "todo", "טרם החל"
        ACTIVE = "active", "בתהליך"
        DONE = "done", "הושלם"
        UNKNOWN = "unknown", "לא נבדק"

    class Answer(models.TextChoices):
        YES = "yes", "קיים"
        NO = "no", "לא קיים"
        UNKNOWN = "unknown", "לא נבדק"

    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name="observations")
    area = models.PositiveSmallIntegerField(choices=AREA_CHOICES, verbose_name="אזור")
    status = models.CharField(max_length=7, choices=Status, default=Status.UNKNOWN, verbose_name="סטטוס")
    details = models.TextField(blank=True, verbose_name="מצב עבודות")
    follow_up = models.TextField(blank=True, verbose_name="נקודות למעקב")
    clear_path = models.CharField(max_length=7, choices=Answer, default=Answer.UNKNOWN, verbose_name="מעבר פנוי")
    continuous_access = models.CharField(max_length=7, choices=Answer, default=Answer.UNKNOWN, verbose_name="גישה רציפה")
    photo = models.BinaryField(blank=True, default=bytes)
    caption = models.CharField(max_length=240, blank=True, verbose_name="תיאור התמונה")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["report", "area"], name="one_observation_per_area")]


class MunicipalImage(models.Model):
    area = models.PositiveSmallIntegerField(unique=True, choices=[(0, "הדמיה כללית"), *AREA_CHOICES])
    image = models.BinaryField()
    caption = models.CharField(max_length=240, blank=True)
