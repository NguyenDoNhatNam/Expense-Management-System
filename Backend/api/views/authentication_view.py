from django.shortcuts import render
from rest_framework import viewsets
from api.serializers.authentication_serializer import UserSerializer , UserRegistrationSerializer , UserLoginSerializer , AccountSerializer , CategorySerializer , UserSettingSerializer ,VerifyOTPSerializer, ResendOTPSerializer, ForgotPasswordSerializer, ResetPasswordOTPSerializer, ResetPasswordLinkSerializer
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
from drf_spectacular.utils import extend_schema
from drf_spectacular.utils import OpenApiResponse
from django.db import transaction as db_transaction
from api.services.otp_service import OTPService
from api.services.email_token_service import EmailTokenService
from api.services.activity_log_service import ActivityLogService
from rest_framework.throttling import AnonRateThrottle
from django.contrib.auth.hashers import make_password
from api.tasks import send_verification_link_email

class UserViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    
    @extend_schema(
        request=UserRegistrationSerializer,
        responses={
            201: OpenApiResponse(
                description="Register successful"
            )
        }
    )
    @action(detail=False , methods=['post'] , url_path='register')
    def user_registration(self ,request , *args , **kwargs):
        serializer = UserRegistrationSerializer(data = request.data)
        if serializer.is_valid(raise_exception = True):
            user = serializer.save()
            user.is_active = False
            user.save(update_fields=['is_active'])
            
            OTPService.send_activation_otp(user)

            # Log user registration
            ActivityLogService.log_simple(
                user=user,
                action='REGISTER',
                details=f'User {user.email} registered successfully',
                level=ActivityLogService.LEVEL_INFO,
                ip_address=ActivityLogService._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )

            user_data = UserSerializer(user).data
            return Response({
                'success': True , 
                'data' : {
                    'user': user_data , 
                    'account': AccountSerializer(user.default_account).data,
                    'categories': CategorySerializer(user.default_categories, many=True).data,
                    'setting': UserSettingSerializer(user.default_setting).data,
                },
                'message': 'Tài khoản đã được tạo thành công. Vui lòng kiểm tra email để lấy mã OTP kích hoạt tài khoản.'
            }, status = status.HTTP_201_CREATED)
        return Response({
            'success' : False ,
            'error' : serializer.errors , 
            'message' : 'Đăng ký thất bại'
        }, status = status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
            request=UserLoginSerializer,
            responses={
                200: OpenApiResponse(
                    description="Login successful"
                )
            }
        )
    @action(detail=False, methods=['post'], url_path='login')
    def user_login(self, request, *args, **kwargs):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            user = serializer.validated_data['user']

            if not user.is_active:
                return Response({
                    'success': False,
                    'message': 'Tài khoản chưa được kích hoạt. Vui lòng xác thực email.',
                    'require_activation': True
                }, status=status.HTTP_403_FORBIDDEN)

            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])

            tokens = get_tokens_for_user(user)
            remember_me = request.data.get('remember_me', False)
            
            response_data = {
                'success': True,
                'data': {
                    'user': UserSerializer(user).data,
                    'access_token': tokens['access'],
                    'refresh_token': tokens['refresh'],  # Always include refresh token
                },
                'message': 'Đăng nhập thành công'
            }

            # Log successful login
            ActivityLogService.log_simple(
                user=user,
                action=ActivityLogService.LOGIN_SUCCESS,
                details=f'User {user.email} logged in successfully',
                level=ActivityLogService.LEVEL_INFO,
                ip_address=ActivityLogService._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )

            response = Response(response_data, status=status.HTTP_200_OK)

            # Set refresh token as httpOnly cookie (more secure, browser handles it)
            if remember_me:
                refresh = RefreshToken(tokens['refresh'])
                refresh.set_exp(lifetime=settings.SIMPLE_JWT.get('REFRESH_TOKEN_LIFETIME_REMEMBER_ME', timedelta(days=90)))
                
                response.set_cookie(
                    key='refresh_token',
                    value=str(refresh),
                    httponly=True,
                    secure=not settings.DEBUG,  
                    samesite='Lax',
                    max_age=90 * 24 * 3600,  # 90 days
                    path='/',
                )
            else:
                # For non-remember_me, set a shorter-lived cookie
                response.set_cookie(
                    key='refresh_token',
                    value=tokens['refresh'],
                    httponly=True,
                    secure=not settings.DEBUG,
                    samesite='Lax',
                    max_age=7 * 24 * 3600,  # 7 days (matches REFRESH_TOKEN_LIFETIME)
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

    @extend_schema(
        request=VerifyOTPSerializer,
        responses={200: OpenApiResponse(description="Verify OTP successful")}
    )
    @action(detail=False, methods=['post'], url_path='verify-activation', throttle_classes=[AnonRateThrottle])
    def verify_activation(self, request, *args, **kwargs):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            email = serializer.validated_data['email']
            code = serializer.validated_data['code']
            try:
                with db_transaction.atomic():
                    user = Users.objects.select_for_update().get(email=email)
                    if user.is_active:
                        return Response({'success': False, 'message': 'Tài khoản đã được kích hoạt trước đó.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    if OTPService.verify_otp(user, code, 'activation'):
                        user.is_active = True
                        user.save(update_fields=['is_active'])
                        
                        # Log account activation
                        ActivityLogService.log_simple(
                            user=user,
                            action='ACCOUNT_ACTIVATED',
                            details=f'User {user.email} activated their account',
                            level=ActivityLogService.LEVEL_INFO,
                            ip_address=ActivityLogService._get_client_ip(request),
                            user_agent=request.META.get('HTTP_USER_AGENT', '')
                        )
                        
                        return Response({'success': True, 'message': 'Kích hoạt tài khoản thành công. Bạn có thể đăng nhập ngay bây giờ.'}, status=status.HTTP_200_OK)
                    else:
                        return Response({'success': False, 'message': 'Mã OTP không hợp lệ hoặc đã hết hạn.'}, status=status.HTTP_400_BAD_REQUEST)
            except Users.DoesNotExist:
                return Response({'success': False, 'message': 'Tài khoản không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=ResendOTPSerializer,
        responses={200: OpenApiResponse(description="Resend OTP successful")}
    )
    @action(detail=False, methods=['post'], url_path='resend-otp', throttle_classes=[AnonRateThrottle])
    def resend_otp(self, request, *args, **kwargs):
        serializer = ResendOTPSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            email = serializer.validated_data['email']
            otp_type = serializer.validated_data['otp_type']
            try:
                user = Users.objects.get(email=email)
                if otp_type == 'activation' and user.is_active:
                    return Response({'success': False, 'message': 'Tài khoản đã được kích hoạt.'}, status=status.HTTP_400_BAD_REQUEST)
                
                if otp_type == 'activation':
                    OTPService.send_activation_otp(user)
                elif otp_type == 'reset_password':
                    OTPService.send_reset_password_otp(user)
            except Users.DoesNotExist:
                pass
            return Response({'success': True, 'message': 'Nếu email hợp lệ, mã OTP mới sẽ được gửi tới hòm thư của bạn.'}, status=status.HTTP_200_OK)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=ForgotPasswordSerializer,
        responses={200: OpenApiResponse(description="Forgot password successful")}
    )
    @action(detail=False, methods=['post'], url_path='forgot-password', throttle_classes=[AnonRateThrottle])
    def forgot_password(self, request, *args, **kwargs):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            email = serializer.validated_data['email']
            method = serializer.validated_data['method']
            try:
                user = Users.objects.get(email=email)
                if user.is_active:
                    if method == 'otp':
                        OTPService.send_reset_password_otp(user)
                    elif method == 'link':
                        token = EmailTokenService.create_token(user.user_id, 'reset_password', expiry_hours=1)
                        send_verification_link_email.delay(
                            user_email=user.email,
                            user_name=user.full_name,
                            token=token,
                            token_type='reset_password'
                        )
            except Users.DoesNotExist:
                pass
            return Response({'success': True, 'message': 'Nếu email hợp lệ, hướng dẫn lấy lại mật khẩu sẽ được gửi.'}, status=status.HTTP_200_OK)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=ResetPasswordOTPSerializer,
        responses={200: OpenApiResponse(description="Reset password via OTP successful")}
    )
    @action(detail=False, methods=['post'], url_path='reset-password-otp', throttle_classes=[AnonRateThrottle])
    def reset_password_otp(self, request, *args, **kwargs):
        serializer = ResetPasswordOTPSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            email = serializer.validated_data['email']
            code = serializer.validated_data['code']
            new_password = serializer.validated_data['new_password']
            try:
                with db_transaction.atomic():
                    user = Users.objects.select_for_update().get(email=email)
                    if OTPService.verify_otp(user, code, 'reset_password'):
                        user.password = make_password(new_password)
                        user.save(update_fields=['password'])
                        return Response({'success': True, 'message': 'Mật khẩu đã được đặt lại thành công.'}, status=status.HTTP_200_OK)
                    else:
                        return Response({'success': False, 'message': 'Mã OTP không hợp lệ hoặc đã hết hạn.'}, status=status.HTTP_400_BAD_REQUEST)
            except Users.DoesNotExist:
                return Response({'success': False, 'message': 'Thông tin không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=ResetPasswordLinkSerializer,
        responses={200: OpenApiResponse(description="Reset password via link successful")}
    )
    @action(detail=False, methods=['post'], url_path='reset-password-link', throttle_classes=[AnonRateThrottle])
    def reset_password_link(self, request, *args, **kwargs):
        serializer = ResetPasswordLinkSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            token = serializer.validated_data['token']
            new_password = serializer.validated_data['new_password']
            
            with db_transaction.atomic():
                user = EmailTokenService.verify_token(token, 'reset_password')
                if user:
                    user.password = make_password(new_password)
                    user.save(update_fields=['password'])
                    return Response({'success': True, 'message': 'Mật khẩu đã được đặt lại thành công.'}, status=status.HTTP_200_OK)
                else:
                    return Response({'success': False, 'message': 'Token không hợp lệ hoặc đã hết hạn.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        responses={200: OpenApiResponse(description="Logout successful")}
    )
    @action(detail=False, methods=['post'], url_path='logout', permission_classes=[IsAuthenticated])
    def user_logout(self, request, *args, **kwargs):
        """Logout user and invalidate refresh token."""
        try:
            # Get user before invalidating
            user = request.user
            
            # Log logout activity
            ActivityLogService.log(
                request,
                action=ActivityLogService.LOGOUT,
                details=f'User {user.email} logged out'
            )
            
            # Invalidate refresh token from cookie
            refresh_token = request.COOKIES.get('refresh_token')
            if refresh_token:
                try:
                    refresh = RefreshToken(refresh_token)
                    jti = refresh.get('jti')
                    exp_time = refresh.payload.get('exp')
                    current_time = timezone.now().timestamp()
                    left_time = max(int(exp_time - current_time), 0)
                    cache.set(f"blacklist_{jti}", True, timeout=left_time)
                except Exception:
                    pass
            
            response = Response({
                'success': True,
                'message': 'Đăng xuất thành công'
            }, status=status.HTTP_200_OK)
            response.delete_cookie('refresh_token')
            return response
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Đăng xuất thất bại: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
            
