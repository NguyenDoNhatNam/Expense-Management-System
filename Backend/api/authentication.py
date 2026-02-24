from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework.authentication import BaseAuthentication 
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from api.models import Users
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    if not user.is_active:
        raise AuthenticationFailed('User is not active')
    refresh['user_id'] = user.user_id
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class CustomTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return None

        try:
            token_prefix , token_key = auth_header.split(' ')
            if token_prefix.lower() != 'bearer':
                raise AuthenticationFailed('Invalid token prefix')
        except ValueError:
            raise AuthenticationFailed('Invalid Authorization header format')
        
        try: 
            token = AccessToken(token_key)
            user_id = token.get('user_id')
            if not user_id:
                raise AuthenticationFailed('Invalid token')
            
            user = Users.objects.get(id=user_id)

            if not user.is_active:
                raise AuthenticationFailed('User is not active')
            
            if not hasattr(user, 'is_authenticated'):
                user.is_authenticated = True 
                user.is_anonymous = False

            return(user, token)
        
        except Users.DoesNotExist:
            raise AuthenticationFailed('User không tồn tại')
        except TokenError as e:
            raise AuthenticationFailed(f'Token không hợp lệ: {str(e)}')
        except Exception as e:
            raise AuthenticationFailed(f'Xác thực thất bại: {str(e)}')


    def authenticate_header(self , request): 
        return 'Bearer'