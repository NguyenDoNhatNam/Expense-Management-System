"""
Backup Service - Xử lý sao lưu dữ liệu người dùng
Features:
- Export JSON toàn bộ dữ liệu user
- Mã hóa AES-256
- Upload S3 (optional)
- Cronjob daily backup
- User download backup
"""
import os
import io
import json
import gzip
import hashlib
import hmac
import logging
import secrets
from base64 import b64encode, b64decode
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Any, Optional
from uuid import uuid4
from decimal import Decimal
from django.utils.dateparse import parse_date
        
from django.conf import settings
from django.utils import timezone
from django.db import models

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding

from api.models import (
    Users, Accounts, Categories, Transactions, Budgets, 
    Debts, DebtPayment, SavingsGoals, Transfers, RecurringTransactions,
    UserSetting, Notification
)

from django.utils.dateparse import parse_datetime
logger = logging.getLogger(__name__)


class BackupEncryption:
    """
    AES-256-CBC encryption cho backup files.
    Sử dụng user-specific key derived từ master key + user_id.
    """
    
    BLOCK_SIZE = 16  
    KEY_SIZE = 32   
    
    @classmethod
    def get_master_key(cls) -> bytes:
        """Lấy master encryption key từ settings"""
        key = getattr(settings, 'BACKUP_ENCRYPTION_KEY', None)
        if not key:
            # Fallback sang SECRET_KEY (không khuyến khích cho production)
            key = settings.SECRET_KEY
            logger.warning("[BACKUP] Using SECRET_KEY as encryption key. Set BACKUP_ENCRYPTION_KEY for production.")
        
        # Đảm bảo key đủ 32 bytes
        return hashlib.sha256(key.encode()).digest()
    
    @classmethod
    def derive_user_key(cls, user_id: str) -> bytes:
        """Derive unique key cho mỗi user từ master key"""
        master_key = cls.get_master_key()
        return hmac.new(master_key, user_id.encode(), hashlib.sha256).digest()
    
    @classmethod
    def encrypt(cls, data: bytes, user_id: str) -> Dict[str, str]:
        """
        Encrypt data với AES-256-CBC.
        Returns: {'iv': base64, 'ciphertext': base64, 'checksum': hex}
        """
        key = cls.derive_user_key(user_id)
        iv = secrets.token_bytes(cls.BLOCK_SIZE)
        
        # Pad data
        padder = padding.PKCS7(cls.BLOCK_SIZE * 8).padder()
        padded_data = padder.update(data) + padder.finalize()
        
        # Encrypt
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(padded_data) + encryptor.finalize()
        
        # Checksum để verify integrity
        checksum = hashlib.sha256(data).hexdigest()
        
        return {
            'iv': b64encode(iv).decode('utf-8'),
            'ciphertext': b64encode(ciphertext).decode('utf-8'),
            'checksum': checksum,
        }
    
    @classmethod
    def decrypt(cls, encrypted_data: Dict[str, str], user_id: str) -> bytes:
        """
        Decrypt data từ encrypted format.
        Raises ValueError nếu checksum không khớp.
        """
        key = cls.derive_user_key(user_id)
        iv = b64decode(encrypted_data['iv'])
        ciphertext = b64decode(encrypted_data['ciphertext'])
        expected_checksum = encrypted_data['checksum']
        
        # Decrypt
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        padded_data = decryptor.update(ciphertext) + decryptor.finalize()
        
        # Unpad
        unpadder = padding.PKCS7(cls.BLOCK_SIZE * 8).unpadder()
        data = unpadder.update(padded_data) + unpadder.finalize()
        
        # Verify checksum
        actual_checksum = hashlib.sha256(data).hexdigest()
        if actual_checksum != expected_checksum:
            raise ValueError("Backup file corrupted: checksum mismatch")
        
        return data


class S3Storage:
    """
    S3 storage cho backup files.
    Có thể disable nếu không cấu hình.
    """
    
    @classmethod
    def is_configured(cls) -> bool:
        """Kiểm tra S3 đã được cấu hình chưa"""
        required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_BACKUP_BUCKET']
        return all(hasattr(settings, key) and getattr(settings, key) for key in required)
    
    @classmethod
    def get_client(cls):
        """Lấy S3 client"""
        try:
            import boto3
        except ImportError:
            raise ImportError("boto3 chưa được cài đặt. Chạy: pip install boto3")
        
        return boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=getattr(settings, 'AWS_REGION', 'ap-southeast-1'),
        )
    
    @classmethod
    def upload_backup(cls, user_id: str, data: bytes, filename: str) -> str:
        """
        Upload backup lên S3.
        Returns: S3 object key
        """
        if not cls.is_configured():
            logger.warning("[BACKUP] S3 not configured, skipping upload")
            return ''
        
        client = cls.get_client()
        bucket = settings.AWS_BACKUP_BUCKET
        key = f"backups/{user_id}/{filename}"
        
        # Upload với metadata
        client.put_object(
            Bucket=bucket,
            Key=key,
            Body=data,
            ContentType='application/octet-stream',
            Metadata={
                'user_id': user_id,
                'created_at': timezone.now().isoformat(),
            }
        )
        
        logger.info(f"[BACKUP] Uploaded to S3: s3://{bucket}/{key}")
        return key
    
    @classmethod
    def download_backup(cls, user_id: str, filename: str) -> bytes:
        """Download backup từ S3"""
        if not cls.is_configured():
            raise ValueError("S3 not configured")
        
        client = cls.get_client()
        bucket = settings.AWS_BACKUP_BUCKET
        key = f"backups/{user_id}/{filename}"
        
        response = client.get_object(Bucket=bucket, Key=key)
        return response['Body'].read()
    
    @classmethod
    def list_backups(cls, user_id: str) -> List[Dict]:
        """Liệt kê backups của user trên S3"""
        if not cls.is_configured():
            return []
        
        client = cls.get_client()
        bucket = settings.AWS_BACKUP_BUCKET
        prefix = f"backups/{user_id}/"
        
        response = client.list_objects_v2(Bucket=bucket, Prefix=prefix)
        
        backups = []
        for obj in response.get('Contents', []):
            backups.append({
                'filename': obj['Key'].replace(prefix, ''),
                'size': obj['Size'],
                'last_modified': obj['LastModified'].isoformat(),
            })
        
        return sorted(backups, key=lambda x: x['last_modified'], reverse=True)
    
    @classmethod
    def delete_old_backups(cls, user_id: str, keep_days: int = 30) -> int:
        """Xóa backups cũ hơn keep_days ngày"""
        if not cls.is_configured():
            return 0
        
        client = cls.get_client()
        bucket = settings.AWS_BACKUP_BUCKET
        prefix = f"backups/{user_id}/"
        cutoff = timezone.now() - timedelta(days=keep_days)
        
        response = client.list_objects_v2(Bucket=bucket, Prefix=prefix)
        deleted = 0
        
        for obj in response.get('Contents', []):
            if obj['LastModified'].replace(tzinfo=timezone.utc) < cutoff:
                client.delete_object(Bucket=bucket, Key=obj['Key'])
                deleted += 1
        
        logger.info(f"[BACKUP] Deleted {deleted} old backups for user {user_id}")
        return deleted


class BackupService:
    """
    Main backup service orchestrating all backup operations.
    """
    
    BACKUP_DIR = os.path.join(settings.MEDIA_ROOT, 'backups')
    LOCAL_RETENTION_DAYS = 7  # Giữ local backup 7 ngày
    S3_RETENTION_DAYS = 30    # Giữ S3 backup 30 ngày
    
    # ==================== DATA EXPORT ====================
    
    @classmethod
    def export_user_data(cls, user) -> Dict[str, Any]:
        """
        Export toàn bộ dữ liệu của user thành JSON.
        Bao gồm: accounts, categories, transactions, budgets, debts, savings, transfers, settings
        """
        user_id = user.user_id
        now = timezone.now()
        
        def model_to_dict(obj, exclude_fields=None):
            """Convert model instance sang dict, xử lý Decimal và datetime"""
            exclude_fields = exclude_fields or []
            data = {}
            for field in obj._meta.fields:
                if field.name in exclude_fields:
                    continue
                value = getattr(obj, field.name)
                if isinstance(value, Decimal):
                    value = float(value)
                elif isinstance(value, (datetime, timezone.datetime)):
                    value = value.isoformat() if value else None
                elif hasattr(value, 'pk'):  # ForeignKey
                    value = str(value.pk) if value else None
                data[field.name] = value
            return data
        
        backup_data = {
            'metadata': {
                'version': '1.0',
                'user_id': user_id,
                'user_email': user.email,
                'user_name': user.full_name,
                'created_at': now.isoformat(),
                'app_version': getattr(settings, 'APP_VERSION', '1.0.0'),
            },
            'accounts': [],
            'categories': [],
            'transactions': [],
            'budgets': [],
            'debts': [],
            'debt_payments': [],
            'savings_goals': [],
            'transfers': [],
            'recurring_transactions': [],
            'settings': None,
            'notifications': [],
        }
        
        # Export accounts
        for acc in Accounts.objects.filter(user=user):
            backup_data['accounts'].append(model_to_dict(acc, exclude_fields=['user']))
        
        # Export categories
        for cat in Categories.objects.filter(user=user, is_deleted=False):
            backup_data['categories'].append(model_to_dict(cat, exclude_fields=['user']))
        
        # Export transactions (last 2 years)
        two_years_ago = now - timedelta(days=730)
        for trans in Transactions.objects.filter(user=user, is_deleted=False, transaction_date__gte=two_years_ago):
            backup_data['transactions'].append(model_to_dict(trans, exclude_fields=['user']))
        
        # Export budgets
        for budget in Budgets.objects.filter(user=user):
            backup_data['budgets'].append(model_to_dict(budget, exclude_fields=['user']))
        
        # Export debts và payments
        for debt in Debts.objects.filter(user=user):
            backup_data['debts'].append(model_to_dict(debt, exclude_fields=['user']))
            for payment in DebtPayment.objects.filter(debt=debt):
                backup_data['debt_payments'].append(model_to_dict(payment))
        
        # Export savings
        for goal in SavingsGoals.objects.filter(user=user):
            backup_data['savings_goals'].append(model_to_dict(goal, exclude_fields=['user']))
        
        # Export transfers
        for transfer in Transfers.objects.filter(user=user):
            backup_data['transfers'].append(model_to_dict(transfer, exclude_fields=['user']))
        
        # Export recurring transactions
        for recurring in RecurringTransactions.objects.filter(user=user, is_active=True):
            backup_data['recurring_transactions'].append(model_to_dict(recurring, exclude_fields=['user']))
        
        # Export settings
        try:
            user_setting = UserSetting.objects.get(user=user)
            backup_data['settings'] = model_to_dict(user_setting, exclude_fields=['user'])
        except UserSetting.DoesNotExist:
            pass
        
        # Export recent notifications (last 30 days)
        thirty_days_ago = now - timedelta(days=30)
        for notif in Notification.objects.filter(user=user, created_at__gte=thirty_days_ago):
            backup_data['notifications'].append(model_to_dict(notif, exclude_fields=['user']))
        
        # Statistics
        backup_data['metadata']['statistics'] = {
            'accounts_count': len(backup_data['accounts']),
            'categories_count': len(backup_data['categories']),
            'transactions_count': len(backup_data['transactions']),
            'budgets_count': len(backup_data['budgets']),
            'debts_count': len(backup_data['debts']),
            'savings_count': len(backup_data['savings_goals']),
        }
        
        return backup_data

    # ==================== BACKUP CREATION ====================
    
    @classmethod
    def create_backup(cls, user, encrypt: bool = True, upload_s3: bool = True) -> Dict[str, Any]:
        """
        Tạo backup đầy đủ cho user.
        
        Returns: {
            'success': bool,
            'backup_id': str,
            'local_path': str,
            's3_key': str (nếu upload),
            'size': int,
            'encrypted': bool,
        }
        """
        result = {
            'success': False,
            'backup_id': f'BKP-{str(uuid4())[:12]}',
            'local_path': '',
            's3_key': '',
            'size': 0,
            'encrypted': encrypt,
        }
        
        try:
            # 1. Export data
            backup_data = cls.export_user_data(user)
            json_data = json.dumps(backup_data, ensure_ascii=False, indent=2)
            
            # 2. Compress (gzip)
            compressed = gzip.compress(json_data.encode('utf-8'))
            
            # 3. Encrypt nếu cần
            if encrypt:
                encrypted = BackupEncryption.encrypt(compressed, user.user_id)
                final_data = json.dumps(encrypted).encode('utf-8')
                extension = '.backup.enc'
            else:
                final_data = compressed
                extension = '.backup.gz'
            
            result['size'] = len(final_data)
            
            # 4. Save local
            user_backup_dir = os.path.join(cls.BACKUP_DIR, str(user.user_id))
            os.makedirs(user_backup_dir, exist_ok=True)
            
            timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
            filename = f"backup_{timestamp}{extension}"
            local_path = os.path.join(user_backup_dir, filename)
            
            with open(local_path, 'wb') as f:
                f.write(final_data)
            
            result['local_path'] = local_path
            logger.info(f"[BACKUP] Created local backup: {local_path} ({result['size']} bytes)")
            
            # 5. Upload S3 nếu cần
            if upload_s3 and S3Storage.is_configured():
                try:
                    result['s3_key'] = S3Storage.upload_backup(user.user_id, final_data, filename)
                except Exception as e:
                    logger.error(f"[BACKUP] S3 upload failed: {e}")
                    # Không fail toàn bộ backup vì local đã lưu
            
            result['success'] = True
            
        except Exception as e:
            logger.error(f"[BACKUP] Create backup failed for user {user.user_id}: {e}", exc_info=True)
            result['error'] = str(e)
        
        return result

    # ==================== BACKUP RESTORE ====================
    
    @classmethod
    def download_backup(cls, user, filename: str, source: str = 'local') -> bytes:
        """
        Download backup file.
        source: 'local' hoặc 's3'
        """
        if source == 's3':
            return S3Storage.download_backup(user.user_id, filename)
        
        local_path = os.path.join(cls.BACKUP_DIR, str(user.user_id), filename)
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Backup file not found: {filename}")
        
        with open(local_path, 'rb') as f:
            return f.read()

    @classmethod
    def decrypt_and_extract(cls, backup_data: bytes, user, encrypted: bool = True) -> Dict:
        """
        Decrypt và giải nén backup data.
        """
        if encrypted:
            # Decrypt
            encrypted_dict = json.loads(backup_data.decode('utf-8'))
            compressed = BackupEncryption.decrypt(encrypted_dict, user.user_id)
        else:
            compressed = backup_data
        
        # Decompress
        json_data = gzip.decompress(compressed).decode('utf-8')
        return json.loads(json_data)

    # ==================== BACKUP LISTING ====================
    
    @classmethod
    def list_backups(cls, user) -> Dict[str, List]:
        """
        Liệt kê tất cả backups của user (local + S3).
        """
        result = {
            'local': [],
            's3': [],
        }
        
        # Local backups
        user_backup_dir = os.path.join(cls.BACKUP_DIR, str(user.user_id))
        if os.path.exists(user_backup_dir):
            for filename in os.listdir(user_backup_dir):
                filepath = os.path.join(user_backup_dir, filename)
                stat = os.stat(filepath)
                result['local'].append({
                    'filename': filename,
                    'size': stat.st_size,
                    'size_human': cls._format_size(stat.st_size),
                    'created_at': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'encrypted': '.enc' in filename,
                })
            result['local'].sort(key=lambda x: x['created_at'], reverse=True)
        
        # S3 backups
        if S3Storage.is_configured():
            result['s3'] = S3Storage.list_backups(user.user_id)
        
        return result

    # ==================== CLEANUP ====================
    
    @classmethod
    def cleanup_old_backups(cls, days: int = None):
        """
        Cleanup old backups (được gọi bởi Celery beat).
        """
        local_days = days or cls.LOCAL_RETENTION_DAYS
        s3_days = days or cls.S3_RETENTION_DAYS
        
        total_deleted = 0
        cutoff = timezone.now() - timedelta(days=local_days)
        
        # Cleanup local
        if os.path.exists(cls.BACKUP_DIR):
            for user_dir in os.listdir(cls.BACKUP_DIR):
                user_backup_dir = os.path.join(cls.BACKUP_DIR, user_dir)
                if not os.path.isdir(user_backup_dir):
                    continue
                
                for filename in os.listdir(user_backup_dir):
                    filepath = os.path.join(user_backup_dir, filename)
                    file_mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
                    file_mtime = timezone.make_aware(file_mtime)
                    
                    if file_mtime < cutoff:
                        try:
                            os.remove(filepath)
                            total_deleted += 1
                        except Exception as e:
                            logger.error(f"[BACKUP] Failed to delete {filepath}: {e}")
        
        # Cleanup S3
        if S3Storage.is_configured():
            for user in Users.objects.filter(is_active=True):
                try:
                    total_deleted += S3Storage.delete_old_backups(user.user_id, s3_days)
                except Exception as e:
                    logger.error(f"[BACKUP] S3 cleanup failed for {user.user_id}: {e}")
        
        logger.info(f"[BACKUP] Cleanup completed: {total_deleted} old backups deleted")
        return total_deleted

    # ==================== DAILY BACKUP JOB ====================
    
    @classmethod
    def run_daily_backup(cls):
        """
        Chạy backup hàng ngày cho tất cả active users.
        Được gọi bởi Celery beat.
        """
        success_count = 0
        fail_count = 0
        
        for user in Users.objects.filter(is_active=True):
            try:
                result = cls.create_backup(user, encrypt=True, upload_s3=True)
                if result['success']:
                    success_count += 1
                else:
                    fail_count += 1
            except Exception as e:
                logger.error(f"[BACKUP] Daily backup failed for {user.user_id}: {e}")
                fail_count += 1
        
        logger.info(f"[BACKUP] Daily backup completed: {success_count} success, {fail_count} failed")
        return {'success': success_count, 'failed': fail_count}

    @staticmethod
    def _format_size(size: int) -> str:
        """Format file size"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"


class RestoreService:
    
    RESTORE_STRATEGIES = ['merge', 'replace']
    
    @classmethod
    def restore_from_backup(cls, user, backup_filename: str, strategy: str = 'merge', 
                           restore_options: dict = None, source: str = 'local') -> dict:
        """
        
        Args:
            user: User object
            backup_filename: Tên file backup
            strategy: 'merge' (giữ data cũ, thêm mới) hoặc 'replace' (xóa hết, thay thế)
            restore_options: Dict chọn loại data restore {'accounts': True, 'transactions': True, ...}
            source: 'local' hoặc 's3'
        
        Returns:
            dict với kết quả restore
        """
        from django.db import transaction as db_transaction
        from api.models import Accounts, Transactions, Budgets, Categories, Debts, SavingsGoals
        
        if strategy not in cls.RESTORE_STRATEGIES:
            raise ValueError(f"Strategy phải là: {cls.RESTORE_STRATEGIES}")
        
        # Default options - restore tất cả
        if restore_options is None:
            restore_options = {
                'accounts': True,
                'transactions': True,
                'budgets': True,
                'categories': True,
                'debts': True,
                'savings_goals': True,
            }
        
        result = {
            'success': False,
            'strategy': strategy,
            'restored': {},
            'errors': [],
            'pre_backup_id': None,
        }
        
        try:
            # 1. Download và decrypt backup
            backup_data = BackupService.download_backup(user, backup_filename, source)
            encrypted = '.enc' in backup_filename
            data = BackupService.decrypt_and_extract(backup_data, user, encrypted=encrypted)
            
            # 2. Tạo backup trước khi restore (safety)
            pre_restore_backup = BackupService.create_backup(
                user, 
                encrypt=True, 
                upload_s3=False,
                backup_type='pre_restore'
            )
            result['pre_backup_id'] = pre_restore_backup.get('backup_id')
            
            # 3. Thực hiện restore trong transaction
            with db_transaction.atomic():
                if strategy == 'replace':
                    # Xóa dữ liệu cũ trước
                    cls._clear_user_data(user, restore_options)
                
                # Restore từng loại dữ liệu theo thứ tự dependency
                if restore_options.get('categories') and 'categories' in data:
                    count = cls._restore_categories(user, data['categories'], strategy)
                    result['restored']['categories'] = count
                
                if restore_options.get('accounts') and 'accounts' in data:
                    count = cls._restore_accounts(user, data['accounts'], strategy)
                    result['restored']['accounts'] = count
                
                if restore_options.get('transactions') and 'transactions' in data:
                    count = cls._restore_transactions(user, data['transactions'], strategy)
                    result['restored']['transactions'] = count
                
                if restore_options.get('budgets') and 'budgets' in data:
                    count = cls._restore_budgets(user, data['budgets'], strategy)
                    result['restored']['budgets'] = count
                
                if restore_options.get('debts') and 'debts' in data:
                    count = cls._restore_debts(user, data['debts'], strategy)
                    result['restored']['debts'] = count
                
                if restore_options.get('savings_goals') and 'savings_goals' in data:
                    count = cls._restore_savings_goals(user, data['savings_goals'], strategy)
                    result['restored']['savings_goals'] = count
            
            result['success'] = True
            logger.info(f"[RESTORE] User {user.user_id} restored from {backup_filename}: {result['restored']}")
            
        except Exception as e:
            logger.error(f"[RESTORE] Error: {str(e)}", exc_info=True)
            result['errors'].append(str(e))
        
        return result
    
    @staticmethod
    def _clear_user_data(user, options: dict):
        """Xóa dữ liệu user trước khi replace."""
        from api.models import Accounts, Transactions, Budgets, Categories, Debts, SavingsGoals
        
        # Xóa theo thứ tự ngược dependency
        if options.get('transactions'):
            Transactions.objects.filter(user=user).delete()
        if options.get('budgets'):
            Budgets.objects.filter(user=user).delete()
        if options.get('debts'):
            Debts.objects.filter(user=user).delete()
        if options.get('savings_goals'):
            SavingsGoals.objects.filter(user=user).delete()
        if options.get('accounts'):
            Accounts.objects.filter(user=user).delete()
        if options.get('categories'):
            Categories.objects.filter(user=user).delete()
    
    @staticmethod
    def _restore_accounts(user, accounts_data: list, strategy: str) -> int:
        """Restore accounts."""
        from api.models import Accounts
        from decimal import Decimal
        
        restored = 0
        for acc in accounts_data:
            if strategy == 'merge':
                exists = Accounts.objects.filter(
                    user=user, 
                    account_name=acc['account_name']
                ).exists()
                if exists:
                    continue
            
            Accounts.objects.create(
                user=user,
                account_name=acc['account_name'],
                account_type=acc.get('account_type', 'cash'),
                balance=Decimal(str(acc.get('balance', 0))),
                currency=acc.get('currency', 'VND'),
                description=acc.get('description', ''),
                is_default=False,
            )
            restored += 1
        
        return restored
    
    @staticmethod
    def _restore_categories(user, categories_data: list, strategy: str) -> int:
        """Restore categories."""
        from api.models import Categories
        
        restored = 0
        for cat in categories_data:
            if strategy == 'merge':
                exists = Categories.objects.filter(
                    user=user,
                    category_name=cat['category_name'],
                    category_type=cat['category_type']
                ).exists()
                if exists:
                    continue
            
            Categories.objects.create(
                user=user,
                category_name=cat['category_name'],
                category_type=cat['category_type'],
                icon=cat.get('icon', 'default'),
                color=cat.get('color', '#000000'),
            )
            restored += 1
        
        return restored
    
    @staticmethod
    def _restore_transactions(user, transactions_data: list, strategy: str) -> int:
        """Restore transactions."""
        
        restored = 0
        
        # Cache accounts và categories
        accounts_map = {a.account_name: a for a in Accounts.objects.filter(user=user)}
        categories_map = {c.category_name: c for c in Categories.objects.filter(user=user)}
        
        for txn in transactions_data:
            account = accounts_map.get(txn.get('account_name'))
            if not account:
                continue
            
            category = categories_map.get(txn.get('category_name'))
            
            txn_date = parse_datetime(txn['transaction_date']) if isinstance(txn['transaction_date'], str) else txn['transaction_date']
            
            Transactions.objects.create(
                user=user,
                account=account,
                category=category,
                amount=Decimal(str(txn['amount'])),
                transaction_type=txn['transaction_type'],
                transaction_date=txn_date,
                description=txn.get('description', ''),
                is_deleted=False,
            )
            restored += 1
        
        return restored
    
    @staticmethod
    def _restore_budgets(user, budgets_data: list, strategy: str) -> int:
        """Restore budgets."""
        
        restored = 0
        categories_map = {c.category_name: c for c in Categories.objects.filter(user=user)}
        
        for budget in budgets_data:
            category = categories_map.get(budget.get('category_name'))
            
            if strategy == 'merge' and category:
                exists = Budgets.objects.filter(
                    user=user,
                    category=category,
                    start_date=budget['start_date'],
                ).exists()
                if exists:
                    continue
            
            start_date = budget['start_date']
            end_date = budget['end_date']
            if isinstance(start_date, str):
                start_date = parse_date(start_date)
            if isinstance(end_date, str):
                end_date = parse_date(end_date)
            
            Budgets.objects.create(
                user=user,
                category=category,
                budget_name=budget.get('budget_name', 'Budget'),
                amount=Decimal(str(budget['amount'])),
                spent_amount=Decimal(str(budget.get('spent_amount', 0))),
                start_date=start_date,
                end_date=end_date,
            )
            restored += 1
        
        return restored
    
    @staticmethod
    def _restore_debts(user, debts_data: list, strategy: str) -> int:
        """Restore debts."""
        
        restored = 0
        for debt in debts_data:
            if strategy == 'merge':
                exists = Debts.objects.filter(
                    user=user,
                    debt_name=debt['debt_name'],
                ).exists()
                if exists:
                    continue
            
            due_date = debt.get('due_date')
            if due_date and isinstance(due_date, str):
                due_date = parse_date(due_date)
            
            Debts.objects.create(
                user=user,
                debt_name=debt['debt_name'],
                debt_type=debt['debt_type'],
                amount=Decimal(str(debt['amount'])),
                paid_amount=Decimal(str(debt.get('paid_amount', 0))),
                interest_rate=Decimal(str(debt.get('interest_rate', 0))),
                due_date=due_date,
                status=debt.get('status', 'active'),
            )
            restored += 1
        
        return restored
    
    @staticmethod
    def _restore_savings_goals(user, goals_data: list, strategy: str) -> int:
        """Restore savings goals."""

        restored = 0
        for goal in goals_data:
            if strategy == 'merge':
                exists = SavingsGoals.objects.filter(
                    user=user,
                    goal_name=goal['goal_name'],
                ).exists()
                if exists:
                    continue
            
            target_date = goal.get('target_date')
            if target_date and isinstance(target_date, str):
                target_date = parse_date(target_date)
            
            SavingsGoals.objects.create(
                user=user,
                goal_name=goal['goal_name'],
                target_amount=Decimal(str(goal['target_amount'])),
                current_amount=Decimal(str(goal.get('current_amount', 0))),
                target_date=target_date,
                status=goal.get('status', 'active'),
            )
            restored += 1
        
        return restored
