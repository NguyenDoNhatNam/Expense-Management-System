from rest_framework import serializers 
from api.models import Users , Accounts , Categories , UserSetting  
from uuid import uuid4
import re 
from django.contrib.auth.hashers import make_password , check_password
from django.utils import timezone
class UserSerializer(serializers.ModelSerializer):
    class Meta: 
        model = Users
        fields = ['user_id' ,'email' , 'full_name','phone' ,'avatar_url' ,'default_currency', 'created_at' , 'is_active']
        read_only_fields = ['user_id' , 'created_at']

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Accounts
        fields = ['account_id' , 'account_name', 'account_type' , 'is_include_in_total','balance' , 'currency' , 'created_at']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Categories
        fields = ['category_id', 'category_name', 'category_type', 'icon', 'color', 'is_default', 'created_at']


class UserSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSetting
        fields = ['setting_id', 'language', 'date_format', 'enabale_notification', 'budget_alert_enabled', 'weekly_report_enabled', 'monthly_report_enabled', 'theme', 'created_at']

class UserRegistrationSerializer(serializers.Serializer): 
    email = serializers.CharField(required=True)
    password = serializers.CharField(write_only = True , required = True , min_length = 8) 
    full_name = serializers.CharField(required=True , max_length = 255)
    phone = serializers.CharField(required=True , max_length = 20)

    def validate_email(self , value) : 
        pattern = r'^[a-zA-Z0-9]+([._%+-]?[a-zA-Z0-9]+)*@[a-zA-Z0-9]+(-?[a-zA-Z0-9]+)*(\.[a-zA-Z]{2,})+$'
        if not re.match(pattern , value): 
            raise serializers.ValidationError('Invalid email format')
        elif Users.objects.filter(email = value).exists(): 
            raise serializers.ValidationError('Email đã được sử dụng')
        return value
    
    def validate_phone(self , value):
        pattern = r'^(\+84|0084|0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-46-9])(\d{7})$'
        if not re.match(pattern, value):
            raise serializers.ValidationError('Số điện thoại không đúng định dạng')
        elif Users.objects.filter(phone = value).exists():
            raise serializers.ValidationError('Số điện thoại đã được sử dụng')
        return value

    
    def validate_password(self , value):
        pattern = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
        if len(value) < 8:
            raise serializers.ValidationError('Mật khẩu phải có độ dài tối thiểu 8 ký tự')
        elif not re.match(pattern , value):
            raise serializers.ValidationError('Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường, một số và một ký tự đặc biệt (@$!%*?&)')
        
        return value



    def create(self , validated_data):
        while True:
            split_uuid = str(uuid4())[:10]
            user_id = f'US-{split_uuid}'
            if not Users.objects.filter(user_id = user_id).exists():
                break
        
        user= Users.objects.create(
            user_id = user_id , 
            email = validated_data['email'] ,
            password = make_password(validated_data['password']) , 
            full_name = validated_data['full_name'] , 
            phone = validated_data['phone'] , 
            avatar_url = validated_data.get('avatar_url' , '') ,
            default_currency = validated_data.get('default_currency' , 'VNĐ') ,
            is_active = True ,
            created_at = timezone.now()
        )

        # Tạo tài khoản tiền mặt mặc định trong account
        account = Accounts.objects.create(
            account_id = f'AC-{str(uuid4())[:15]}', 
            user = user , 
            account_name = 'Ví tiền mặt', 
            account_type = 'cash' , 
            balance = 0 , 
            currency = user.default_currency , 
            is_include_in_total = True , 
            created_at = timezone.now()
        )

        ### Tạo danh mục mặc đinh trong category ##### 
        default_categories = [
            {'name': 'Ăn uống', 'type': 'expense', 'icon': '🍔', 'color': '#FF6B6B'},
            {'name': 'Di chuyển', 'type': 'expense', 'icon': '🚗', 'color': '#4ECDC4'},
            {'name': 'Mua sắm', 'type': 'expense', 'icon': '🛒', 'color': '#45B7D1'},
            {'name': 'Giải trí', 'type': 'expense', 'icon': '🎬', 'color': '#96CEB4'},
            {'name': 'Hóa đơn', 'type': 'expense', 'icon': '📄', 'color': '#FFEAA7'},
            {'name': 'Lương', 'type': 'income', 'icon': '💰', 'color': '#00B894'},
            {'name': 'Thưởng', 'type': 'income', 'icon': '🎁', 'color': '#6C5CE7'},
            {'name': 'Đầu tư', 'type': 'income', 'icon': '📈', 'color': '#A29BFE'},
        ]
        categories = []

        for category in default_categories:
            category = Categories.objects.create(
                category_id = f'CAT-{str(uuid4())[:15]}',
                user= user , 
                category_name = category['name'] , 
                category_type = category['type'] , 
                icon = category['icon'],
                color = category['color'] , 
                created_at = timezone.now(),
                is_default = True 
            )
            categories.append(category)

        ### Tạo cài đặt mặc định
        user_setting = UserSetting.objects.create(
            setting_id = f'SET-{str(uuid4())[:15]}' , 
            user = user , 
            language = 'vi' , 
            date_format = 'DD/MM/YYYY' , 
            enabale_notification = True , 
            budget_alert_enabled = True , 
            weekly_report_enabled = False , 
            monthly_report_enabled = False , 
            theme = 'light', 
            created_at = timezone.now()
        )

        user.default_account = account 
        user.default_categories = categories
        user.default_setting = user_setting
        return user

class UserLoginSerializer(serializers.Serializer):
    email = serializers.CharField(required=True)
    password = serializers.CharField(write_only = True , required = True, min_length = 8)

    def validate(self , data):
        email = data['email'] 
        password = data['password'] 

        email_pattern = r'^[a-zA-Z0-9]+([._%+-]?[a-zA-Z0-9]+)*@[a-zA-Z0-9]+(-?[a-zA-Z0-9]+)*(\.[a-zA-Z]{2,})+$'
        if not re.match(email_pattern , email):
            raise serializers.ValidationError('Format email không hợp lệ')
        try: 
            user = Users.objects.get(email = email)
        except Users.DoesNotExist:
            raise serializers.ValidationError('Email không tồn tại')
        
        if not check_password(password , user.password): 
            raise serializers.ValidationError('Email hoặc mật khâir không đúng , vui lòng thử lại')
        
        if not user.is_active:
            raise serializers.ValidationError('Tài khoản không hoạt động , vui lòng liên hệ bộ phận hỗ trợ')
        
        data['user'] = user
        return data