import secrets
from django.utils import timezone
from datetime import timedelta
from api.models import EmailVerificationTokens, Users
from django.db import transaction as db_transaction

class EmailTokenService:

    @staticmethod
    def generate_token(length=64):
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def create_token(user_id, token_type, expiry_hours=24):
        token = EmailTokenService.generate_token()
        expires_at = timezone.now() + timedelta(hours=expiry_hours)

        with db_transaction.atomic():
            EmailVerificationTokens.objects.filter(
                user_id=user_id, token_type=token_type, is_used=False
            ).update(is_used=True)

            user = Users.objects.get(user_id=user_id)
            EmailVerificationTokens.objects.create(
                user=user,
                token=token,
                token_type=token_type,
                is_used=False,
                created_at=timezone.now(),
                expires_at=expires_at
            )
        return token

    @staticmethod
    def verify_token(token_string, token_type):
        now = timezone.now()
        with db_transaction.atomic():
            token_obj = EmailVerificationTokens.objects.select_for_update().filter(
                token=token_string,
                token_type=token_type,
                is_used=False,
                expires_at__gt=now
            ).select_related('user').first()
            
            if not token_obj:
                return None
                
            token_obj.is_used = True
            token_obj.save()
            return token_obj.user
