import os
import uuid
from PIL import Image
from io import BytesIO
from django.conf import settings
from django.core.files.storage import default_storage


class UploadService:

    ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp']
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    MAX_DIMENSION = 1920
    COMPRESS_QUALITY = 80

    @staticmethod
    def validate_receipt_image(file):
        """Validate file trước khi upload."""
        errors = []

        if file.size > UploadService.MAX_FILE_SIZE:
            errors.append('File không được vượt quá 5MB')

        if file.content_type not in UploadService.ALLOWED_CONTENT_TYPES:
            errors.append('Chỉ chấp nhận file JPEG, PNG hoặc WebP')

        return errors

    @staticmethod
    def upload_receipt_image(file, user):
        """
        Resize, compress và lưu ảnh hóa đơn.
        Trả về URL của ảnh đã lưu.
        """
        # Mở ảnh bằng Pillow
        img = Image.open(file)

        # Chuyển RGBA → RGB nếu cần (để lưu WEBP/JPEG)
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')

        # Resize nếu ảnh quá lớn (giữ tỉ lệ)
        img.thumbnail(
            (UploadService.MAX_DIMENSION, UploadService.MAX_DIMENSION),
            Image.LANCZOS,
        )

        # Compress vào buffer
        buffer = BytesIO()
        img.save(buffer, format='WEBP', quality=UploadService.COMPRESS_QUALITY)
        buffer.seek(0)

        # Tạo đường dẫn lưu file
        filename = f'receipts/{user.user_id}/{uuid.uuid4().hex}.webp'
        filepath = os.path.join(settings.MEDIA_ROOT, filename)

        # Tạo thư mục nếu chưa có
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        # Lưu file
        with open(filepath, 'wb') as f:
            f.write(buffer.read())

        # Trả về URL
        file_url = f'{settings.MEDIA_URL}{filename}'
        return file_url