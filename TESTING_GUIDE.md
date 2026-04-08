# Transaction Feature Testing Guide

## Prerequisites
1. Backend Django running on `http://127.0.0.1:8000`
2. Frontend Next.js running on `http://localhost:3000`
3. User is logged in
4. Has at least 1 wallet/account
5. Has at least 1 category in the system

## Test Cases

### 1. Load Transaction List

**Steps**:
1. Log in to the application
2. Select a wallet/account
3. Go to "Transactions" page
4. Wait for data to load from server

**Expected Results**:
- ✅ See "Loading transactions..." while waiting
- ✅ Transaction list from backend is displayed
- ✅ Pagination info is displayed (e.g.: "10 transactions found")
- ❌ No JavaScript errors in console

**Debug if errors**:
```bash
# Check backend endpoint
curl -H "Authorization: Bearer <token>" http://127.0.0.1:8000/api/transactions/

# Check network tab in DevTools
# - Status: 200 OK
# - Response format is correct
```

---

### 2. Create New Transaction

**Steps**:
1. Go to Transactions page
2. Click "+ Add Transaction"
3. Fill form:
   - Type: Expense
   - Category: Select a category
   - Amount: 100000
   - Description: "Test transaction"
   - Date: Today
4. Click "Add Transaction"

**Expected Results**:
- ✅ Form closes
- ✅ New transaction appears in the list
- ✅ Wallet balance updates (decreases by expense amount)
- ✅ Success notification

**Debug if errors**:
```javascript
// Check console
// Error: "Insufficient account balance"
//   → Wallet balance is insufficient, need to top-up

// Error: "Category does not exist"
//   → Category ID is invalid

// Network error
//   → Backend is not running or token has expired
```

---

### 3. Upload Receipt Image

**Steps**:
1. Go to create/edit transaction form
2. Click file input "Receipt Image"
3. Select an image file (JPG/PNG/WebP, < 5MB)
4. Wait for upload to complete

**Expected Results**:
- ✅ Image preview displays after upload
- ✅ Image URL is saved: `/media/receipts/USER-xxx/abc123.webp`
- ✅ Image automatically resized and compressed
- ❌ No "Error uploading image" message

**Debug if errors**:
```bash
# Check file size
ls -lh your-image.jpg  # Must be < 5MB

# Check format
file your-image.jpg    # Must be JPEG/PNG/WebP

# Check storage directory
ls -la Backend/media/receipts/
```

---

### 4. Update Transaction

**Steps**:
1. Find a transaction in the list
2. Click "Edit"
3. Change:
   - Amount: increase/decrease
   - Category: select different category
   - Description: edit
4. Click "Update Transaction"

**Expected Results**:
- ✅ Transaction updated in the list
- ✅ Balance of both old & new accounts adjusted
- ✅ Category icon/name updated

**Debug if errors**:
```javascript
// Error: "Insufficient account balance after update"
//   → Reduce amount or switch to an account with more balance

// Error: "Category does not exist"
//   → Reload page to refresh category list
```

---

### 5. Delete Transaction

**Steps**:
1. Find a transaction in the list
2. Click "Delete"
3. Confirm "Are you sure?"
4. Wait for deletion to complete

**Expected Results**:
- ✅ Transaction disappears from the list
- ✅ Wallet balance updates (reverted)
- ✅ No errors

**Debug if errors**:
```javascript
// Error: "Can only delete transactions within 30 days"
//   → Transaction is > 30 days old, cannot delete
//   → Use admin panel to force delete

// Error: "Transaction does not exist or has been deleted"
//   → Transaction was already deleted, reload the list
```

---

### 6. Search & Filter

**Test Search**:
1. Type in "Search transactions" input
2. Type part of description (e.g.: "test")
3. List automatically filters

**Test Filter by Type**:
1. Click dropdown "All Types"
2. Select "Income" or "Expense"
3. List shows only that type

**Expected Results**:
- ✅ Real-time search (no reload needed)
- ✅ Filter works correctly
- ✅ Combined search + filter works simultaneously

---

### 7. Pagination (If many transactions)

**Steps**:
1. Backend returns `page_size=10`
2. If there are > 10 transactions
3. Check pagination info

**Expected Results**:
- ✅ Shows "X transactions found"
- ✅ If needed, add pagination UI (next/prev page)

---

## Technical Verification

### Backend API Responses

```bash
# Get list (200 OK)
curl -H "Authorization: Bearer TOKEN" \
  http://127.0.0.1:8000/api/transactions/

# Response example:
{
  "success": true,
  "message": "Transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "transaction_id": "TR-abc123",
        "amount": "100000.00",
        "transaction_type": "expense",
        "transaction_date": "2024-01-15T10:30:00Z",
        "description": "Coffee",
        "category_name": "Food & Drinks",
        "category_icon": "🍔",
        "account_name": "Main Account",
        "receipt_image_url": "/media/receipts/USER-xxx/abc123.webp"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 10,
      "total_pages": 1,
      "total_items": 1,
      "has_next": false,
      "has_previous": false
    }
  }
}
```

### Frontend Console Logs

```javascript
// Check in DevTools Console

// 1. AppContext init
console.log('User:', currentUser)
console.log('Wallet:', currentWallet)
console.log('Transactions loaded:', transactions.length)

// 2. API call logs
// Should see logs from API layer if any

// 3. Error logs
// Should not have undefined, null reference errors
```

### Network Tab

| Request | Method | Status | Response Time |
|---------|--------|--------|---------------|
| `/api/transactions/` | GET | 200 | < 500ms |
| `/transactions/create/` | POST | 201 | < 500ms |
| `/transactions/update/ID/` | PUT | 200 | < 500ms |
| `/transactions/delete/ID/` | DELETE | 200 | < 500ms |
| `/receipts/upload-receipt/` | POST | 201 | < 1000ms |

---

## Troubleshooting

### Issue: "Failed to fetch transactions"

**Possible causes**:
1. Backend is not running
2. Token has expired
3. CORS policy rejected

**Solutions**:
1. Check backend is running: `python manage.py runserver`
2. Check token: `localStorage.access_token`
3. Check CORS settings in `settings.py`

---

### Issue: "Image cannot be uploaded"

**Possible causes**:
1. File > 5MB
2. Unsupported format
3. Folder `/media/receipts/` lacks write permissions

**Solutions**:
```bash
# 1. Check file size
du -h upload-file.jpg

# 2. Check format
file upload-file.jpg

# 3. Create folder & set permissions
mkdir -p Backend/media/receipts/
chmod 755 Backend/media/receipts/
```

---

### Issue: "Transaction list doesn't update after creating"

**Possible causes**:
1. `loadTransactions()` is not called
2. Response from backend is incorrect
3. State update is blocked

**Solutions**:
1. Add console.log in `loadTransactions()`
2. Check response format
3. Check dependency array of useEffect

---

## Performance Tips

1. **Reduce API calls**: Add caching or infinite scroll
2. **Optimize search**: Debounce input before calling API
3. **Lazy load images**: Preview receipt images only on hover
4. **Pagination**: Always use reasonable page_size (10-50)

---

## Completion Checklist

- [ ] Load transaction list from backend
- [ ] Create feature -> backend updates -> list refresh
- [ ] Upload receipt image successfully
- [ ] Edit feature -> backend updates -> list refresh
- [ ] Delete feature -> backend updates -> list refresh
- [ ] Search & filter working
- [ ] Complete error handling
- [ ] Wallet balance updates correctly
- [ ] Good performance (< 500ms API response)
- [ ] No console errors
