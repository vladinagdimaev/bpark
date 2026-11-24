from io import BytesIO

from django import forms
from django.contrib.auth import get_user_model
from PIL import Image, ImageOps

from .models import MunicipalImage, Observation, Report


class DateInput(forms.DateInput):
    input_type = "date"

    def __init__(self):
        super().__init__(format="%Y-%m-%d")


class ReportForm(forms.ModelForm):
    class Meta:
        model = Report
        fields = ["visited_on", "reviewers", "summary", "next_visit"]
        widgets = {"visited_on": DateInput(), "next_visit": DateInput(), "reviewers": forms.CheckboxSelectMultiple()}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["reviewers"].queryset = get_user_model().objects.filter(is_active=True)
        self.fields["reviewers"].label_from_instance = lambda user: user.get_full_name() or user.username

    def clean_reviewers(self):
        reviewers = self.cleaned_data["reviewers"]
        if not 1 <= len(reviewers) <= 2:
            raise forms.ValidationError("בחרו סוקר אחד או שניים.")
        return reviewers


def normalize_image(file):
    if file.size > 12 * 1024 * 1024:
        raise forms.ValidationError("התמונה גדולה מ־12 מגה־בייט.")
    try:
        with Image.open(file) as image:
            if image.width * image.height > 32_000_000:
                raise ValueError
            image = ImageOps.exif_transpose(image).convert("RGB")
            image.thumbnail((1600, 1600))
            output = BytesIO()
            image.save(output, "JPEG", quality=78, optimize=True)
    except (OSError, ValueError, Image.DecompressionBombError) as error:
        raise forms.ValidationError("לא ניתן לקרוא את התמונה.") from error
    return output.getvalue()


class ObservationForm(forms.ModelForm):
    camera = forms.FileField(label="צילום מהשטח", required=False, widget=forms.ClearableFileInput(
        attrs={"accept": "image/*", "capture": "environment"}
    ))
    upload = forms.FileField(label="בחירה מהגלריה", required=False, widget=forms.ClearableFileInput(
        attrs={"accept": "image/*"}
    ))

    class Meta:
        model = Observation
        fields = ["area", "status", "details", "follow_up", "clear_path", "continuous_access", "camera", "upload", "caption"]

    def clean(self):
        data = super().clean()
        if data.get("camera") and data.get("upload"):
            raise forms.ValidationError("בחרו תמונה אחת.")
        file = data.get("camera") or data.get("upload")
        if file:
            self.instance.photo = normalize_image(file)
        return data


class MunicipalImageForm(forms.ModelForm):
    upload = forms.FileField(label="קובץ תמונה", required=False)

    class Meta:
        model = MunicipalImage
        fields = ["area", "caption", "upload"]

    def clean_upload(self):
        file = self.cleaned_data["upload"]
        if file:
            self.instance.image = normalize_image(file)
        elif not self.instance.image:
            raise forms.ValidationError("בחרו תמונה.")
        return file
