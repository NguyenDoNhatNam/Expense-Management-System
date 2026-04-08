"""
Admin Users Management Views
API endpoints for Admin Dashboard user management.
"""
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db.models import Count, Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse

from api.models import Users, Accounts, Budgets, Transactions, Roles
from api.services.activity_log_service import ActivityLogService
from api.permissions.permission import DynamicPermission

import logging

logger = logging.getLogger(__name__)


class AdminUsersViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, DynamicPermission]
    permission_map = {
        'list': 'view_all_users',
        'retrieve': 'view_all_users',
        'destroy': 'delete_users',
        'get_stats': 'view_all_users',
        'toggle_status': 'edit_all_users',
    }

    @extend_schema(
        parameters=[
            OpenApiParameter(name='page', description='Page number', required=False, type=int),
            OpenApiParameter(name='page_size', description='Items per page', required=False, type=int),
            OpenApiParameter(name='search', description='Search by name or email', required=False, type=str),
            OpenApiParameter(name='is_active', description='Filter by active status', required=False, type=bool),
            OpenApiParameter(name='role', description='Filter theo role', required=False, type=str),
        ],
        responses={200: dict}
    )
    def list(self, request):
        try:
            # Log activity
            ActivityLogService.log(request, 'VIEW_USERS', 'Admin viewed users list')
            
            # Parse query params
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 50))
            page_size = min(page_size, 100)  
            search = request.query_params.get('search', '')
            is_active_filter = request.query_params.get('is_active')
            role_filter = request.query_params.get('role')
            
            queryset = Users.objects.select_related('role').all()
            
            queryset = queryset.exclude(role__role_name='super_admin')
            
            if search:
                queryset = queryset.filter(
                    Q(full_name__icontains=search) | Q(email__icontains=search)
                )
            
            if is_active_filter is not None:
                is_active = is_active_filter.lower() == 'true'
                queryset = queryset.filter(is_active=is_active)
            
            if role_filter:
                queryset = queryset.filter(role__role_name=role_filter)
            
            total_count = queryset.count()
            
            queryset = queryset.order_by('-created_at')
            
            start = (page - 1) * page_size
            end = start + page_size
            users = queryset[start:end]
            
            users_data = []
            for user in users:
                wallets_count = Accounts.objects.filter(user_id=user.user_id).count()
                budgets_count = Budgets.objects.filter(user_id=user.user_id).count()
                transactions_count = Transactions.objects.filter(user_id=user.user_id).count()
                
                users_data.append({
                    'user_id': user.user_id,
                    'email': user.email,
                    'full_name': user.full_name,
                    'phone': user.phone,
                    'avatar_url': user.avatar_url,
                    'default_currency': user.default_currency,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'updated_at': user.updated_at.isoformat() if user.updated_at else None,
                    'last_login': user.last_login.isoformat() if user.last_login else None,
                    'is_active': user.is_active,
                    'role': user.role.role_name if user.role else 'user',
                    'wallets_count': wallets_count,
                    'budgets_count': budgets_count,
                    'transactions_count': transactions_count,
                })
            
            return Response({
                'success': True,
                'data': users_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': (total_count + page_size - 1) // page_size,
                },
                'message': 'Users list retrieved successfully'
            })
        except Exception as e:
            logger.error(f'Error listing users: {str(e)}')
            return Response({
                'success': False,
                'message': f'Server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(responses={200: dict})
    def retrieve(self, request, pk=None):
        try:
            user = Users.objects.select_related('role').get(user_id=pk)
        except Users.DoesNotExist:
            return Response({
                'success': False,
                'message': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        ActivityLogService.log(request, 'VIEW_USER_DETAIL', f'Admin viewed user detail: {user.email}')
        
        wallets = Accounts.objects.filter(user_id=user.user_id)
        budgets = Budgets.objects.filter(user_id=user.user_id)
        transactions = Transactions.objects.filter(user_id=user.user_id)
        
        total_income = sum(t.amount for t in transactions if t.transaction_type == 'income')
        total_expense = sum(t.amount for t in transactions if t.transaction_type == 'expense')
        
        return Response({
            'success': True,
            'data': {
                'user_id': user.user_id,
                'email': user.email,
                'full_name': user.full_name,
                'phone': user.phone,
                'avatar_url': user.avatar_url,
                'default_currency': user.default_currency,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'updated_at': user.updated_at.isoformat() if user.updated_at else None,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'is_active': user.is_active,
                'role': user.role.role_name if user.role else 'user',
                'stats': {
                    'wallets_count': wallets.count(),
                    'budgets_count': budgets.count(),
                    'transactions_count': transactions.count(),
                    'total_income': float(total_income),
                    'total_expense': float(total_expense),
                    'net_balance': float(total_income - total_expense),
                }
            },
            'message': 'User information retrieved successfully'
        })

    @extend_schema(responses={200: dict})
    def destroy(self, request, pk=None):

        try:
            user = Users.objects.get(user_id=pk)
        except Users.DoesNotExist:
            return Response({
                'success': False,
                'message': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if user.role and user.role.role_name in ['admin', 'super_admin']:
            return Response({
                'success': False,
                'message': 'Cannot delete admin account'
            }, status=status.HTTP_403_FORBIDDEN)
        
        user.is_active = False
        user.updated_at = timezone.now()
        user.save()
        
        ActivityLogService.log(request, 'DELETE_USER', f'Admin deleted user: {user.email}', level='WARNING')
        
        return Response({
            'success': True,
            'message': f'User {user.email} has been disabled'
        })

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'], url_path='stats')
    def get_stats(self, request):
        try:
            ActivityLogService.log(request, 'VIEW_STATS', 'Admin viewed dashboard stats')
            
            total_users = Users.objects.exclude(role__role_name='super_admin').count()
            active_users = Users.objects.filter(is_active=True).exclude(role__role_name='super_admin').count()
            new_users_this_month = Users.objects.filter(
                created_at__month=timezone.now().month,
                created_at__year=timezone.now().year
            ).exclude(role__role_name='super_admin').count()
            
            total_transactions = Transactions.objects.count()
            transactions_this_month = Transactions.objects.filter(
                created_at__month=timezone.now().month,
                created_at__year=timezone.now().year
            ).count()
            
            total_wallets = Accounts.objects.count()
            
            total_budgets = Budgets.objects.count()
            
            recent_users = Users.objects.exclude(
                role__role_name='super_admin'
            ).order_by('-created_at')[:5]
            
            return Response({
                'success': True,
                'data': {
                    'users': {
                        'total': total_users,
                        'active': active_users,
                        'inactive': total_users - active_users,
                        'new_this_month': new_users_this_month,
                    },
                    'transactions': {
                        'total': total_transactions,
                        'this_month': transactions_this_month,
                    },
                    'wallets': {
                        'total': total_wallets,
                    },
                    'budgets': {
                        'total': total_budgets,
                    },
                    'recent_users': [
                        {
                            'user_id': u.user_id,
                            'full_name': u.full_name,
                            'email': u.email,
                            'created_at': u.created_at.isoformat() if u.created_at else None,
                        }
                        for u in recent_users
                    ]
                },
                'message': 'Statistics retrieved successfully'
            })
        except Exception as e:
            logger.error(f'Error getting stats: {str(e)}')
            return Response({
                'success': False,
                'message': f'Server error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(responses={200: dict})
    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        try:
            user = Users.objects.get(user_id=pk)
        except Users.DoesNotExist:
            return Response({
                'success': False,
                'message': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Prevent toggling admin/super_admin
        if user.role and user.role.role_name in ['admin', 'super_admin']:
            return Response({
                'success': False,
                'message': 'Cannot change admin account status'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Toggle status
        user.is_active = not user.is_active
        user.updated_at = timezone.now()
        user.save()
        
        action_text = 'activated' if user.is_active else 'disabled'
        
        # Log activity
        ActivityLogService.log(
            request, 
            'TOGGLE_USER_STATUS', 
            f'Admin {action_text} user: {user.email}',
            level='ACTION'
        )
        
        return Response({
            'success': True,
            'data': {
                'user_id': user.user_id,
                'is_active': user.is_active,
            },
            'message': f'User {user.email} has been {action_text}'
        })
