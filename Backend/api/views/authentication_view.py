from django.shortcuts import render
from rest_framework import viewsets
from api.serializers.authentication_serializer import UserSerializer , UserRegistrationSerializer , UserLoginSerializer , AccountSerializer , CategorySerializer , UserSettingSerializer
from api.models import Users
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action , permission_classes 
from api.authentication import get_tokens_for_user
from rest_framework.permissions import AllowAny , IsAuthenticated
from django.utils import timezone
from datetime import timedelta 
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.cache import cache
class UserViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    
    @action(detail=False , methods=['post'] , url_path='register')
    def user_registration(self ,request , *args , **kwargs):
        serializer = UserRegistrationSerializer(data = request.data)
        if serializer.is_valid(raise_exception = True):
            user = serializer.save()
            token = get_tokens_for_user(user)
            user_data = UserSerializer(user).data
            return Response({
                'success': True , 
                'data' : {
                    'user': user_data , 
                    'account': AccountSerializer(user.default_account).data,
                    'categories': CategorySerializer(user.default_categories, many=True).data,
                    'setting': UserSettingSerializer(user.default_setting).data,
                    'access_token' : token['access'], 
                    'refresh_token' : token['refresh'] ,
                },
                'message': 'Tài khoản đã được tạo thành công'
            }, status = status.HTTP_201_CREATED)
        return Response({
            'success' : False ,
            'error' : serializer.errors , 
            'message' : 'Đăng ký thất bại'
        }, status = status.HTTP_400_BAD_REQUEST)
    

    @action(detail=False, methods=['post'], url_path='login')
    def user_login(self, request, *args, **kwargs):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            user = serializer.validated_data['user']

            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])

            tokens = get_tokens_for_user(user)
            remember_me = request.data.get('remember_me', False)
            
            response_data = {
                'success': True,
                'data': {
                    'user': UserSerializer(user).data,
                    'access_token': tokens['access'],
                    # Không trả refresh trong JSON (an toàn hơn khi dùng cookie)
                },
                'message': 'Đăng nhập thành công'
            }

            response = Response(response_data, status=status.HTTP_200_OK)

            if remember_me:
            
                refresh = RefreshToken(tokens['refresh'])
                refresh.set_exp(lifetime=settings.SIMPLE_JWT.get('REFRESH_TOKEN_LIFETIME_REMEMBER_ME', timedelta(days=90)))

                response.set_cookie(
                    key='refresh_token',
                    value=str(refresh),
                    httponly=True,
                    secure=not settings.DEBUG,  
                    samesite='Lax',
                    max_age=90 * 24 * 3600,  
                    path='/',
                )

            return response
            
        return Response({
            'success' : False ,
            'error' : serializer.errors ,
            'message' : 'Đăng nhập thất bại'
        } , status = status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='refresh')
    def refresh_token(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')

        if not refresh_token:
            return Response({
                'success': False,
                'message': 'Không tìm thấy refresh token'
            }, status=status.HTTP_401_UNAUTHORIZED)

        try:
            refresh = RefreshToken(refresh_token)
            jti = refresh.get('jti')
            if cache.get(f"blacklist_{jti}"):
                return Response({'error': 'Token đã bị thu hồi (Blacklisted)'}, status=status.HTTP_401_UNAUTHORIZED)
            user_id = refresh['user_id']
            user = Users.objects.get(user_id=user_id)

            if not user.is_active:
                return Response({
                    'success': False,
                    'message': 'Tài khoản đã bị khóa'
                }, status=status.HTTP_401_UNAUTHORIZED)
            exp_time = refresh.payload.get('exp')
            current_time = timezone.now().timestamp()
            left_time = max(int(exp_time - current_time), 0)
            cache.set(f"blacklist_{jti}", True, timeout=left_time)


            new_access = str(refresh.access_token)

            # Rotate refresh token
            new_refresh = RefreshToken.for_user(user)
            new_refresh['user_id'] = user.user_id
            new_refresh.set_exp(lifetime=timedelta(seconds=left_time))
            response = Response({
                'success': True,
                'data': {
                    'access_token': new_access,
                },
                'message': 'Làm mới token thành công'
            })

            response.set_cookie(
                key='refresh_token',
                value=str(new_refresh),
                httponly=True,
                secure=not settings.DEBUG,
                samesite='Lax',
                max_age=left_time,
                path='/'
            )

            return response

        except Exception as e:
            response = Response({
                'success': False,
                'message': f'Phiên đăng nhập hết hạn: {str(e)}'
            }, status=401)
            response.delete_cookie('refresh_token')
            return response
            
