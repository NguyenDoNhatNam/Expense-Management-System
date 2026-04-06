"""
Activity Log Serializers
"""
from rest_framework import serializers
from api.models import ActivityLogs


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer cho activity log list."""
    
    user_id = serializers.CharField(source='user.user_id', read_only=True, allow_null=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True, allow_null=True)
    user_email = serializers.CharField(source='user.email', read_only=True, allow_null=True)
    user_avatar = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)
    
    class Meta:
        model = ActivityLogs
        fields = [
            'activity_id', 'user_id', 'user_name', 'user_email', 'user_avatar',
            'action', 'level', 'details',
            'entity_type', 'entity_id',
            'ip_address', 'device', 'browser', 'os', 'current_page',
            'status', 'error_message', 'timestamp'
        ]
    
    def get_user_avatar(self, obj):
        """Generate avatar initials from user name."""
        if obj.user:
            if obj.user.avatar_url:
                return obj.user.avatar_url
            if obj.user.full_name:
                parts = obj.user.full_name.split()
                if len(parts) >= 2:
                    return f"{parts[0][0]}{parts[-1][0]}".upper()
                return obj.user.full_name[:2].upper()
        return 'U'


class ActivityLogDetailSerializer(ActivityLogSerializer):
    """Serializer chi tiết cho activity log."""
    
    old_values = serializers.JSONField(read_only=True, allow_null=True)
    new_values = serializers.JSONField(read_only=True, allow_null=True)
    
    class Meta(ActivityLogSerializer.Meta):
        fields = ActivityLogSerializer.Meta.fields + ['old_values', 'new_values', 'user_agent']


class ActivityLogStatsSerializer(serializers.Serializer):
    """Serializer cho thống kê activity."""
    
    active_users = serializers.IntegerField()
    total_online = serializers.IntegerField()
    actions_today = serializers.IntegerField()
    warnings = serializers.IntegerField()
    errors = serializers.IntegerField()
    top_users = serializers.ListField(
        child=serializers.DictField()
    )


class UserDetailFromActivitySerializer(serializers.Serializer):
    """Serializer cho user detail lấy từ activity logs."""
    
    user = serializers.DictField()
    is_online = serializers.BooleanField()
    last_active = serializers.DateTimeField(allow_null=True)
    current_page = serializers.CharField(allow_null=True)
    device = serializers.CharField(allow_null=True)
    browser = serializers.CharField(allow_null=True)
    os = serializers.CharField(allow_null=True)
    ip_address = serializers.CharField(allow_null=True)
    recent_logs = ActivityLogSerializer(many=True)
