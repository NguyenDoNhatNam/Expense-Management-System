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
                        return Response({'success': False, 'message': 'Account has already been activated.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    if OTPService.verify_otp(user, code, 'activation'):
                        user.is_active = True
                        user.save(update_fields=['is_active'])
                        return Response({'success': True, 'message': 'Account activated successfully. You can now log in.'}, status=status.HTTP_200_OK)
                    else:
                        return Response({'success': False, 'message': 'Invalid or expired OTP code.'}, status=status.HTTP_400_BAD_REQUEST)
            except Users.DoesNotExist:
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
                    return Response({'success': False, 'message': 'Account has already been activated.'}, status=status.HTTP_400_BAD_REQUEST)
                
                if method == 'sms':
                    if not user.phone:
                        return Response({'success': False, 'message': 'Account does not have a phone number.'}, status=status.HTTP_400_BAD_REQUEST)
                    OTPService.send_activation_sms_otp(user)
                elif otp_type == 'activation':
                    OTPService.send_activation_otp(user)
                elif otp_type == 'reset_password':
                    OTPService.send_reset_password_otp(user)
            except Users.DoesNotExist:
                pass
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
                        return Response({'success': True, 'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)
                    else:
                        return Response({'success': False, 'message': 'Invalid or expired OTP code.'}, status=status.HTTP_400_BAD_REQUEST)
            except Users.DoesNotExist:
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
                    return Response({'success': True, 'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)
                else:
                    return Response({'success': False, 'message': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            
