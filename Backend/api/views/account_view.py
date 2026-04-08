from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions.permission import DynamicPermission
from api.models import Accounts
from api.services.account_service import AccountService
from api.serializers.account_serializer import AccountListSerializer, CreateAccountSerializer, UpdateAccountSerializer
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from api.pagination import CustomPagination

class AccountViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, DynamicPermission]
    
    permission_map = {
        'list_accounts': 'view_own_expense',
        'create_account': 'create_expense',
        'update_account': 'edit_own_expense',
        'delete_account': 'delete_own_expense',
    }

    @extend_schema(
        parameters=[
            OpenApiParameter(name='p', description='Current page (default 1)', required=False, type=int),
            OpenApiParameter(name='ipp', description='Number of records per page', required=False, type=int),
            OpenApiParameter(name='search', description='Search keyword by account name', required=False, type=str),
            OpenApiParameter(name='account_type', description='Account type (cash, bank, credit_card, e_wallet, investment)', required=False, type=str),
            OpenApiParameter(name='is_include_in_total', description='Include in total assets (true/false)', required=False, type=bool),
        ],
        responses={
            200: OpenApiResponse(description="Successfully retrieved account list")
        }
    )
    @action(detail=False, methods=['get'], url_path='list')
    def list_accounts(self, request):
        accounts, net_worth = AccountService.get_accounts_summary(request.user)
        
        search_query = request.query_params.get('search', '').strip()
        account_type = request.query_params.get('account_type', '').strip()
        is_include = request.query_params.get('is_include_in_total', None)

        if search_query:
            accounts = accounts.filter(account_name__icontains=search_query)
        if account_type:
            accounts = accounts.filter(account_type=account_type)
        if is_include is not None:
            is_include_bool = str(is_include).lower() == 'true'
            accounts = accounts.filter(is_include_in_total=is_include_bool)

        paginator = CustomPagination()
        paginated_queryset = paginator.paginate_queryset(accounts, request)
        serializer = AccountListSerializer(paginated_queryset, many=True)
        
        response = paginator.get_paginated_response(serializer.data)
        response.data['data']['net_worth'] = str(net_worth)
        return response

    @extend_schema(
        request=CreateAccountSerializer,
        responses={
            201: OpenApiResponse(description="Successfully created new account")
        }
    )
    @action(detail=False, methods=['post'], url_path='create')
    def create_account(self, request):
        serializer = CreateAccountSerializer(data=request.data, context={'user': request.user})
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Invalid data',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            account = AccountService.create_account(serializer.validated_data, request.user)
            return Response({
                'success': True,
                'message': 'Account created successfully',
                'data': {'account_id': account.account_id, 'balance': str(account.balance)}
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'success': False, 'message': f'Server error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(request=UpdateAccountSerializer)
    @action(detail=False, methods=['put', 'patch'], url_path='update/(?P<account_id>[^/.]+)')
    def update_account(self, request, account_id=None):
        try:
            account = Accounts.objects.get(account_id=account_id, user=request.user)
        except Accounts.DoesNotExist:
            return Response({'success': False, 'message': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateAccountSerializer(data=request.data, context={'user': request.user, 'account': account})
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            updated_account = AccountService.update_account(account, serializer.validated_data, request.user)
            return Response({'success': True, 'message': 'Account updated successfully', 'data': {'account_id': updated_account.account_id}}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['delete'], url_path='delete/(?P<account_id>[^/.]+)')
    def delete_account(self, request, account_id=None):
        try:
            account = Accounts.objects.get(account_id=account_id, user=request.user)
            AccountService.delete_account(account, request.user)
            return Response({'success': True, 'message': 'Account deleted successfully'}, status=status.HTTP_200_OK)
        except Accounts.DoesNotExist:
            return Response({'success': False, 'message': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)