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
        """Validate file before upload."""
        errors = []

        if file.size > UploadService.MAX_FILE_SIZE:
            errors.append('File must not exceed 5MB')

        if file.content_type not in UploadService.ALLOWED_CONTENT_TYPES:
            errors.append('Only JPEG, PNG or WebP files are accepted')

        return errors

    @staticmethod
    def upload_receipt_image(file, user):
        """
        Resize, compress and save receipt image.
        Returns the URL of the saved image.
        """
        # Open image with Pillow
        img = Image.open(file)

        # Convert RGBA → RGB if needed (for WEBP/JPEG)
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')

        # Resize if image is too large (maintain aspect ratio)
        img.thumbnail(
            (UploadService.MAX_DIMENSION, UploadService.MAX_DIMENSION),
            Image.LANCZOS,
        )

        # Compress into buffer
        buffer = BytesIO()
        img.save(buffer, format='WEBP', quality=UploadService.COMPRESS_QUALITY)
        buffer.seek(0)

        # Create file save path
        filename = f'receipts/{user.user_id}/{uuid.uuid4().hex}.webp'
        filepath = os.path.join(settings.MEDIA_ROOT, filename)

        # Create directory if not exists
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        # Save file
        with open(filepath, 'wb') as f:
            f.write(buffer.read())

        # Return URL
        file_url = f'{settings.MEDIA_URL}{filename}'
        return file_url