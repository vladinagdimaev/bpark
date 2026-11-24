from hashlib import sha256
from hmac import compare_digest
from time import time

from django.contrib.auth.views import PasswordResetConfirmView
from django.db import transaction
from django.http import HttpResponseBadRequest


class SetupToken:
    def check_token(self, user, token):
        if user is None or not user.is_active or not token or len(token) > 128:
            return False
        marker, _, payload = user.password.partition(":")
        if marker != "!setup":
            return False
        expires, _, digest = payload.partition(":")
        return expires.isdecimal() and time() < int(expires) and compare_digest(
            digest, sha256(token.encode()).hexdigest()
        )


class AccountSetupView(PasswordResetConfirmView):
    template_name = "park/account_setup.html"
    token_generator = SetupToken()
    success_url = "/login/"

    @transaction.atomic
    def form_valid(self, form):
        user = type(self.user).objects.select_for_update().get(pk=self.user.pk)
        token = self.request.session.get("_password_reset_token")
        if not self.token_generator.check_token(user, token):
            return HttpResponseBadRequest("קישור ההקמה אינו בתוקף.")
        form.user = user
        return super().form_valid(form)
