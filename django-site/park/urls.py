from django.contrib import admin
from django.contrib.auth.views import LoginView, LogoutView
from django.urls import path

from . import views
from .account_setup import AccountSetupView

urlpatterns = [
    path("", views.home, name="home"),
    path("reports/<int:pk>/", views.report_detail, name="report"),
    path("images/field/<int:pk>/", views.observation_photo, name="observation_photo"),
    path("images/plan/<int:area>/", views.municipal_photo, name="municipal_photo"),
    path("desk/", views.desk, name="desk"),
    path("desk/new/", views.edit, name="new"),
    path("desk/<int:pk>/", views.edit, name="edit"),
    path("desk/<int:pk>/preview/", views.preview, name="preview"),
    path("desk/<int:pk>/area/new/", views.observation_edit, name="new_area"),
    path("desk/<int:pk>/area/<int:area>/", views.observation_edit, name="edit_area"),
    path("desk/<int:pk>/action/<str:action>/", views.transition, name="transition"),
    path("account/setup/<uidb64>/<token>/", AccountSetupView.as_view(), name="account_setup"),
    path("login/", LoginView.as_view(template_name="park/login.html"), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("admin/", admin.site.urls),
]
