from django.db import models
from django.conf import settings

class RefreshToken(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    replaced_by_token = models.CharField(max_length=255, null=True, blank=True)
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'refresh_tokens'

    @property
    def is_expired(self):
        from django.utils import timezone
        return self.expires_at < timezone.now()

    @property
    def is_active(self):
        return self.revoked_at is None and not self.is_expired

class RememberToken(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    token_hash = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'remember_tokens'

    @property
    def is_expired(self):
        from django.utils import timezone
        return self.expires_at < timezone.now()