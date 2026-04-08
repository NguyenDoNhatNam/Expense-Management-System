from rest_framework import serializers
from api.models import SavingsGoals
from django.utils import timezone

class SavingGoalListSerializer(serializers.ModelSerializer):
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = SavingsGoals
        fields = '__all__'

    def get_progress_percentage(self, obj):
        if obj.target_amount and obj.target_amount > 0:
            return min(round((obj.current_amount / obj.target_amount) * 100, 1), 100.0)
        return 0

class CreateSavingGoalSerializer(serializers.Serializer):
    goal_name = serializers.CharField(max_length=200, required=True)
    target_amount = serializers.DecimalField(max_digits=18, decimal_places=2, required=True)
    target_date = serializers.DateField(required=True)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    priority = serializers.ChoiceField(choices=['low', 'medium', 'high'], default='medium')

    def validate_target_amount(self, value):
        if value <= 0: raise serializers.ValidationError("Target amount must be greater than 0")
        return value

    def validate_target_date(self, value):
        if value <= timezone.now().date(): raise serializers.ValidationError("Target completion date must be in the future")
        return value

class UpdateSavingGoalSerializer(serializers.Serializer):
    goal_name = serializers.CharField(max_length=200, required=False)
    target_amount = serializers.DecimalField(max_digits=18, decimal_places=2, required=False)
    current_amount = serializers.DecimalField(max_digits=18, decimal_places=2, required=False)
    target_date = serializers.DateField(required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    priority = serializers.ChoiceField(choices=['low', 'medium', 'high'], required=False)
    
    # Can validate dates similarly if needed