from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions.permission import DynamicPermission
from api.models import Budgets
from api.services.budget_service import BudgetService
from api.serializers.budget_serializer import (
    BudgetListSerializer, CreateBudgetSerializer, UpdateBudgetSerializer
)
import logging
from drf_spectacular.utils import extend_schema
from drf_spectacular.utils import OpenApiResponse

class BudgetViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, DynamicPermission]
    
    permission_map = {
        'list_budgets': 'view_own_budget',
        'create_budget': 'create_budget',
        'update_budget': 'edit_own_budget',
        'delete_budget': 'delete_own_budget',
    }
    
    @extend_schema(
        request=BudgetListSerializer,
        responses={
            200: OpenApiResponse(
                description="Lấy danh sách ngân sách "
            )
        }
    )
    @action(detail=False, methods=['get'], url_path='list')
    def list_budgets(self, request):
        try:
            budgets = BudgetService.get_budgets(request.user)
            serializer = BudgetListSerializer(budgets, many=True)
            return Response({
                'success': True, 'message': 'Thành công', 'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'success': False, 'message': 'Lỗi server'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(
        request=CreateBudgetSerializer,
        responses={
            201: OpenApiResponse(
                description="Tạo ngân sách thành công"
             )
        }
    )
    @action(detail=False, methods=['post'], url_path='create')
    def create_budget(self, request):
        serializer = CreateBudgetSerializer(data=request.data, context={'user': request.user})
        if not serializer.is_valid():
            return Response({'success': False, 'message': 'Lỗi dữ liệu', 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            budget = BudgetService.create_budget(serializer.validated_data, request.user)
            return Response({'success': True, 'message': 'Tạo thành công', 'data': {'budget_id': budget.budget_id}}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'success': False, 'message': 'Lỗi server'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(
        request=UpdateBudgetSerializer,
        responses={
            200: OpenApiResponse(
                description="Cập nhật ngân sách thành công"
            )
        }
    )
    @action(detail=False, methods=['put', 'patch'], url_path='update/(?P<budget_id>[^/.]+)')
    def update_budget(self, request, budget_id=None):
        try:
            budget = Budgets.objects.get(budget_id=budget_id, user=request.user, is_active=True)
        except Budgets.DoesNotExist:
            return Response({'success': False, 'message': 'Ngân sách không tồn tại'}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateBudgetSerializer(data=request.data, context={'user': request.user, 'budget': budget})
        if not serializer.is_valid():
            return Response({'success': False, 'message': 'Lỗi dữ liệu', 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            updated_budget = BudgetService.update_budget(budget, serializer.validated_data)
            return Response({'success': True, 'message': 'Cập nhật thành công', 'data': {'budget_id': updated_budget.budget_id}}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'success': False, 'message': 'Lỗi server'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                description="Xóa ngân sách thành công"
            )
        }
    )
    @action(detail=False, methods=['delete'], url_path='delete/(?P<budget_id>[^/.]+)')
    def delete_budget(self, request, budget_id=None):
        try:
            budget = Budgets.objects.get(budget_id=budget_id, user=request.user, is_active=True)
            BudgetService.delete_budget(budget)
            return Response({'success': True, 'message': 'Xóa thành công'}, status=status.HTTP_200_OK)
        except Budgets.DoesNotExist:
            return Response({'success': False, 'message': 'Ngân sách không tồn tại'}, status=status.HTTP_404_NOT_FOUND)
