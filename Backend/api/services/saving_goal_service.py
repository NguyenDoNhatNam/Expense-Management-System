from django.db import transaction as db_transaction
from django.utils import timezone
from uuid import uuid4
from api.models import SavingsGoals

class SavingGoalService:
    @staticmethod
    def get_goals(user):
        return SavingsGoals.objects.filter(user=user).order_by('-created_at')

    @staticmethod
    def create_goal(validated_data, user):
        with db_transaction.atomic():
            goal_id = f'GOAL-{str(uuid4())[:15]}'
            goal = SavingsGoals.objects.create(
                goal_id=goal_id,
                user=user,
                goal_name=validated_data['goal_name'],
                target_amount=validated_data['target_amount'],
                current_amount=0, # Khởi tạo mặc định = 0
                target_date=validated_data['target_date'],
                description=validated_data.get('description', ''),
                priority=validated_data.get('priority', 'medium'),
                status='active',
                created_at=timezone.now(),
                updated_at=timezone.now()
            )
        return goal

    @staticmethod
    def update_goal(goal_obj, validated_data):
        with db_transaction.atomic():
            for key, value in validated_data.items():
                setattr(goal_obj, key, value)
            
            # Auto Check hoàn thành
            if goal_obj.current_amount >= goal_obj.target_amount:
                goal_obj.status = 'completed'
            elif goal_obj.status == 'completed' and goal_obj.current_amount < goal_obj.target_amount:
                goal_obj.status = 'active'
                
            goal_obj.updated_at = timezone.now()
            goal_obj.save()
        return goal_obj

    @staticmethod
    def delete_goal(goal_obj):
        goal_obj.delete() # Hard delete hoặc cập nhật status = 'cancelled' tùy nghiệp vụ