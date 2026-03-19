
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
class HasPermission(BasePermission):
    """
    Permission class kiểm tra quyền dựa trên database
    """
    
    # Định nghĩa permission cần thiết cho từng action
    permission_required = None
    
    def has_permission(self, request, view):
        # Nếu chưa đăng nhập -> từ chối
        if not request.user.is_authenticated:
            return False
        
        # Lấy permission cần kiểm tra
        required_permission = self.get_required_permission(view)
        if not required_permission:
            return True
        
        # Kiểm tra user có quyền không
        return self.check_user_permission(request.user, required_permission)
    
    def get_required_permission(self, view):
        """Lấy permission name cần kiểm tra"""
        # Ưu tiên permission được định nghĩa trong view
        if hasattr(view, 'permission_required'):
            action = getattr(view, 'action', None)
            if isinstance(view.permission_required, dict):
                return view.permission_required.get(action)
            return view.permission_required
        return self.permission_required
    
    def check_user_permission(self, user, permission_name):
        """Kiểm tra user có permission không (query database)"""
        return user.role.role_permissions.filter(
            permission__permission_name=permission_name
        ).exists()


# ============================================
# CÁC PERMISSION CỤ THỂ CHO TỪNG CHỨC NĂNG
# ============================================

class CanCreateExpense(HasPermission):
    permission_required = 'create_expense'


class CanViewOwnExpense(HasPermission):
    permission_required = 'view_own_expense'


class CanViewAllExpenses(HasPermission):
    permission_required = 'view_all_expenses'


class CanEditOwnExpense(HasPermission):
    permission_required = 'edit_own_expense'


class CanEditAllExpenses(HasPermission):
    permission_required = 'edit_all_expenses'


class CanDeleteOwnExpense(HasPermission):
    permission_required = 'delete_own_expense'


class CanDeleteAllExpenses(HasPermission):
    permission_required = 'delete_all_expenses'


# ============================================
# PERMISSION LINH HOẠT CHO VIEWSET
# ============================================

class DynamicPermission(BasePermission):
    """
    Permission động - tự động map action với permission
    Sử dụng trong ViewSet với permission_map
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Lấy permission map từ view
        permission_map = getattr(view, 'permission_map', {})
        action = getattr(view, 'action', None)
        
        # Lấy permission cần thiết cho action hiện tại
        required_permission = permission_map.get(action)
        
        if not required_permission:
            return True  # Không yêu cầu permission đặc biệt
        
        # Kiểm tra permission
        return request.user.role.role_permissions.filter(
            permission__permission_name=required_permission
        ).exists()
    
    def has_object_permission(self, request, view, obj):
        """Kiểm tra quyền với object cụ thể (own vs all)"""
        if not request.user.is_authenticated:
            return False
        
        action = getattr(view, 'action', None)
        
        # Kiểm tra xem có phải owner không
        is_owner = self.is_owner(request.user, obj)
        
        if is_owner:
            # Kiểm tra quyền "own"
            own_permission = f"{action}_own_expense"
            return self.has_perm(request.user, own_permission)
        else:
            # Kiểm tra quyền "all"
            all_permission = f"{action}_all_expenses"
            return self.has_perm(request.user, all_permission)
    
    def is_owner(self, user, obj):
        """Kiểm tra user có phải owner của object không"""
        return hasattr(obj, 'user') and obj.user == user
    
    def has_perm(self, user, permission_name):
        """Kiểm tra permission trong database"""
        return user.role.role_permissions.filter(
            permission__permission_name=permission_name
        ).exists()


# ====================================================
# MIXIN ĐỂ SỬ DỤNG ĐỂ KIỂM TRA QUYỀN Ở GIỮA LOGIC VIEW
# ====================================================

class PermissionMixin:
    """
    Mixin để dễ dàng check permission trong view
    """
    
    def check_permission(self, permission_name):
        """Kiểm tra permission và raise exception nếu không có"""
        if not self.request.user.role.role_permissions.filter(
            permission__permission_name=permission_name
        ).exists():
            raise PermissionDenied(f"Bạn không có quyền: {permission_name}")
    
    def has_permission(self, permission_name):
        """Trả về True/False để sử dụng trong logic"""
        return self.request.user.role.role_permissions.filter(
            permission__permission_name=permission_name
        ).exists()
    
    def get_user_permissions(self):
        """Lấy danh sách tất cả permissions của user hiện tại"""
        return list(
            self.request.user.role.role_permissions.values_list(
                'permission__permission_name', flat=True
            )
        )
