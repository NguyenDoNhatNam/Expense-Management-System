
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
class HasPermission(BasePermission):
    """
    Permission class that checks permissions based on database
    """
    
    # Define required permission for each action
    permission_required = None
    
    def has_permission(self, request, view):
        # print(f"Checking permission for user {request.user} on action {view.action}")
        # If not authenticated -> deny
        if not request.user.is_authenticated:
            return False
        
        # Get the required permission to check
        required_permission = self.get_required_permission(view)
        if not required_permission:
            return True
        
        # Check if user has the permission
        return self.check_user_permission(request.user, required_permission)
    
    def get_required_permission(self, view):
        """Get the required permission name to check"""
        # Prioritize permission defined in the view
        if hasattr(view, 'permission_required'):
            action = getattr(view, 'action', None)
            if isinstance(view.permission_required, dict):
                return view.permission_required.get(action)
            return view.permission_required
        return self.permission_required
    
    def check_user_permission(self, user, permission_name):
        """Check if user has the permission (query database)"""
        return user.role.role_permissions.filter(
            permission__permission_name=permission_name
        ).exists()


# ============================================
# SPECIFIC PERMISSIONS FOR EACH FEATURE
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
# FLEXIBLE PERMISSION FOR VIEWSET
# ============================================

class DynamicPermission(BasePermission):
    """
    Dynamic permission - automatically maps action to permission
    Used in ViewSet with permission_map
    """
    
    def has_permission(self, request, view):
        # print("=== DEBUG PERMISSION CHECK ===")
        # print("User:", request.user)
        # print("User ID:", request.user.user_id if hasattr(request.user, 'user_id') else "No user_id")
        # print("Authenticated:", request.user.is_authenticated)
        
        if not request.user.is_authenticated:
            # print("→ Not authenticated")
            return False
        
        permission_map = getattr(view, 'permission_map', {})
        action = getattr(view, 'action', None)
        # print("Action:", action)
        # print("Permission map:", permission_map)
        
        required_permission = permission_map.get(action)
        # print("Required permission for this action:", required_permission)
        
        if not required_permission:
            # print("→ No required permission → allowed")
            return True
        
        has_perm = request.user.role.rolepermissions_set.filter(
            permission__permission_name=required_permission
        ).exists()
        
        # print("Has permission '" + required_permission + "':", has_perm)
        # print("User role:", request.user.role.role_name if request.user.role else "No role")
        
        return has_perm
    
    def has_object_permission(self, request, view, obj):
        """Check permission for a specific object (own vs all)"""
        if not request.user.is_authenticated:
            return False
        
        action = getattr(view, 'action', None)
        
        # Check if user is the owner
        is_owner = self.is_owner(request.user, obj)
        
        if is_owner:
            # Check "own" permission
            own_permission = f"{action}_own_expense"
            return self.has_perm(request.user, own_permission)
        else:
            # Check "all" permission
            all_permission = f"{action}_all_expenses"
            return self.has_perm(request.user, all_permission)
    
    def is_owner(self, user, obj):
        """Check if user is the owner of the object"""
        return hasattr(obj, 'user') and obj.user == user
    
    def has_perm(self, user, permission_name):
        """Check permission in database"""
        return user.role.role_permissions.filter(
            permission__permission_name=permission_name
        ).exists()


# ====================================================
# MIXIN FOR CHECKING PERMISSIONS IN VIEW LOGIC
# ====================================================

class PermissionMixin:
    """
    Mixin for easily checking permissions in views
    """
    
    def check_permission(self, permission_name):
        """Check permission and raise exception if not granted"""
        if not self.request.user.role.role_permissions.filter(
            permission__permission_name=permission_name
        ).exists():
            raise PermissionDenied(f"You do not have permission: {permission_name}")
    
    def has_permission(self, permission_name):
        """Return True/False for use in logic"""
        return self.request.user.role.role_permissions.filter(
            permission__permission_name=permission_name
        ).exists()
    
    def get_user_permissions(self):
        """Get list of all permissions for the current user"""
        return list(
            self.request.user.role.role_permissions.values_list(
                'permission__permission_name', flat=True
            )
        )
