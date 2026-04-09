from api.services.transaction_service import TransactionService
from api.serializers.transaction_serializer import (
    CreateTransactionSerializer,
    UpdateTransactionSerializer,
    DeleteTransactionSerializer,
    TransactionListSerializer,
)
from api.models import Transactions
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db.models import Q
import logging
from api.permissions.permission import PermissionMixin , DynamicPermission ,HasPermission
from api.services.activity_log_service import ActivityLogService
logger = logging.getLogger(__name__)
from drf_spectacular.utils import extend_schema
from drf_spectacular.utils import OpenApiResponse

class TransactionViewset(viewsets.ViewSet):
    permission_classes = [IsAuthenticated , DynamicPermission] 
    permission_map = {
        'list_transactions': 'view_own_expense',
        'create_transaction': 'create_expense',
        'update_transaction': 'edit_own_expense',
        'delete_transaction': 'delete_own_expense',
        'restore_transaction': 'edit_own_expense',   
    }

    
    # ===================== LIST =====================
    @extend_schema(
        responses=TransactionListSerializer(many=True),
        description="Get user's transaction list with optional filters."
    )
    @action(detail=False, methods=['get'], url_path='list')
    def list_transactions(self, request, *args, **kwargs):
        """
        GET /api/transactions/list/
        """
        user = request.user
        queryset = Transactions.objects.filter(user=user, is_deleted=False).order_by('-transaction_date')
        account_id = request.query_params.get('account_id')
        account_ids = request.query_params.get('account_ids')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        trans_type = request.query_params.get('transaction_type')
        keyword = request.query_params.get('keyword')
        min_amount = request.query_params.get('min_amount')
        max_amount = request.query_params.get('max_amount')
        category_ids = request.query_params.get('category_ids')
        sort_by = request.query_params.get('sort_by')

        if account_id:
            queryset = queryset.filter(account__account_id=account_id)
        elif account_ids:
            ids = [aid.strip() for aid in account_ids.split(',') if aid.strip()]
            if ids:
                queryset = queryset.filter(account__account_id__in=ids)
        if start_date:
            queryset = queryset.filter(transaction_date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(transaction_date__date__lte=end_date)
        if trans_type and trans_type in ['income', 'expense']:
            queryset = queryset.filter(transaction_type=trans_type)
        if keyword:
            queryset = queryset.filter(Q(description__icontains=keyword) | Q(note__icontains=keyword))
        if min_amount:
            queryset = queryset.filter(amount__gte=min_amount)
        if max_amount:
            queryset = queryset.filter(amount__lte=max_amount)
        if category_ids:
            ids = [cid.strip() for cid in category_ids.split(',') if cid.strip()]
            if ids:
                queryset = queryset.filter(category__category_id__in=ids)

        sort_mapping = {
            'newest': '-transaction_date',
            'oldest': 'transaction_date',
            'amount_desc': '-amount',
            'amount_asc': 'amount',
        }
        if sort_by and sort_by in sort_mapping:
            queryset = queryset.order_by(sort_mapping[sort_by])

        serializer = TransactionListSerializer(queryset, many=True)
        total_items = queryset.count()
        ActivityLogService.log(
            request,
            action='VIEW_TRANSACTIONS',
            details='User viewed transaction list',
            level='INFO'
        )
        return Response(
            {
                'success': True,
                'message': 'Transaction list retrieved successfully.',
                'data': {
                    'transactions': serializer.data,
                    'pagination': {
                        'total_items': total_items,
                        'total_pages': 1,
                        'current_page': 1,
                        'items_per_page': total_items,
                        'has_next': False,
                        'has_previous': False,
                    },
                },
            },
            status=status.HTTP_200_OK,
        )
    # ===================== CREATE =====================
    @extend_schema(
        request=CreateTransactionSerializer,
        responses={
            200: OpenApiResponse(
                description="Budget list "
            )
        }
    )
    @action(detail=False, methods=['post'], url_path='create')
    def create_transaction(self, request, *args, **kwargs):
        serializer = CreateTransactionSerializer(
            data=request.data,
            context={'user': request.user}
        )
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': f'Invalid data: {", ".join([str(error) for error in serializer.errors])}',
                'errors': serializer.errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = TransactionService.create_transaction(
                serializer.validated_data, request.user
            )
            ActivityLogService.log(
                request,
                action='CREATE_TRANSACTION',
                details='User created a new transaction',
                level='ACTION'
            )
            return Response(
                {
                    'success': True,
                    'message': 'Transaction created successfully',
                    'data': result,
                },
                status=status.HTTP_201_CREATED,
            )
        except ValueError as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f'Error creating transaction: {str(e)}', exc_info=True)
            return Response(
                {'success': False, 'message': 'An error occurred while creating transaction'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # ===================== UPDATE =====================
    @extend_schema(
        request=UpdateTransactionSerializer,
        responses={
            200: OpenApiResponse(
                description="Budget list "
            )
        }
    )
    @action(detail=False, methods=['put', 'patch'], url_path='update/(?P<transaction_id>[^/.]+)')
    def update_transaction(self, request, transaction_id=None, *args, **kwargs):
        """
        PUT/PATCH /api/transactions/update/{transaction_id}/
        """
        # 1. Get old transaction to pass into context
        try:
            old_transaction = Transactions.objects.get(
                transaction_id=transaction_id,
                user=request.user,
                is_deleted=False,
            )
        except Transactions.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Transaction not found or has been deleted'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 2. Validate new data
        serializer = UpdateTransactionSerializer(
            data=request.data,
            context={
                'user': request.user,
                'old_transaction': old_transaction,
            }
        )
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Invalid data',
                'errors': serializer.errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        # 3. Perform update
        try:
            result = TransactionService.update_transaction(
                transaction_id=transaction_id,
                validated_data=serializer.validated_data,
                user=request.user,
            )
            ActivityLogService.log(
                request,
                action='UPDATE_TRANSACTION',
                details=f'User updated transaction {transaction_id}',
                level='ACTION'
            )
            return Response(
                {
                    'success': True,
                    'message': 'Transaction updated successfully',
                    'data': result,
                },
                status=status.HTTP_200_OK,
            )
        except ValueError as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f'Error updating transaction: {str(e)}', exc_info=True)
            return Response(
                {'success': False, 'message': 'An error occurred while updating transaction'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # ===================== DELETE =====================
    @extend_schema(
        request=DeleteTransactionSerializer,
        responses={
            200: OpenApiResponse(
                description="Budget list "
            )
        }
    )
    @action(detail=False, methods=['delete'], url_path='delete/(?P<transaction_id>[^/.]+)')
    def delete_transaction(self, request, transaction_id=None, *args, **kwargs):
        """
        DELETE /api/transactions/delete/{transaction_id}/
        Query params: ?hard_delete=true (optional, default soft delete)
        """
        # 1. Get transaction
        try:
            transaction_obj = Transactions.objects.get(
                transaction_id=transaction_id,
                user=request.user,
                is_deleted=False,
            )
        except Transactions.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Transaction not found or has been deleted'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 2. Validate (check 30-day limit, ...)
        serializer = DeleteTransactionSerializer(
            data={
                'hard_delete': request.query_params.get('hard_delete', 'false').lower() == 'true',
            },
            context={
                'user': request.user,
                'transaction': transaction_obj,
            }
        )
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Cannot delete transaction',
                'errors': serializer.errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        # 3. Perform delete
        try:
            hard_delete = serializer.validated_data.get('hard_delete', False)
            result = TransactionService.delete_transaction(
                transaction_id=transaction_id,
                user=request.user,
                hard_delete=hard_delete,
            )
            ActivityLogService.log(
                request,
                action='DELETE_TRANSACTION',
                details=f'User deleted transaction {transaction_id} (hard_delete={hard_delete})',
                level='ACTION'
            )
            return Response(
                {
                    'success': True,
                    'message': 'Transaction deleted successfully',
                    'data': result,
                },
                status=status.HTTP_200_OK,
            )
        except ValueError as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f'Error deleting transaction: {str(e)}', exc_info=True)
            return Response(
                {'success': False, 'message': 'An error occurred while deleting transaction'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # ===================== RESTORE =====================
    @extend_schema(
        responses={
            200: OpenApiResponse(
                description="Budget list "
            )
        }
    )
    @action(detail=False, methods=['post'], url_path='restore/(?P<transaction_id>[^/.]+)')
    def restore_transaction(self, request, transaction_id=None, *args, **kwargs):
        """
        POST /api/transactions/restore/{transaction_id}/
        Restore a soft-deleted transaction.
        """
        try:
            transaction_obj = Transactions.objects.get(
                transaction_id=transaction_id,
                user=request.user,
                is_deleted=True,
            )
        except Transactions.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Deleted transaction not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            result = TransactionService.restore_transaction(
                transaction_id=transaction_id,
                user=request.user,
            )
            ActivityLogService.log(
                request,
                action='RESTORE_TRANSACTION',
                details=f'User restored transaction {transaction_id}',
                level='ACTION'
            )
            return Response(
                {
                    'success': True,
                    'message': 'Transaction restored successfully',
                    'data': result,
                },
                status=status.HTTP_200_OK,
            )
        except ValueError as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f'Error restoring transaction: {str(e)}', exc_info=True)
            return Response(
                {'success': False, 'message': 'An error occurred while restoring the transaction'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )