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
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.utils import OpenApiResponse
from api.pagination import CustomPagination
from django.db.models import F

class BudgetViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, DynamicPermission]
    
    permission_map = {
        'list_budgets': 'view_own_budget',
        'create_budget': 'create_budget',
        'update_budget': 'edit_own_budget',
        'delete_budget': 'delete_own_budget',
    }
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='p', description='Current page (default 1)', required=False, type=int),
            OpenApiParameter(name='ipp', description='Number of records per page', required=False, type=int),
            OpenApiParameter(name='search', description='Search keyword by budget name', required=False, type=str),
            OpenApiParameter(name='category_id', description='Filter by category ID', required=False, type=str),
            OpenApiParameter(name='period', description='Filter by period (daily, weekly, monthly, yearly)', required=False, type=str),
            OpenApiParameter(name='status', description='Filter by status (safe, warning, exceeded)', required=False, type=str),
            OpenApiParameter(name='min_progress', description='Minimum progress (%)', required=False, type=float),
            OpenApiParameter(name='max_progress', description='Maximum progress (%)', required=False, type=float),
        ],
        responses={
            200: OpenApiResponse(
                description="Successfully retrieved budget list"
            )
        }
    )
    @action(detail=False, methods=['get'], url_path='list')
    def list_budgets(self, request):
        try:
            queryset = BudgetService.get_budgets(request.user)

            search_query = request.query_params.get('search', '').strip()
            category_id = request.query_params.get('category_id', '').strip()
            period = request.query_params.get('period', '').strip()
            status_filter = request.query_params.get('status', '').strip().lower()
            min_progress = request.query_params.get('min_progress')
            max_progress = request.query_params.get('max_progress')

            if search_query:
                queryset = queryset.filter(budget_name__icontains=search_query)
            if category_id:
                queryset = queryset.filter(category_id=category_id)
            if period in ['daily', 'weekly', 'monthly', 'yearly']:
                queryset = queryset.filter(period=period)
                
            if min_progress is not None:
                queryset = queryset.filter(percentage_calc__gte=float(min_progress))
            if max_progress is not None:
                queryset = queryset.filter(percentage_calc__lte=float(max_progress))
                
            if status_filter == 'exceeded':
                queryset = queryset.filter(percentage_calc__gte=100)
            elif status_filter == 'warning':
                queryset = queryset.filter(percentage_calc__gte=F('alert_threshold'), percentage_calc__lt=100)
            elif status_filter == 'safe':
                queryset = queryset.filter(percentage_calc__lt=F('alert_threshold'))

            paginator = CustomPagination()
            paginated_queryset = paginator.paginate_queryset(queryset, request)

            serializer = BudgetListSerializer(paginated_queryset, many=True)
            return paginator.get_paginated_response(serializer.data)

        except Exception as e:
            return Response({'success': False, 'message': f'Server error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(
        request=CreateBudgetSerializer,
        responses={
            201: OpenApiResponse(
                description="Budget created successfully"
             )
        }
    )
    @action(detail=False, methods=['post'], url_path='create')
    def create_budget(self, request):
        serializer = CreateBudgetSerializer(data=request.data, context={'user': request.user})
        if not serializer.is_valid():
            return Response({'success': False, 'message': 'Data error', 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            budget = BudgetService.create_budget(serializer.validated_data, request.user)
            return Response({'success': True, 'message': 'Created successfully', 'data': {'budget_id': budget.budget_id}}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'success': False, 'message': 'Server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(
        request=UpdateBudgetSerializer,
        responses={
            200: OpenApiResponse(
                description="Budget updated successfully"
            )
        }
    )
    @action(detail=False, methods=['put', 'patch'], url_path='update/(?P<budget_id>[^/.]+)')
    def update_budget(self, request, budget_id=None):
        try:
            budget = Budgets.objects.get(budget_id=budget_id, user=request.user, is_active=True)
        except Budgets.DoesNotExist:
            return Response({'success': False, 'message': 'Budget not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateBudgetSerializer(data=request.data, context={'user': request.user, 'budget': budget})
        if not serializer.is_valid():
            return Response({'success': False, 'message': 'Data error', 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            updated_budget = BudgetService.update_budget(budget, serializer.validated_data)
            return Response({'success': True, 'message': 'Updated successfully', 'data': {'budget_id': updated_budget.budget_id}}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'success': False, 'message': 'Server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(
        responses={
            200: OpenApiResponse(
                description="Budget deleted successfully"
            )
        }
    )
    @action(detail=False, methods=['delete'], url_path='delete/(?P<budget_id>[^/.]+)')
    def delete_budget(self, request, budget_id=None):
        try:
            budget = Budgets.objects.get(budget_id=budget_id, user=request.user, is_active=True)
            BudgetService.delete_budget(budget)
            return Response({'success': True, 'message': 'Deleted successfully'}, status=status.HTTP_200_OK)
        except Budgets.DoesNotExist:
            return Response({'success': False, 'message': 'Budget not found'}, status=status.HTTP_404_NOT_FOUND)
