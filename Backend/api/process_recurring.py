from django.core.management.base import BaseCommand
from api.services.recurring_service import RecurringService

class Command(BaseCommand):
    help = 'Chạy Cronjob hàng ngày để xử lý và tạo tự động các giao dịch định kỳ.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING('Bắt đầu quét và tạo giao dịch định kỳ...'))
        
        try:
            processed_count = RecurringService.process_daily_recurring()
            
            self.stdout.write(self.style.SUCCESS(f'Hoàn tất! Đã xử lý {processed_count} giao dịch định kỳ đến hạn.'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Lỗi khi xử lý: {str(e)}'))
