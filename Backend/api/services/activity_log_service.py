"""
Activity Log Service
Quản lý ghi log và truy vấn lịch sử hoạt động người dùng.
"""
import logging
import json
from uuid import uuid4
from django.utils import timezone
from django.db.models import Count, Q
from django.db import connection
from api.models import ActivityLogs, Users
from user_agents import parse as parse_user_agent

logger = logging.getLogger(__name__)


class ActivityLogService:
    """Service xử lý activity logging."""
    
    # Action type constants
    # Authentication
    LOGIN_SUCCESS = 'LOGIN_SUCCESS'
    LOGIN_FAILED = 'LOGIN_FAILED'
    LOGOUT = 'LOGOUT'
    
    # Transactions
    CREATE_TRANSACTION = 'CREATE_TRANSACTION'
    UPDATE_TRANSACTION = 'UPDATE_TRANSACTION'
    DELETE_TRANSACTION = 'DELETE_TRANSACTION'
    VIEW_TRANSACTIONS = 'VIEW_TRANSACTIONS'
    
    # Accounts
    CREATE_ACCOUNT = 'CREATE_ACCOUNT'
    UPDATE_ACCOUNT = 'UPDATE_ACCOUNT'
    DELETE_ACCOUNT = 'DELETE_ACCOUNT'
    VIEW_ACCOUNTS = 'VIEW_ACCOUNTS'
    
    # Budgets
    CREATE_BUDGET = 'CREATE_BUDGET'
    UPDATE_BUDGET = 'UPDATE_BUDGET'
    DELETE_BUDGET = 'DELETE_BUDGET'
    VIEW_BUDGETS = 'VIEW_BUDGETS'
    
    # Categories
    CREATE_CATEGORY = 'CREATE_CATEGORY'
    UPDATE_CATEGORY = 'UPDATE_CATEGORY'
    DELETE_CATEGORY = 'DELETE_CATEGORY'
    
    # Transfers
    CREATE_TRANSFER = 'CREATE_TRANSFER'
    
    # Debts
    CREATE_DEBT = 'CREATE_DEBT'
    UPDATE_DEBT = 'UPDATE_DEBT'
    DELETE_DEBT = 'DELETE_DEBT'
    
    # Savings
    CREATE_SAVING_GOAL = 'CREATE_SAVING_GOAL'
    UPDATE_SAVING_GOAL = 'UPDATE_SAVING_GOAL'
    DELETE_SAVING_GOAL = 'DELETE_SAVING_GOAL'
    
    # Data Management
    EXPORT_DATA = 'EXPORT_DATA'
    IMPORT_DATA = 'IMPORT_DATA'
    CREATE_BACKUP = 'CREATE_BACKUP'
    RESTORE_BACKUP = 'RESTORE_BACKUP'
    
    # Settings
    UPDATE_SETTINGS = 'UPDATE_SETTINGS'
    CHANGE_PASSWORD = 'CHANGE_PASSWORD'
    UPDATE_PROFILE = 'UPDATE_PROFILE'
    
    # Level constants
    LEVEL_INFO = 'INFO'
    LEVEL_ACTION = 'ACTION'
    LEVEL_WARNING = 'WARNING'
    LEVEL_ERROR = 'ERROR'
    
    @classmethod
    def _generate_id(cls) -> str:
        """Generate unique activity ID."""
        return f'ACT-{str(uuid4())[:12]}'
    
    @classmethod
    def _parse_user_agent(cls, user_agent_string: str) -> dict:
        """Parse user agent string to extract device info."""
        try:
            ua = parse_user_agent(user_agent_string)
            return {
                'device': 'Mobile' if ua.is_mobile else ('Tablet' if ua.is_tablet else 'Desktop'),
                'browser': f'{ua.browser.family} {ua.browser.version_string}',
                'os': f'{ua.os.family} {ua.os.version_string}',
            }
        except Exception:
            return {
                'device': 'Unknown',
                'browser': 'Unknown',
                'os': 'Unknown',
            }
    
    @classmethod
    def _get_client_ip(cls, request) -> str:
        """Extract client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'Unknown')
    
    @classmethod
    def _get_action_level(cls, action: str) -> str:
        """Determine log level based on action type."""
        if action in [cls.LOGIN_FAILED, 'INVALID_TOKEN', 'API_ERROR', 'SESSION_EXPIRED']:
            return cls.LEVEL_ERROR
        if action in [cls.DELETE_TRANSACTION, cls.DELETE_ACCOUNT, cls.DELETE_BUDGET, 
                      cls.CREATE_TRANSFER, cls.RESTORE_BACKUP]:
            return cls.LEVEL_WARNING
        if 'CREATE' in action or 'UPDATE' in action or 'DELETE' in action:
            return cls.LEVEL_ACTION
        return cls.LEVEL_INFO
    
    @classmethod
    def log(cls, request, action: str, details: str = None, level: str = None,
            entity_type: str = None, entity_id: str = None,
            old_values: dict = None, new_values: dict = None,
            status: str = 'success', error_message: str = None) -> ActivityLogs:
        """
        Ghi log hoạt động của người dùng.
        
        Args:
            request: Django request object
            action: Loại hành động (LOGIN_SUCCESS, CREATE_TRANSACTION, etc.)
            details: Mô tả chi tiết
            level: INFO, ACTION, WARNING, ERROR (auto-determined if None)
            entity_type: Loại entity (transaction, account, budget, etc.)
            entity_id: ID của entity
            old_values: Giá trị cũ (cho update)
            new_values: Giá trị mới
            status: success hoặc failed
            error_message: Thông báo lỗi (nếu có)
        
        Returns:
            ActivityLogs object
        """
        try:
            user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
            user_agent_str = request.META.get('HTTP_USER_AGENT', '')
            ua_info = cls._parse_user_agent(user_agent_str)
            
            # Auto-determine level if not specified
            if level is None:
                level = cls._get_action_level(action)
            
            # Get current page from referer or custom header
            current_page = request.META.get('HTTP_X_CURRENT_PAGE') or request.META.get('HTTP_REFERER', '')
            if current_page and 'http' in current_page:
                # Extract path from full URL
                try:
                    from urllib.parse import urlparse
                    current_page = urlparse(current_page).path
                except Exception:
                    pass
            
            activity_log = ActivityLogs.objects.create(
                activity_id=cls._generate_id(),
                user=user,
                action=action,
                level=level,
                details=details,
                entity_type=entity_type,
                entity_id=entity_id,
                old_values=json.dumps(old_values, default=str) if old_values else None,
                new_values=json.dumps(new_values, default=str) if new_values else None,
                ip_address=cls._get_client_ip(request),
                user_agent=user_agent_str[:500] if user_agent_str else None,
                device=ua_info['device'],
                browser=ua_info['browser'],
                os=ua_info['os'],
                current_page=current_page[:255] if current_page else None,
                status=status,
                error_message=error_message,
                created_at=timezone.now()
            )
            
            logger.debug(f"[ACTIVITY] {action} by user {user.user_id if user else 'Anonymous'}")
            return activity_log
            
        except Exception as e:
            logger.error(f"[ACTIVITY] Failed to log activity: {str(e)}", exc_info=True)
            return None
    
    @classmethod
    def log_simple(cls, user, action: str, details: str = None, level: str = None,
                   ip_address: str = None, user_agent: str = None) -> ActivityLogs:
        """
        Ghi log đơn giản không cần request object.
        Dùng cho background tasks hoặc internal operations.
        """
        try:
            if level is None:
                level = cls._get_action_level(action)
            
            ua_info = cls._parse_user_agent(user_agent) if user_agent else {
                'device': 'Server', 'browser': 'Internal', 'os': 'System'
            }
            
            activity_log = ActivityLogs.objects.create(
                activity_id=cls._generate_id(),
                user=user,
                action=action,
                level=level,
                details=details,
                ip_address=ip_address or '127.0.0.1',
                device=ua_info['device'],
                browser=ua_info['browser'],
                os=ua_info['os'],
                status='success',
                created_at=timezone.now()
            )
            return activity_log
        except Exception as e:
            logger.error(f"[ACTIVITY] Failed to log simple activity: {str(e)}")
            return None
    
    @classmethod
    def get_logs(cls, filters: dict = None, page: int = 1, page_size: int = 50) -> dict:
        """
        Truy vấn logs với filter và phân trang.
        """
        queryset = ActivityLogs.objects.select_related('user').all()
        
        if filters:
            if filters.get('user_id'):
                queryset = queryset.filter(user_id=filters['user_id'])
            
            if filters.get('level'):
                queryset = queryset.filter(level=filters['level'])
            
            if filters.get('action'):
                queryset = queryset.filter(action__icontains=filters['action'])
            
            if filters.get('search'):
                search = filters['search']
                queryset = queryset.filter(
                    Q(user__full_name__icontains=search) |
                    Q(user__email__icontains=search) |
                    Q(action__icontains=search) |
                    Q(details__icontains=search) |
                    Q(ip_address__icontains=search)
                )
            
            if filters.get('start_date'):
                queryset = queryset.filter(created_at__date__gte=filters['start_date'])
            
            if filters.get('end_date'):
                queryset = queryset.filter(created_at__date__lte=filters['end_date'])
        
        # Order by newest first
        queryset = queryset.order_by('-created_at')
        
        # Count total
        total = queryset.count()
        
        # Paginate
        offset = (page - 1) * page_size
        logs = queryset[offset:offset + page_size]
        
        return {
            'logs': logs,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
        }
    
    @classmethod
    def get_user_recent_logs(cls, user_id: str, limit: int = 10) -> list:
        """Lấy logs gần đây của một user."""
        return list(ActivityLogs.objects.filter(
            user_id=user_id
        ).order_by('-created_at')[:limit])
    
    @classmethod
    def get_stats(cls, start_date=None, end_date=None) -> dict:
        """
        Lấy thống kê hoạt động.
        """
        today = timezone.now().date()
        five_minutes_ago = timezone.now() - timezone.timedelta(minutes=5)
        
        # Base queryset for today
        today_logs = ActivityLogs.objects.filter(created_at__date=today)
        
        if start_date:
            today_logs = today_logs.filter(created_at__date__gte=start_date)
        if end_date:
            today_logs = today_logs.filter(created_at__date__lte=end_date)
        
        # Active users (activity in last 5 minutes)
        active_users = ActivityLogs.objects.filter(
            created_at__gte=five_minutes_ago,
            user__isnull=False
        ).values('user_id').distinct().count()
        
        # Total online (có hoạt động trong 30 phút gần nhất)
        thirty_minutes_ago = timezone.now() - timezone.timedelta(minutes=30)
        total_online = ActivityLogs.objects.filter(
            created_at__gte=thirty_minutes_ago,
            user__isnull=False
        ).values('user_id').distinct().count()
        
        # Actions, warnings, errors today
        actions_today = today_logs.count()
        warnings = today_logs.filter(level=cls.LEVEL_WARNING).count()
        errors = today_logs.filter(level=cls.LEVEL_ERROR).count()
        
        # Top 5 active users
        top_users = ActivityLogs.objects.filter(
            created_at__date=today,
            user__isnull=False
        ).values(
            'user_id', 'user__full_name'
        ).annotate(
            actions=Count('activity_id')
        ).order_by('-actions')[:5]
        
        return {
            'active_users': active_users,
            'total_online': total_online,
            'actions_today': actions_today,
            'warnings': warnings,
            'errors': errors,
            'top_users': [
                {'name': u['user__full_name'] or 'Unknown', 'actions': u['actions']}
                for u in top_users
            ],
        }
    
    @classmethod
    def get_user_detail(cls, user_id: str) -> dict:
        """Lấy thông tin chi tiết của user từ activity logs."""
        try:
            user = Users.objects.get(user_id=user_id)
            
            # Lấy log gần nhất
            latest_log = ActivityLogs.objects.filter(user_id=user_id).first()
            
            # Kiểm tra online status
            five_minutes_ago = timezone.now() - timezone.timedelta(minutes=5)
            is_online = ActivityLogs.objects.filter(
                user_id=user_id,
                created_at__gte=five_minutes_ago
            ).exists()
            
            # Lấy recent logs
            recent_logs = cls.get_user_recent_logs(user_id, limit=10)
            
            return {
                'user': {
                    'id': user.user_id,
                    'name': user.full_name,
                    'email': user.email,
                    'avatar': user.avatar_url or user.full_name[:2].upper() if user.full_name else 'U',
                    'role': user.role.role_name if user.role else 'user',
                },
                'is_online': is_online,
                'last_active': latest_log.created_at if latest_log else user.last_login,
                'current_page': latest_log.current_page if latest_log else None,
                'device': latest_log.device if latest_log else None,
                'browser': latest_log.browser if latest_log else None,
                'os': latest_log.os if latest_log else None,
                'ip_address': latest_log.ip_address if latest_log else None,
                'recent_logs': recent_logs,
            }
        except Users.DoesNotExist:
            return None
    
    @classmethod
    def cleanup_old_logs(cls, days: int = 90) -> int:
        """Xóa logs cũ hơn số ngày chỉ định."""
        cutoff_date = timezone.now() - timezone.timedelta(days=days)
        deleted_count, _ = ActivityLogs.objects.filter(
            created_at__lt=cutoff_date
        ).delete()
        logger.info(f"[ACTIVITY] Cleaned up {deleted_count} old activity logs")
        return deleted_count
