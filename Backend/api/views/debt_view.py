from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions.permission import DynamicPermission
from api.models import Debts
from api.services.debt_service import DebtService
from api.serializers.debt_serializer import DebtListSerializer, CreateDebtSerializer, CreateDebtPaymentSerializer
from drf_spectacular.utils import extend_schema ,OpenApiResponse
from api.services.activity_log_service import ActivityLogService

class DebtViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, DynamicPermission]
    
    permission_map = {
        'list_debts': 'view_own_expense', 
        'create_debt': 'create_expense',
        'pay_debt': 'edit_own_expense',
        'delete_debt': 'delete_own_expense',
    }

    @extend_schema(
        responses={
            200: OpenApiResponse(
                description="Successfully retrieved debt list"
            )
        }
    )
    @action(detail=False, methods=['get'], url_path='list')
    def list_debts(self, request):
        debts = DebtService.get_debts(request.user)
        serializer = DebtListSerializer(debts, many=True)
        ActivityLogService.log(
            request,
            action='VIEW_DEBTS',
            details='User viewed debt list',
            level='INFO'
        )
        return Response({'success': True, 'data': serializer.data}, status=status.HTTP_200_OK)

    @extend_schema(request=CreateDebtSerializer)
    @action(detail=False, methods=['post'], url_path='create')
    def create_debt(self, request):
        serializer = CreateDebtSerializer(data=request.data)
        if serializer.is_valid():
            debt = DebtService.create_debt(serializer.validated_data, request.user)
            ActivityLogService.log(
                request,
                action='CREATE_DEBT',
                details=f'User created debt: {debt.debt_id}',
                level='ACTION'
            )
            return Response({'success': True, 'data': {'debt_id': debt.debt_id}}, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='pay/(?P<debt_id>[^/.]+)')
    def pay_debt(self, request, debt_id=None):
        try:
            debt = Debts.objects.get(debt_id=debt_id, user=request.user)
            serializer = CreateDebtPaymentSerializer(data=request.data)
            
            if serializer.is_valid():
                DebtService.add_payment(debt, serializer.validated_data)
                ActivityLogService.log(
                    request,
                    action='PAY_DEBT',
                    details=f'User added payment for debt: {debt.debt_id}',
                    level='ACTION'
                )
                return Response({'success': True, 'message': 'Payment successful'})
            return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        except Debts.DoesNotExist:
            return Response({'success': False, 'message': 'Debt not found'}, status=status.HTTP_404_NOT_FOUND)

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Debt deleted successfully")
        }
    )
    @action(detail=False, methods=['delete'], url_path='delete/(?P<debt_id>[^/.]+)')
    def delete_debt(self, request, debt_id=None):
        try:
            debt = Debts.objects.get(debt_id=debt_id, user=request.user)
            ActivityLogService.log(
                request,
                action='DELETE_DEBT',
                details=f'User deleted debt: {debt.debt_id}',
                level='ACTION'
            )
            debt.delete()
            return Response({'success': True, 'message': 'Debt deleted successfully'}, status=status.HTTP_200_OK)
        except Debts.DoesNotExist:
            return Response({'success': False, 'message': 'Debt not found'}, status=status.HTTP_404_NOT_FOUND)