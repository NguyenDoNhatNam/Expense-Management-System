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
from django.contrib.auth.hashers import make_password, check_password
from api.tasks import send_verification_link_email

ADMIN_LOGIN_MAX_ATTEMPTS = 5
ADMIN_LOGIN_WINDOW_SECONDS = 10 * 60
ADMIN_LOGIN_LOCK_SECONDS = 10 * 60
ADMIN_LOGIN_ERROR_MESSAGE = 'Email hoặc mật khẩu không đúng'


def _normalize_email(email):
    return (email or '').strip().lower()


def _get_admin_attempt_key(email):
    return f'admin_login_attempts:{_normalize_email(email)}'


def _get_admin_lock_key(email):
    return f'admin_login_lock:{_normalize_email(email)}'


def _is_admin_role(user):
    role_name = user.role.role_name if user and user.role else ''
    return role_name in ['admin', 'super_admin']


def _get_ip_and_device(request):
    ip = request.META.get('HTTP_X_FORWARDED_FOR')
    if ip:
        ip = ip.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', 'Unknown')
    user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
    return ip, user_agent


def _build_admin_access_token(user):
    refresh = RefreshToken.for_user(user)
    refresh['user_id'] = user.user_id
    access_token = refresh.access_token
    access_token.set_exp(lifetime=timedelta(minutes=30))
    return str(access_token)


def _register_admin_failed_attempt(email):
    attempt_key = _get_admin_attempt_key(email)
    lock_key = _get_admin_lock_key(email)

    attempts = cache.get(attempt_key, 0) + 1
    cache.set(attempt_key, attempts, timeout=ADMIN_LOGIN_WINDOW_SECONDS)

    if attempts >= ADMIN_LOGIN_MAX_ATTEMPTS:
        cache.set(lock_key, True, timeout=ADMIN_LOGIN_LOCK_SECONDS)
        cache.delete(attempt_key)
        return True
    return False


def _clear_admin_failed_attempts(email):
    cache.delete(_get_admin_attempt_key(email))
    cache.delete(_get_admin_lock_key(email))


def _log_user_event(user, request, action, details, level=ActivityLogService.LEVEL_INFO):
    ip, user_agent = _get_ip_and_device(request)
    ActivityLogService.log_simple(
        user=user,
        action=action,
        details=details,
        level=level,
        ip_address=ip,
        user_agent=user_agent,
    )


def _log_request_event(request, action, details, level=ActivityLogService.LEVEL_INFO, status='success', error_message=None):
    ActivityLogService.log(
        request,
        action,
        details=details,
        level=level,
        status=status,
        error_message=error_message,
    )

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

            _log_user_event(
                user=user,
                request=request,
                action='REGISTER',
                details=f'User {user.email} registered successfully',
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
                'message': 'Account created successfully. Please check your email for the OTP activation code.'
            }, status = status.HTTP_201_CREATED)
        return Response({
            'success' : False ,
            'error' : serializer.errors , 
            'message' : 'Registration failed'
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
                    'message': 'Account not activated. Please verify your email.',
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
                    # Do not return refresh in JSON (safer to use cookie)
                },
                'message': 'Login successful'
            }

            _log_user_event(
                user=user,
                request=request,
                action='LOGIN',
                details=f'User {user.email} logged in successfully',
            )

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
            'message' : 'Login failed'
        } , status = status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'email': {'type': 'string', 'format': 'email'},
                    'password': {'type': 'string'}
                },
                'required': ['email', 'password']
            }
        },
        responses={200: OpenApiResponse(description='Admin login successful')}
    )
    @action(detail=False, methods=['post'], url_path='admin-login')
    def admin_login(self, request, *args, **kwargs):
        email = _normalize_email(request.data.get('email'))
        password = request.data.get('password') or ''
        ip, user_agent = _get_ip_and_device(request)

        if not email or not password:
            ActivityLogService.log(
                request,
                ActivityLogService.LOGIN_FAILED,
                details=f'Admin login failed from IP {ip}. Missing email or password.',
                status='failed',
                error_message='Missing credentials',
            )
            return Response({'success': False, 'message': ADMIN_LOGIN_ERROR_MESSAGE}, status=status.HTTP_401_UNAUTHORIZED)

        if cache.get(_get_admin_lock_key(email)):
            ActivityLogService.log(
                request,
                ActivityLogService.LOGIN_FAILED,
                details=f'Admin login blocked for {email} from IP {ip}. Account temporarily locked.',
                status='failed',
                error_message='Account temporarily locked due to too many failed attempts',
            )
            return Response({'success': False, 'message': ADMIN_LOGIN_ERROR_MESSAGE}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            user = Users.objects.select_related('role').get(email=email)
        except Users.DoesNotExist:
            _register_admin_failed_attempt(email)
            ActivityLogService.log(
                request,
                ActivityLogService.LOGIN_FAILED,
                details=f'Admin login failed for {email} from IP {ip}. Account not found.',
                status='failed',
                error_message='Account not found',
            )
            return Response({'success': False, 'message': ADMIN_LOGIN_ERROR_MESSAGE}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            _register_admin_failed_attempt(email)
            ActivityLogService.log_simple(
                user,
                ActivityLogService.LOGIN_FAILED,
                details=f'Admin login failed for {email} from IP {ip}. Account inactive.',
                ip_address=ip,
                user_agent=user_agent,
            )
            return Response({'success': False, 'message': ADMIN_LOGIN_ERROR_MESSAGE}, status=status.HTTP_401_UNAUTHORIZED)

        if not _is_admin_role(user):
            _register_admin_failed_attempt(email)
            ActivityLogService.log_simple(
                user,
                ActivityLogService.LOGIN_FAILED,
                details=f'Admin login denied for {email} from IP {ip}. Role is not admin.',
                ip_address=ip,
                user_agent=user_agent,
            )
            return Response({'success': False, 'message': ADMIN_LOGIN_ERROR_MESSAGE}, status=status.HTTP_401_UNAUTHORIZED)

        if not check_password(password, user.password):
            account_locked = _register_admin_failed_attempt(email)
            fail_detail = f'Admin login failed for {email} from IP {ip}. Incorrect password.'
            if account_locked:
                fail_detail += ' Account locked for 10 minutes.'

            ActivityLogService.log_simple(
                user,
                ActivityLogService.LOGIN_FAILED,
                details=fail_detail,
                ip_address=ip,
                user_agent=user_agent,
            )
            return Response({'success': False, 'message': ADMIN_LOGIN_ERROR_MESSAGE}, status=status.HTTP_401_UNAUTHORIZED)

        _clear_admin_failed_attempts(email)
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        access_token = _build_admin_access_token(user)

        ActivityLogService.log_simple(
            user,
            ActivityLogService.LOGIN_SUCCESS,
            details=f'Admin {email} đã đăng nhập thành công từ IP {ip}, thiết bị {user_agent[:180]}',
            ip_address=ip,
            user_agent=user_agent,
        )

        return Response({
            'success': True,
            'data': {
                'user': {
                    'user_id': user.user_id,
                    'email': user.email,
                    'full_name': user.full_name,
                    'phone': user.phone,
                    'avatar_url': user.avatar_url,
                    'default_currency': user.default_currency,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'is_active': user.is_active,
                    'role': user.role.role_name if user.role else 'user',
                },
                'access_token': access_token,
                'expires_in': 30 * 60,
            },
            'message': 'Admin login successful'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], url_path='refresh')
    def refresh_token(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')

        if not refresh_token:
            return Response({
                'success': False,
                'message': 'Refresh token not found'
            }, status=status.HTTP_401_UNAUTHORIZED)

        try:
            refresh = RefreshToken(refresh_token)
            jti = refresh.get('jti')
            if cache.get(f"blacklist_{jti}"):
                return Response({'error': 'Token has been revoked (Blacklisted)'}, status=status.HTTP_401_UNAUTHORIZED)
            user_id = refresh['user_id']
            user = Users.objects.get(user_id=user_id)

            if not user.is_active:
                return Response({
                    'success': False,
                    'message': 'Account has been locked'
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
                'message': 'Token refreshed successfully'
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
                'message': f'Session expired: {str(e)}'
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
                        _log_user_event(
                            user=user,
                            request=request,
                            action='VERIFY_ACTIVATION_SKIPPED',
                            details=f'User {user.email} attempted activation but account is already active',
                            level=ActivityLogService.LEVEL_WARNING,
                        )
                        return Response({'success': False, 'message': 'Account has already been activated.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    if OTPService.verify_otp(user, code, 'activation'):
                        user.is_active = True
                        user.save(update_fields=['is_active'])
                        _log_user_event(
                            user=user,
                            request=request,
                            action='VERIFY_ACTIVATION',
                            details=f'User {user.email} verified activation successfully',
                        )
                        return Response({'success': True, 'message': 'Account activated successfully. You can now log in.'}, status=status.HTTP_200_OK)
                    else:
                        _log_user_event(
                            user=user,
                            request=request,
                            action='VERIFY_ACTIVATION_FAILED',
                            details=f'User {user.email} failed activation verification due to invalid/expired OTP',
                            level=ActivityLogService.LEVEL_WARNING,
                        )
                        return Response({'success': False, 'message': 'Invalid or expired OTP code.'}, status=status.HTTP_400_BAD_REQUEST)
            except Users.DoesNotExist:
                _log_request_event(
                    request=request,
                    action='VERIFY_ACTIVATION_FAILED',
                    details=f'Activation verification failed because account {email} was not found',
                    level=ActivityLogService.LEVEL_WARNING,
                    status='failed',
                    error_message='Account not found',
                )
                return Response({'success': False, 'message': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)
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
            method = serializer.validated_data.get('method', 'email')

            try:
                user = Users.objects.get(email=email)
                if otp_type == 'activation' and user.is_active:
                    _log_user_event(
                        user=user,
                        request=request,
                        action='RESEND_OTP_SKIPPED',
                        details=f'User {user.email} requested activation OTP but account is already active',
                        level=ActivityLogService.LEVEL_WARNING,
                    )
                    return Response({'success': False, 'message': 'Account has already been activated.'}, status=status.HTTP_400_BAD_REQUEST)
                if method == 'sms':
                    if not user.phone:
                        _log_user_event(
                            user=user,
                            request=request,
                            action='RESEND_OTP_FAILED',
                            details=f'User {user.email} requested SMS OTP but has no phone number',
                            level=ActivityLogService.LEVEL_WARNING,
                        )
                        return Response({'success': False, 'message': 'Account does not have a phone number.'}, status=status.HTTP_400_BAD_REQUEST)
                    OTPService.send_activation_sms_otp(user)
                elif otp_type == 'activation':
                    OTPService.send_activation_otp(user)
                elif otp_type == 'reset_password':
                    OTPService.send_reset_password_otp(user)

                _log_user_event(
                    user=user,
                    request=request,
                    action='RESEND_OTP',
                    details=f'User {user.email} requested OTP resend via {method} for {otp_type}',
                )
            except Users.DoesNotExist:
                _log_request_event(
                    request=request,
                    action='RESEND_OTP',
                    details=f'OTP resend requested for non-existent email {email}',
                )
            return Response({'success': True, 'message': 'If the email is valid, a new OTP code will be sent.'}, status=status.HTTP_200_OK)
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
                        _log_user_event(
                            user=user,
                            request=request,
                            action='FORGOT_PASSWORD_OTP',
                            details=f'User {user.email} requested password reset OTP',
                        )
                    elif method == 'link':
                        token = EmailTokenService.create_token(user.user_id, 'reset_password', expiry_hours=1)
                        send_verification_link_email.delay(
                            user_email=user.email,
                            user_name=user.full_name,
                            token=token,
                            token_type='reset_password'
                        )
                        _log_user_event(
                            user=user,
                            request=request,
                            action='FORGOT_PASSWORD_LINK',
                            details=f'User {user.email} requested password reset link',
                        )
            except Users.DoesNotExist:
                _log_request_event(
                    request=request,
                    action='FORGOT_PASSWORD',
                    details=f'Forgot password requested for non-existent email {email}',
                )
            return Response({'success': True, 'message': 'If the email is valid, password reset instructions will be sent.'}, status=status.HTTP_200_OK)
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
                        _log_user_event(
                            user=user,
                            request=request,
                            action='RESET_PASSWORD_OTP',
                            details=f'User {user.email} reset password successfully via OTP',
                        )
                        return Response({'success': True, 'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)
                    else:
                        _log_user_event(
                            user=user,
                            request=request,
                            action='RESET_PASSWORD_OTP_FAILED',
                            details=f'User {user.email} failed password reset via OTP due to invalid/expired code',
                            level=ActivityLogService.LEVEL_WARNING,
                        )
                        return Response({'success': False, 'message': 'Invalid or expired OTP code.'}, status=status.HTTP_400_BAD_REQUEST)
            except Users.DoesNotExist:
                _log_request_event(
                    request=request,
                    action='RESET_PASSWORD_OTP_FAILED',
                    details=f'Password reset via OTP failed because account {email} was not found',
                    level=ActivityLogService.LEVEL_WARNING,
                    status='failed',
                    error_message='Account not found',
                )
                return Response({'success': False, 'message': 'Invalid information.'}, status=status.HTTP_400_BAD_REQUEST)
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
                    _log_user_event(
                        user=user,
                        request=request,
                        action='RESET_PASSWORD_LINK',
                        details=f'User {user.email} reset password successfully via email link',
                    )
                    return Response({'success': True, 'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)
                else:
                    _log_request_event(
                        request=request,
                        action='RESET_PASSWORD_LINK_FAILED',
                        details='Password reset via link failed due to invalid or expired token',
                        level=ActivityLogService.LEVEL_WARNING,
                        status='failed',
                        error_message='Invalid or expired token',
                    )
                    return Response({'success': False, 'message': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            
