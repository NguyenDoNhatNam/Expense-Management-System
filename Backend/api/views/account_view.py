from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions.permission import DynamicPermission
from api.models import Accounts
from api.services.account_service import AccountService
from api.serializers.account_serializer import AccountListSerializer, CreateAccountSerializer, UpdateAccountSerializer
from drf_spectacular.utils import extend_schema, OpenApiResponse

class AccountViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, DynamicPermission]
    
    # Sử dụng quyền quản lý tài sản chung (tham chiếu từ bảng permission có sẵn)
    permission_map = {
        'list_accounts': 'view_own_expense',
        'create_account': 'create_expense',
        'update_account': 'edit_own_expense',
        'delete_account': 'delete_own_expense',
    }

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Lấy danh sách tài khoản thành công")
        }
    )
    @action(detail=False, methods=['get'], url_path='list')
    def list_accounts(self, request):
        accounts, net_worth = AccountService.get_accounts_summary(request.user)
        serializer = AccountListSerializer(accounts, many=True)
        return Response({
            'success': True,
            'message': 'Lấy danh sách tài khoản thành công',
            'data': {
                'net_worth': str(net_worth),
                'accounts': serializer.data
            }
        }, status=status.HTTP_200_OK)

    @extend_schema(
        request=CreateAccountSerializer,
        responses={
            201: OpenApiResponse(description="Tạo tài khoản mới thành công")
        }
    )
    @action(detail=False, methods=['post'], url_path='create')
    def create_account(self, request):
        serializer = CreateAccountSerializer(data=request.data, context={'user': request.user})
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Dữ liệu không hợp lệ',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            account = AccountService.create_account(serializer.validated_data, request.user)
            return Response({
                'success': True,
                'message': 'Tạo tài khoản thành công',
                'data': {'account_id': account.account_id, 'balance': str(account.balance)}
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'success': False, 'message': f'Lỗi server: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(request=UpdateAccountSerializer)
    @action(detail=False, methods=['put', 'patch'], url_path='update/(?P<account_id>[^/.]+)')
    def update_account(self, request, account_id=None):
        try:
            account = Accounts.objects.get(account_id=account_id, user=request.user)
        except Accounts.DoesNotExist:
            return Response({'success': False, 'message': 'Tài khoản không tồn tại'}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateAccountSerializer(data=request.data, context={'user': request.user, 'account': account})
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            updated_account = AccountService.update_account(account, serializer.validated_data, request.user)
            return Response({'success': True, 'message': 'Cập nhật tài khoản thành công', 'data': {'account_id': updated_account.account_id}}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['delete'], url_path='delete/(?P<account_id>[^/.]+)')
    def delete_account(self, request, account_id=None):
        try:
            account = Accounts.objects.get(account_id=account_id, user=request.user)
            AccountService.delete_account(account, request.user)
            return Response({'success': True, 'message': 'Xóa tài khoản thành công'}, status=status.HTTP_200_OK)
        except Accounts.DoesNotExist:
            return Response({'success': False, 'message': 'Tài khoản không tồn tại'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)