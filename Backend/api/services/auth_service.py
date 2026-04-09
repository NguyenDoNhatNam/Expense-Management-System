import jwt
import secrets
import hashlib
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from django.contrib.auth import authenticate
from api.models.token_models import RefreshToken, RememberToken
from django.db import transaction
from django.core.cache import cache
from rest_framework_simplejwt.tokens import AccessToken

# --- Constants ---
ACCESS_TOKEN_LIFETIME = timedelta(minutes=15)
REFRESH_TOKEN_LIFETIME = timedelta(days=7)
REMEMBER_TOKEN_LIFETIME = timedelta(days=90)
REMEMBER_TOKEN_BYTES = 64

# --- Helper Functions ---
def get_request_metadata(request):
    ip = request.META.get('HTTP_X_FORWARDED_FOR') or request.META.get('REMOTE_ADDR')
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    return {'ip_address': ip, 'user_agent': user_agent}

# --- Token Generation ---
def generate_access_token(user):
    now = timezone.now()
    payload = {
        'user_id': getattr(user, 'user_id', getattr(user, 'id', None)),
        'exp': int((now + ACCESS_TOKEN_LIFETIME).timestamp()),
        'iat': int(now.timestamp()),
        'jti': secrets.token_hex(16),
        'token_type': 'access',
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

def generate_opaque_token(byte_length=32):
    return secrets.token_urlsafe(byte_length)

# --- Service Class ---
class AuthService:
    @staticmethod
    def login_user(email, password, remember_me, request):
        user = authenticate(username=email, password=password)
        if not user:
            return None, "Invalid credentials"

        access_token = generate_access_token(user)
        refresh_token_obj, refresh_token_str = AuthService.create_refresh_token(user, request)
        
        remember_token_str = None
        if remember_me:
            remember_token_obj, remember_token_str = AuthService.create_remember_token(user, request)

        return {
            'access_token': access_token,
            'refresh_token': refresh_token_str,
            'remember_token': remember_token_str,
            'remember_me': remember_me
        }, None

    @staticmethod
    def create_refresh_token(user, request):
        token_str = generate_opaque_token()
        token_hash = hashlib.sha256(token_str.encode()).hexdigest()
        metadata = get_request_metadata(request)
        
        token_obj = RefreshToken.objects.create(
            user=user,
            token=token_hash,
            created_at=timezone.now(),
            expires_at=timezone.now() + REFRESH_TOKEN_LIFETIME,
            ip_address=metadata['ip_address'],
            user_agent=metadata['user_agent']
        )
        return token_obj, token_str

    @staticmethod
    def create_remember_token(user, request):
        token_str = generate_opaque_token(REMEMBER_TOKEN_BYTES)
        token_hash = hashlib.sha256(token_str.encode()).hexdigest()
        metadata = get_request_metadata(request)

        token_obj = RememberToken.objects.create(
            user=user,
            token_hash=token_hash,
            created_at=timezone.now(),
            expires_at=timezone.now() + REMEMBER_TOKEN_LIFETIME,
            ip_address=metadata['ip_address'],
            user_agent=metadata['user_agent']
        )
        return token_obj, token_str

    @staticmethod
    @transaction.atomic
    def rotate_refresh_token(old_token_str, request):
        token_hash = hashlib.sha256(old_token_str.encode()).hexdigest()
        try:
            # Khóa Row này trong DB suốt thời gian xử lý để chống Race Condition
            old_token_obj = RefreshToken.objects.select_for_update().select_related('user').get(token=token_hash)
        except RefreshToken.DoesNotExist:
            return None, "Invalid refresh token"

        if not old_token_obj.is_active:
            AuthService.revoke_token_family(old_token_obj)
            return None, "Token has been revoked or expired"

        new_token_obj, new_token_str = AuthService.create_refresh_token(old_token_obj.user, request)
        old_token_obj.revoked_at = timezone.now()
        old_token_obj.replaced_by_token = hashlib.sha256(new_token_str.encode()).hexdigest()
        old_token_obj.save()

        access_token = generate_access_token(old_token_obj.user)
        return {'access_token': access_token, 'refresh_token': new_token_str}, None

    @staticmethod
    def login_with_remember_token(remember_token_str, request):
        if not remember_token_str:
            return None, "Remember token not provided"
            
        token_hash = hashlib.sha256(remember_token_str.encode()).hexdigest()
        try:
            token_obj = RememberToken.objects.select_related('user').get(token_hash=token_hash)
        except RememberToken.DoesNotExist:
            return None, "Invalid remember token"

        if token_obj.is_expired:
            token_obj.delete()
            return None, "Remember token expired"
        
        user = token_obj.user
        token_obj.delete()
        _, new_remember_token_str = AuthService.create_remember_token(user, request)
        access_token = generate_access_token(user)
        _, new_refresh_token_str = AuthService.create_refresh_token(user, request)
        
        return {
            'access_token': access_token,
            'refresh_token': new_refresh_token_str,
            'remember_token': new_remember_token_str
        }, None

    @staticmethod
    def logout(refresh_token_str, remember_token_str, access_token_str=None):
        if refresh_token_str:
            refresh_token_hash = hashlib.sha256(refresh_token_str.encode()).hexdigest()
            RefreshToken.objects.filter(token=refresh_token_hash).delete()
        if remember_token_str:
            token_hash = hashlib.sha256(remember_token_str.encode()).hexdigest()
            RememberToken.objects.filter(token_hash=token_hash).delete()
            
        # Blacklist Access Token vào Redis với thời hạn bằng đúng thời gian sống còn lại của Token
        if access_token_str:
            try:
                token = AccessToken(access_token_str)
                exp_timestamp = token['exp']
                now_timestamp = int(timezone.now().timestamp())
                remaining_time = exp_timestamp - now_timestamp
                
                if remaining_time > 0:
                    cache.set(f"blacklisted_token_{access_token_str}", True, timeout=remaining_time)
            except Exception:
                pass # Bỏ qua nếu token đã hết hạn sẵn hoặc bị lỗi (không thể decode)
                
        return True
        
    @staticmethod
    def revoke_token_family(token_obj):
        if token_obj.replaced_by_token:
            next_token = RefreshToken.objects.filter(token=token_obj.replaced_by_token).first()
            if next_token:
                AuthService.revoke_token_family(next_token)
        if token_obj.revoked_at is None:
            token_obj.revoked_at = timezone.now()
            token_obj.save()