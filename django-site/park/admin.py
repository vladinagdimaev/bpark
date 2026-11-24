from django.contrib import admin

from .forms import MunicipalImageForm
from .models import MunicipalImage


@admin.register(MunicipalImage)
class MunicipalImageAdmin(admin.ModelAdmin):
    form = MunicipalImageForm
    list_display = ("area", "caption")
