from django.core.management.base import BaseCommand
from api.services.debt_service import DebtService

class Command(BaseCommand):
    help = 'Run daily cronjob to remind and mark overdue debts.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING('Starting debt scan...'))
        
        try:
            processed_count = DebtService.process_daily_debts()
            
            self.stdout.write(self.style.SUCCESS(f'Complete! Created {processed_count} alerts.'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error processing: {str(e)}'))