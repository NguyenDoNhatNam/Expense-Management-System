"""
Celery Tasks - Async task processing
Includes:
- Email (OTP, verification)
- Async export (CSV, Excel, PDF for large datasets)
- Backup (daily backup, cleanup)
- Scheduled jobs (recurring transactions, debt reminders)
"""
from celery import shared_task
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.core.cache import cache
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)


# ==================== EMAIL TASKS ====================

@shared_task(bind=True, max_retries=3)
def send_otp_email(self, user_email, user_name, otp_code, otp_type):
    """Send OTP code via email"""
    try:
        subject_map = {
            'activation': 'Account Verification Code',
            'reset_password': 'Password Reset Code',
            'login': 'Login Code',
        }
        logger.info(f"[EMAIL] Preparing OTP email to {user_email} for {otp_type}")
        
        subject = subject_map.get(otp_type, 'Verification Code')
        
        html_content = render_to_string('emails/otp_email.html', {
            'user_name': user_name,
            'otp_code': otp_code,
            'otp_type': otp_type,
            'expiry_minutes': 10,
        })
        
        text_content = f"""
        Hello {user_name},
        
        Your verification code is: {otp_code}
        
        This code is valid for 10 minutes.
        If you did not request this code, please ignore this email.
        """
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user_email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        
        logger.info(f"[EMAIL] OTP sent successfully to {user_email}")
        return {'status': 'success', 'email': user_email}
    
    except Exception as e:
        logger.error(f"[EMAIL] Failed to send OTP to {user_email}: {str(e)}")
        self.retry(exc=e, countdown=60)


@shared_task(bind=True, max_retries=3)
def send_otp_sms(self, phone_number, otp_code, otp_type):
    """Send OTP code via SMS (Twilio)"""
    try:
        account_sid = settings.TWILIO_ACCOUNT_SID
        auth_token = settings.TWILIO_AUTH_TOKEN
        from_number = settings.TWILIO_PHONE_NUMBER

        if not all([account_sid, auth_token, from_number]):
            logger.error("[SMS] Twilio credentials not configured")
            return {'status': 'error', 'message': 'Twilio not configured'}

        from twilio.rest import Client
        client = Client(account_sid, auth_token)

        type_map = {
            'activation': 'account activation',
            'reset_password': 'password reset',
        }
        purpose = type_map.get(otp_type, 'verification')

        message = client.messages.create(
            body=f'[ExpenseMate] Your OTP code for {purpose} is: {otp_code}. Valid for 10 minutes.',
            from_=from_number,
            to=phone_number,
        )

        logger.info(f"[SMS] OTP sent to {phone_number}, SID: {message.sid}")
        return {'status': 'success', 'phone': phone_number, 'sid': message.sid}

    except Exception as e:
        logger.error(f"[SMS] Failed to send OTP to {phone_number}: {str(e)}")
        self.retry(exc=e, countdown=60)


@shared_task(bind=True, max_retries=3)
def send_verification_link_email(self, user_email, user_name, token, token_type):
    """Send verification link via email"""
    try:
        base_url = settings.FRONTEND_URL
        
        url_map = {
            'activation': f'{base_url}/activate/{token}',
            'reset_password': f'{base_url}/reset-password/{token}',
        }
        
        subject_map = {
            'activation': 'Activate Your Account',
            'reset_password': 'Reset Password',
        }
        
        verification_url = url_map.get(token_type)
        subject = subject_map.get(token_type)
        
        html_content = render_to_string('emails/verification_link.html', {
            'user_name': user_name,
            'verification_url': verification_url,
            'token_type': token_type,
            'expiry_hours': 24,
        })
        
        text_content = f"""
        Hello {user_name},
        
        Please click the following link to {subject.lower()}:
        {verification_url}
        
        This link is valid for 24 hours.
        """
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user_email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        
        logger.info(f"[EMAIL] Verification link sent to {user_email}")
        return {'status': 'success', 'email': user_email}
        
    except Exception as e:
        logger.error(f"[EMAIL] Failed to send verification link to {user_email}: {str(e)}")
        self.retry(exc=e, countdown=60)


# ==================== EXPORT TASKS ====================

@shared_task(bind=True, max_retries=2)
def async_export_data(self, user_id: str, data_type: str, export_format: str, filters: dict = None):
    """
    Async data export for large datasets.
    
    Args:
        user_id: User ID
        data_type: Data type (transactions, accounts, budgets, etc.)
        export_format: Format (csv, excel, pdf)
        filters: Optional filters
    
    Returns:
        Dict containing file info and download URL
    """
    from api.models import Users, Transactions, Accounts, Budgets, Debts, SavingsGoals
    from api.services.export_service import ExportService
    
    task_id = self.request.id
    cache_key = f"export_task_{task_id}"
    
    try:
        # Update progress
        cache.set(cache_key, {'status': 'processing', 'progress': 10}, timeout=3600)
        
        user = Users.objects.get(user_id=user_id)
        
        # Get queryset based on data_type
        model_map = {
            'transactions': Transactions,
            'accounts': Accounts,
            'budgets': Budgets,
            'debts': Debts,
            'savings': SavingsGoals,
        }
        
        model = model_map.get(data_type)
        if not model:
            raise ValueError(f"Unsupported data type: {data_type}")
        
        # Build queryset with filters
        queryset = model.objects.filter(user=user)
        if data_type == 'transactions':
            queryset = queryset.filter(is_deleted=False)
        
        # Apply filters
        if filters:
            if 'start_date' in filters:
                queryset = queryset.filter(transaction_date__date__gte=filters['start_date'])
            if 'end_date' in filters:
                queryset = queryset.filter(transaction_date__date__lte=filters['end_date'])
        
        cache.set(cache_key, {'status': 'processing', 'progress': 30}, timeout=3600)
        
        # Export based on format
        if export_format == 'csv':
            filepath = ExportService.export_to_csv(data_type, queryset, user)
        elif export_format == 'excel':
            filepath = ExportService.export_to_excel(data_type, queryset, user)
        elif export_format == 'pdf':
            filepath = ExportService.export_to_pdf(data_type, queryset, user)
        else:
            raise ValueError(f"Unsupported format: {export_format}")
        
        # Get download URL
        download_url = ExportService.get_export_file_url(filepath)
        
        result = {
            'status': 'completed',
            'progress': 100,
            'filepath': filepath,
            'download_url': download_url,
            'data_type': data_type,
            'format': export_format,
            'rows_exported': queryset.count(),
        }
        
        cache.set(cache_key, result, timeout=3600)
        logger.info(f"[EXPORT] Async export completed: {filepath}")
        
        return result
        
    except Exception as e:
        error_result = {
            'status': 'failed',
            'error': str(e),
        }
        cache.set(cache_key, error_result, timeout=3600)
        logger.error(f"[EXPORT] Async export failed: {str(e)}", exc_info=True)
        raise


@shared_task
def cleanup_old_exports():
    """
    Cleanup old export files.
    Scheduled to run daily.
    """
    from api.services.export_service import ExportService
    
    try:
        deleted_count = ExportService.cleanup_old_exports()
        logger.info(f"[CLEANUP] Deleted {deleted_count} old export files")
        return {'deleted': deleted_count}
    except Exception as e:
        logger.error(f"[CLEANUP] Export cleanup failed: {str(e)}")
        raise


# ==================== BACKUP TASKS ====================

@shared_task(bind=True, max_retries=2)
def create_user_backup(self, user_id: str, encrypt: bool = True, upload_s3: bool = True):
    """
    Create backup for a specific user.
    """
    from api.models import Users
    from api.services.backup_service import BackupService
    
    try:
        user = Users.objects.get(user_id=user_id)
        result = BackupService.create_backup(user, encrypt=encrypt, upload_s3=upload_s3)
        
        if result['success']:
            logger.info(f"[BACKUP] User backup completed: {user_id}")
        else:
            logger.error(f"[BACKUP] User backup failed: {user_id} - {result.get('error')}")
        
        return result
        
    except Exception as e:
        logger.error(f"[BACKUP] User backup error for {user_id}: {str(e)}")
        raise


@shared_task
def daily_backup_all_users():
    """
    Daily backup job for all active users.
    Scheduled to run daily at 2:00 AM.
    """
    from api.services.backup_service import BackupService
    
    try:
        result = BackupService.run_daily_backup()
        logger.info(f"[BACKUP] Daily backup completed: {result}")
        return result
    except Exception as e:
        logger.error(f"[BACKUP] Daily backup failed: {str(e)}")
        raise


@shared_task
def cleanup_old_backups():
    """
    Cleanup old backup files.
    Scheduled to run weekly.
    """
    from api.services.backup_service import BackupService
    
    try:
        deleted_count = BackupService.cleanup_old_backups()
        logger.info(f"[CLEANUP] Deleted {deleted_count} old backup files")
        return {'deleted': deleted_count}
    except Exception as e:
        logger.error(f"[CLEANUP] Backup cleanup failed: {str(e)}")
        raise


# ==================== SCHEDULED JOBS ====================

@shared_task
def process_recurring_transactions():
    """
    Process due recurring transactions.
    Scheduled to run daily at 00:00.
    """
    from api.services.recurring_service import RecurringService
    
    try:
        count = RecurringService.process_daily_recurring()
        logger.info(f"[RECURRING] Processed {count} recurring transactions")
        return {'processed': count}
    except Exception as e:
        logger.error(f"[RECURRING] Processing failed: {str(e)}")
        raise


@shared_task
def process_debt_reminders():
    """
    Process reminders and mark overdue debts.
    Scheduled to run daily at 08:00.
    """
    from api.services.debt_service import DebtService
    
    try:
        count = DebtService.process_daily_debts()
        logger.info(f"[DEBT] Created {count} debt reminders")
        return {'reminders_created': count}
    except Exception as e:
        logger.error(f"[DEBT] Processing failed: {str(e)}")
        raise


@shared_task(bind=True, max_retries=3)
def send_export_ready_email(self, user_email: str, user_name: str, download_url: str, export_type: str):
    """
    Send email notification that export is ready.
    """
    try:
        subject = f'Export {export_type} is ready'
        
        text_content = f"""
        Hello {user_name},
        
        Your {export_type} export file is ready for download.
        
        Download link: {download_url}
        
        This link is valid for 24 hours.
        """
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Export Complete!</h2>
            <p>Hello {user_name},</p>
            <p>Your <strong>{export_type}</strong> export file is ready.</p>
            <p>
                <a href="{download_url}" 
                   style="background-color: #4CAF50; color: white; padding: 10px 20px; 
                          text-decoration: none; border-radius: 5px;">
                    Download
                </a>
            </p>
            <p><small>This link is valid for 24 hours.</small></p>
        </body>
        </html>
        """
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user_email]
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        
        logger.info(f"[EMAIL] Export ready notification sent to {user_email}")
        return {'status': 'success', 'email': user_email}
        
    except Exception as e:
        logger.error(f"[EMAIL] Failed to send export notification to {user_email}: {str(e)}")
        self.retry(exc=e, countdown=60)


@shared_task(bind=True, max_retries=3)
def send_backup_ready_email(self, user_email: str, user_name: str, backup_info: dict):
    """
    Send email notification that backup is complete.
    """
    try:
        subject = 'Data Backup Completed'
        
        text_content = f"""
        Hello {user_name},
        
        Your data backup has been created successfully.
        
        Backup information:
        - Backup ID: {backup_info.get('backup_id', 'N/A')}
        - Size: {backup_info.get('size', 0)} bytes
        - Encrypted: {'Yes' if backup_info.get('encrypted') else 'No'}
        
        You can download the backup from Settings > Backup & Restore.
        """
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user_email]
        )
        email.send()
        
        logger.info(f"[EMAIL] Backup notification sent to {user_email}")
        return {'status': 'success', 'email': user_email}
        
    except Exception as e:
        logger.error(f"[EMAIL] Failed to send backup notification to {user_email}: {str(e)}")
        self.retry(exc=e, countdown=60)


@shared_task
def cleanup_expired_tokens():
    """
    Dọn dẹp các refresh token và remember token đã hết hạn khỏi DB.
    Chạy hàng ngày để tối ưu hóa không gian lưu trữ Database.
    """
    try:
        from api.models.token_models import RefreshToken, RememberToken
        from django.utils import timezone
        
        now = timezone.now()
        deleted_refresh, _ = RefreshToken.objects.filter(expires_at__lt=now).delete()
        deleted_remember, _ = RememberToken.objects.filter(expires_at__lt=now).delete()
        
        logger.info(f"[CLEANUP] Deleted {deleted_refresh} expired refresh tokens and {deleted_remember} expired remember tokens")
        return {'deleted_refresh': deleted_refresh, 'deleted_remember': deleted_remember}
    except Exception as e:
        logger.error(f"[CLEANUP] Expired tokens cleanup failed: {str(e)}")
        raise
