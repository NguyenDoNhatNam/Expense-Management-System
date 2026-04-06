"""
Celery Tasks - Xử lý các tác vụ bất đồng bộ
Bao gồm:
- Email (OTP, verification)
- Export async (CSV, Excel, PDF cho dữ liệu lớn)
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
    """Gửi mã OTP qua email"""
    try:
        subject_map = {
            'activation': 'Mã xác thực tài khoản',
            'reset_password': 'Mã đặt lại mật khẩu',
            'login': 'Mã đăng nhập',
        }
        logger.info(f"[EMAIL] Preparing OTP email to {user_email} for {otp_type}")
        
        subject = subject_map.get(otp_type, 'Mã xác thực')
        
        html_content = render_to_string('emails/otp_email.html', {
            'user_name': user_name,
            'otp_code': otp_code,
            'otp_type': otp_type,
            'expiry_minutes': 10,
        })
        
        text_content = f"""
        Xin chào {user_name},
        
        Mã xác thực của bạn là: {otp_code}
        
        Mã này có hiệu lực trong 10 phút.
        Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.
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
def send_verification_link_email(self, user_email, user_name, token, token_type):
    """Gửi link xác thực qua email"""
    try:
        base_url = settings.FRONTEND_URL
        
        url_map = {
            'activation': f'{base_url}/activate/{token}',
            'reset_password': f'{base_url}/reset-password/{token}',
        }
        
        subject_map = {
            'activation': 'Kích hoạt tài khoản của bạn',
            'reset_password': 'Đặt lại mật khẩu',
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
        Xin chào {user_name},
        
        Vui lòng click vào link sau để {subject.lower()}:
        {verification_url}
        
        Link có hiệu lực trong 24 giờ.
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
    Export dữ liệu bất đồng bộ cho dataset lớn.
    
    Args:
        user_id: ID của user
        data_type: Loại dữ liệu (transactions, accounts, budgets, etc.)
        export_format: Định dạng (csv, excel, pdf)
        filters: Bộ lọc tùy chọn
    
    Returns:
        Dict chứa thông tin file và URL download
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
            raise ValueError(f"Loại dữ liệu không hỗ trợ: {data_type}")
        
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
            raise ValueError(f"Định dạng không hỗ trợ: {export_format}")
        
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
    Tạo backup cho một user cụ thể.
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
    Daily backup job cho tất cả active users.
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
    Xử lý các giao dịch định kỳ đến hạn.
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
    Xử lý nhắc nhở và đánh dấu nợ quá hạn.
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
    Gửi email thông báo export đã sẵn sàng.
    """
    try:
        subject = f'Export {export_type} đã sẵn sàng'
        
        text_content = f"""
        Xin chào {user_name},
        
        File export {export_type} của bạn đã sẵn sàng để tải xuống.
        
        Link tải: {download_url}
        
        Link này có hiệu lực trong 24 giờ.
        """
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Export đã hoàn tất!</h2>
            <p>Xin chào {user_name},</p>
            <p>File export <strong>{export_type}</strong> của bạn đã sẵn sàng.</p>
            <p>
                <a href="{download_url}" 
                   style="background-color: #4CAF50; color: white; padding: 10px 20px; 
                          text-decoration: none; border-radius: 5px;">
                    Tải xuống
                </a>
            </p>
            <p><small>Link có hiệu lực trong 24 giờ.</small></p>
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
    Gửi email thông báo backup đã hoàn tất.
    """
    try:
        subject = 'Backup dữ liệu đã hoàn tất'
        
        text_content = f"""
        Xin chào {user_name},
        
        Backup dữ liệu của bạn đã được tạo thành công.
        
        Thông tin backup:
        - Backup ID: {backup_info.get('backup_id', 'N/A')}
        - Kích thước: {backup_info.get('size', 0)} bytes
        - Mã hóa: {'Có' if backup_info.get('encrypted') else 'Không'}
        
        Bạn có thể tải backup từ trang Cài đặt > Backup & Restore.
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

