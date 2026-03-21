
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
class HasPermission(BasePermission):
    """
    Permission class kiểm tra quyền dựa trên database
    """
    
    # Định nghĩa permission cần thiết cho từng action
    permission_required = None
    
    def has_permission(self, request, view):
        print(f"Checking permission for user {request.user} on action {view.action}")
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
        print("=== DEBUG PERMISSION CHECK ===")
        print("User:", request.user)
        print("User ID:", request.user.user_id if hasattr(request.user, 'user_id') else "No user_id")
        print("Authenticated:", request.user.is_authenticated)
        
        if not request.user.is_authenticated:
            print("→ Not authenticated")
            return False
        
        permission_map = getattr(view, 'permission_map', {})
        action = getattr(view, 'action', None)
        print("Action:", action)
        print("Permission map:", permission_map)
        
        required_permission = permission_map.get(action)
        print("Required permission for this action:", required_permission)
        
        if not required_permission:
            print("→ No required permission → allowed")
            return True
        
        has_perm = request.user.role.rolepermissions_set.filter(
            permission__permission_name=required_permission
        ).exists()
        
        print("Has permission '" + required_permission + "':", has_perm)
        print("User role:", request.user.role.role_name if request.user.role else "No role")
        
        return has_perm
    
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
