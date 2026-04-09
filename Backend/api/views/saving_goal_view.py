from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from api.permissions.permission import DynamicPermission
from api.models import SavingsGoals
from api.services.saving_goal_service import SavingGoalService
from api.serializers.saving_goal_serializer import SavingGoalListSerializer, CreateSavingGoalSerializer, UpdateSavingGoalSerializer
from drf_spectacular.utils import extend_schema
from api.services.activity_log_service import ActivityLogService

class SavingGoalViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, DynamicPermission]
    
    # You can add corresponding permissions to the permissions table in DB
    permission_map = {
        'list_goals': 'view_own_expense', 
        'create_goal': 'create_expense',
        'update_goal': 'edit_own_expense',
        'delete_goal': 'delete_own_expense',
    }

    @extend_schema(responses={200: SavingGoalListSerializer(many=True)})
    @action(detail=False, methods=['get'], url_path='list')
    def list_goals(self, request):
        goals = SavingGoalService.get_goals(request.user)
        serializer = SavingGoalListSerializer(goals, many=True)
        ActivityLogService.log(
            request,
            action='VIEW_SAVING_GOALS',
            details='User viewed saving goals list',
            level='INFO'
        )
        return Response({'success': True, 'data': serializer.data}, status=status.HTTP_200_OK)

    @extend_schema(request=CreateSavingGoalSerializer)
    @action(detail=False, methods=['post'], url_path='create')
    def create_goal(self, request):
        serializer = CreateSavingGoalSerializer(data=request.data)
        if serializer.is_valid():
            goal = SavingGoalService.create_goal(serializer.validated_data, request.user)
            ActivityLogService.log(
                request,
                action='CREATE_SAVING_GOAL',
                details=f'User created saving goal: {goal.goal_name}',
                level='ACTION'
            )
            return Response({'success': True, 'data': {'goal_id': goal.goal_id}}, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(request=UpdateSavingGoalSerializer)
    @action(detail=False, methods=['put', 'patch'], url_path='update/(?P<goal_id>[^/.]+)')
    def update_goal(self, request, goal_id=None):
        try:
            goal = SavingsGoals.objects.get(goal_id=goal_id, user=request.user)
            serializer = UpdateSavingGoalSerializer(data=request.data)
            if serializer.is_valid():
                SavingGoalService.update_goal(goal, serializer.validated_data)
                ActivityLogService.log(
                    request,
                    action='UPDATE_SAVING_GOAL',
                    details=f'User updated saving goal: {goal.goal_name}',
                    level='ACTION'
                )
                return Response({'success': True, 'message': 'Updated successfully'})
            return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        except SavingsGoals.DoesNotExist:
            return Response({'success': False, 'message': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    @extend_schema(responses={200: None})
    @action(detail=False, methods=['delete'], url_path='delete/(?P<goal_id>[^/.]+)')
    def delete_goal(self, request, goal_id=None):
        try:
            goal = SavingsGoals.objects.get(goal_id=goal_id, user=request.user)
            ActivityLogService.log(
                request,
                action='DELETE_SAVING_GOAL',
                details=f'User deleted saving goal: {goal.goal_name}',
                level='ACTION'
            )
            goal.delete()
            return Response({'success': True, 'message': 'Goal deleted successfully'}, status=status.HTTP_200_OK)
        except SavingsGoals.DoesNotExist:
            return Response({'success': False, 'message': 'Goal not found'}, status=status.HTTP_404_NOT_FOUND)