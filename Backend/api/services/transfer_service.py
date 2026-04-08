from django.db import transaction as db_transaction
from django.utils import timezone
from datetime import datetime
from uuid import uuid4
from api.models import Transfers, Accounts, Transactions, Categories

class TransferService:
    @staticmethod
    def get_transfers(user):
        return Transfers.objects.filter(user=user).order_by('-transfer_date', '-created_at')

    @staticmethod
    def create_transfer(validated_data, user):
        from_account_id = validated_data['from_account_id']
        to_account_id = validated_data['to_account_id']
        amount = validated_data['amount']
        fee = validated_data.get('fee', 0)
        transfer_date = validated_data['transfer_date']
        description = validated_data.get('description', '')

        with db_transaction.atomic():
            # 1. Lock accounts (Sort ID to prevent Deadlock)
            account_ids = sorted([from_account_id, to_account_id])
            locked_accounts = list(Accounts.objects.select_for_update().filter(account_id__in=account_ids, user=user))

            if len(locked_accounts) != 2:
                raise ValueError("One or both accounts do not exist or do not belong to you")

            from_account = next((acc for acc in locked_accounts if acc.account_id == from_account_id), None)
            to_account = next((acc for acc in locked_accounts if acc.account_id == to_account_id), None)

            # 2. Check Balance
            total_deduct = amount + fee
            if from_account.balance < total_deduct:
                raise ValueError(f"Source account has insufficient balance. Required: {total_deduct}, Available: {from_account.balance}")

            # 3. Execute transfer & Update Account
            from_account.balance -= total_deduct
            to_account.balance += amount
            
            from_account.updated_at = timezone.now()
            to_account.updated_at = timezone.now()
            from_account.save()
            to_account.save()

            # 4. Record in Transfers table
            transfer_id = f'TRF-{str(uuid4())[:15]}'
            transfer = Transfers.objects.create(
                transfer_id=transfer_id, user=user,
                from_account=from_account, to_account=to_account,
                amount=amount, fee=fee, transfer_date=transfer_date,
                description=description, created_at=timezone.now()
            )

            # 5. Create Categories (if not exist) and 2 dual Transactions for reporting
            cat_out, _ = Categories.objects.get_or_create(
                user=user, category_name='Internal Transfer', category_type='expense',
                defaults={'category_id': f'CAT-{str(uuid4())[:15]}', 'is_default': True, 'is_deleted': False, 'color': '#FF9800', 'icon': 'arrow-up'}
            )
            cat_in, _ = Categories.objects.get_or_create(
                user=user, category_name='Received Transfer', category_type='income',
                defaults={'category_id': f'CAT-{str(uuid4())[:15]}', 'is_default': True, 'is_deleted': False, 'color': '#4CAF50', 'icon': 'arrow-down'}
            )

            trans_datetime = timezone.make_aware(datetime.combine(transfer_date, datetime.min.time()))

            Transactions.objects.create(
                transaction_id=f'TR-{str(uuid4())[:15]}', user=user, account=from_account, category=cat_out,
                amount=total_deduct, transaction_type='expense', transaction_date=trans_datetime,
                description=f'Transfer to {to_account.account_name} - {description}', note=f'Transfer_ID: {transfer_id}',
                is_recurring=False, is_deleted=False, created_at=timezone.now(), updated_at=timezone.now()
            )

            Transactions.objects.create(
                transaction_id=f'TR-{str(uuid4())[:15]}', user=user, account=to_account, category=cat_in,
                amount=amount, transaction_type='income', transaction_date=trans_datetime,
                description=f'Received from {from_account.account_name} - {description}', note=f'Transfer_ID: {transfer_id}',
                is_recurring=False, is_deleted=False, created_at=timezone.now(), updated_at=timezone.now()
            )

        return transfer

    @staticmethod
    def delete_transfer(transfer_id, user):
        with db_transaction.atomic():
            try:
                transfer = Transfers.objects.get(transfer_id=transfer_id, user=user)
            except Transfers.DoesNotExist:
                raise ValueError("Transfer not found")

            # Revert balance with atomic lock
            account_ids = sorted([transfer.from_account_id, transfer.to_account_id])
            locked_accounts = list(Accounts.objects.select_for_update().filter(account_id__in=account_ids, user=user))
            from_account = next((acc for acc in locked_accounts if acc.account_id == transfer.from_account_id), None)
            to_account = next((acc for acc in locked_accounts if acc.account_id == transfer.to_account_id), None)
            
            if from_account and to_account:
                if to_account.balance < transfer.amount: raise ValueError("Destination account has insufficient balance to revert")
                from_account.balance += (transfer.amount + (transfer.fee or 0)); to_account.balance -= transfer.amount
                from_account.save(); to_account.save()
            Transactions.objects.filter(note__contains=f'Transfer_ID: {transfer_id}').update(is_deleted=True, deleted_at=timezone.now())
            transfer.delete()