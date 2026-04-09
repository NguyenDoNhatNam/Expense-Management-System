from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from api.services.auth_service import AuthService, REFRESH_TOKEN_LIFETIME, REMEMBER_TOKEN_LIFETIME
from drf_spectacular.utils import extend_schema

def set_auth_cookies(response, tokens):
    is_prod = True
    
    response.delete_cookie('refresh_token')
    response.delete_cookie('remember_token')

    if tokens.get('refresh_token'):
        max_age = REFRESH_TOKEN_LIFETIME.total_seconds() if tokens.get('remember_me') else None
        response.set_cookie(
            key='refresh_token',
            value=tokens['refresh_token'],
            httponly=True,
            secure=is_prod,
            samesite='Lax',
            max_age=max_age
        )
    
    if tokens.get('remember_token'):
        response.set_cookie(
            key='remember_token',
            value=tokens['remember_token'],
            httponly=True,
            secure=is_prod,
            samesite='Lax',
            max_age=REMEMBER_TOKEN_LIFETIME.total_seconds()
        )
    return response

class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @extend_schema(
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'email': {'type': 'string', 'format': 'email'},
                    'password': {'type': 'string'},
                    'rememberMe': {'type': 'boolean'}
                }
            }
        },
        responses={200: {'description': 'Login successful'}}
    )
    @action(detail=False, methods=['post'], url_path='login')
    def login(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        remember_me = request.data.get('rememberMe', False)

        tokens, error = AuthService.login_user(email, password, remember_me, request)
        if error:
            return Response({'success': False, 'message': error}, status=status.HTTP_401_UNAUTHORIZED)
        
        response = Response({'success': True, 'data': {'accessToken': tokens['access_token']}})
        return set_auth_cookies(response, tokens)

    @action(detail=False, methods=['post'], url_path='refresh')
    def refresh_token(self, request):
        refresh_token_str = request.COOKIES.get('refresh_token')
        if not refresh_token_str:
            return Response({'success': False, 'message': 'Refresh token not found'}, status=status.HTTP_401_UNAUTHORIZED)

        tokens, error = AuthService.rotate_refresh_token(refresh_token_str, request)
        if error:
            return Response({'success': False, 'message': error}, status=status.HTTP_401_UNAUTHORIZED)

        response = Response({'success': True, 'data': {'accessToken': tokens['access_token']}})
        response.set_cookie(
            key='refresh_token', value=tokens['refresh_token'],
            httponly=True, secure=True, samesite='Lax', max_age=REFRESH_TOKEN_LIFETIME.total_seconds()
        )
        return response

    @action(detail=False, methods=['post'], url_path='auto-login')
    def auto_login(self, request):
        remember_token_str = request.COOKIES.get('remember_token')
        tokens, error = AuthService.login_with_remember_token(remember_token_str, request)
        if error:
            response = Response({'success': False, 'message': error}, status=status.HTTP_401_UNAUTHORIZED)
            response.delete_cookie('remember_token')
            return response

        response = Response({'success': True, 'data': {'accessToken': tokens['access_token']}})
        return set_auth_cookies(response, {**tokens, 'remember_me': True})

    @action(detail=False, methods=['post'], url_path='logout')
    def logout(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        remember_token = request.COOKIES.get('remember_token')
        
        # Lấy Access Token hiện tại từ Header
        auth_header = request.headers.get('Authorization')
        access_token = None
        if auth_header and auth_header.lower().startswith('bearer '):
            access_token = auth_header.split(' ')[1]
            
        AuthService.logout(refresh_token, remember_token, access_token)
        response = Response({'success': True, 'message': 'Logged out successfully'})
        response.delete_cookie('refresh_token')
        response.delete_cookie('remember_token')
        return response