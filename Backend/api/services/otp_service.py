from django.utils import timezone
import secrets
import string
from datetime import timedelta
from api.tasks import send_otp_email, send_otp_sms
from api.models import OtpCodes, Users
from django.db import transaction as db_transaction

class OTPService:
    
    @staticmethod
    def generate_otp(length=6):
        digits = string.digits
        otp = ''.join(secrets.choice(digits) for _ in range(length))
        return otp
    
    """Create OTP"""
    @staticmethod
    def create_otp(user_id, otp_type, expiry_minutes=10):
        now = timezone.now()
        expires_at = now + timedelta(minutes=expiry_minutes)
        code = OTPService.generate_otp()

        with db_transaction.atomic():
            OtpCodes.objects.filter(
                user_id=user_id, otp_type=otp_type, is_used=False
            ).update(is_used=True)

            user = Users.objects.get(user_id=user_id)
            OtpCodes.objects.create(
                user=user,
                code=code,
                otp_type=otp_type,
                is_used=False,
                created_at=now,
                expires_at=expires_at
            )

        return code
    
    @staticmethod
    def verify_otp(user, code, otp_type):
        user_id = user.user_id if hasattr(user, 'user_id') else user
        now = timezone.now()
        
        with db_transaction.atomic():
            otp = OtpCodes.objects.select_for_update().filter(
                user_id=user_id, code=code, otp_type=otp_type, 
                is_used=False, expires_at__gt=now
            ).first()
            
            if not otp:
                return False
                
            otp.is_used = True
            otp.save()
            return True
    
    """
    * Note: Can use Celery to run periodically
    Delete expired OTPs """
    @staticmethod
    def cleanup_expired_otp():
        OtpCodes.objects.filter(expires_at__lt=timezone.now()).delete()


    """Send OTP via email for account activation """
    @staticmethod
    def send_activation_otp(user):
        otp = OTPService.create_otp(user.user_id, 'activation', expiry_minutes=10)        
        send_otp_email.delay(
            user_email=user.email,
            user_name=getattr(user, 'full_name', user.email),
            otp_code=otp,
            otp_type='activation'
        )
        print(f"OTP for activation: {otp}")  
        return otp

    """Send OTP via email for password reset """
    @staticmethod
    def send_reset_password_otp(user):
        otp = OTPService.create_otp(user.user_id, 'reset_password', expiry_minutes=10)
        
        send_otp_email.delay(
            user_email=user.email,
            user_name=getattr(user, 'full_name', user.email),
            otp_code=otp,
            otp_type='reset_password'
        )
        
        return otp

    """Send OTP via SMS for account activation """
    @staticmethod
    def send_activation_sms_otp(user):
        if not user.phone:
            raise ValueError('User does not have a phone number')
        otp = OTPService.create_otp(user.user_id, 'activation', expiry_minutes=10)

        # Normalize Vietnamese phone number to E.164 format
        phone = user.phone
        if phone.startswith('0'):
            phone = '+84' + phone[1:]
        elif phone.startswith('0084'):
            phone = '+' + phone[2:]
        elif not phone.startswith('+'):
            phone = '+84' + phone

        send_otp_sms.delay(
            phone_number=phone,
            otp_code=otp,
            otp_type='activation'
        )
        print(f"OTP for SMS activation: {otp}")
        return otp