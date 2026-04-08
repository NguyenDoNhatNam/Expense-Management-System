from django.core.management.base import BaseCommand
from api.services.recurring_service import RecurringService

class Command(BaseCommand):
    help = 'Run daily Cronjob to process and automatically create recurring transactions.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING('Starting scan and creation of recurring transactions...'))
        
        try:
            processed_count = RecurringService.process_daily_recurring()
            
            self.stdout.write(self.style.SUCCESS(f'Complete! Processed {processed_count} due recurring transactions.'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error during processing: {str(e)}'))
