from django.core.management.base import BaseCommand
from api.services.debt_service import DebtService

class Command(BaseCommand):
    help = 'Chạy Cronjob hàng ngày để nhắc nhở và đánh dấu quá hạn các khoản nợ.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING('Bắt đầu quét các khoản nợ...'))
        
        try:
            processed_count = DebtService.process_daily_debts()
            
            self.stdout.write(self.style.SUCCESS(f'Hoàn tất! Đã tạo {processed_count} cảnh báo.'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Lỗi khi xử lý: {str(e)}'))