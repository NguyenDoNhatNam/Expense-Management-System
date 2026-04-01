# Expense Management Frontend (`my-expense-app`)

Next.js frontend for the Expense Management System.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Axios for API communication

## Prerequisites

- Node.js 20+
- npm 10+
- Backend service running (default: `http://127.0.0.1:8000`)

## Environment Variables

Create `.env.local` in `my-expense-app`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api
```

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## API Integration Notes

### Authentication Token

- Access token is read from:
	- `localStorage.access_token` or
	- `sessionStorage.access_token`
- Axios interceptor in `lib/api/client.ts` auto-attaches `Authorization: Bearer <token>`.

### Categories Flow (Backend Synced)

- API module: `lib/api/categories.ts`
- Context integration: `lib/AppContext.tsx`
- UI usage: `components/pages/CategoriesPage.tsx`

Current behavior:

1. On login or when session is restored, app fetches latest categories from backend.
2. Create/update/delete category actions call backend first.
3. After each mutation, categories are re-synced from backend to avoid stale UI/state mismatch.

Backend endpoints used:

- `GET /categories/list/`
- `POST /categories/create/`
- `PATCH /categories/update/{category_id}/`
- `DELETE /categories/delete/{category_id}/`

### Wallets Flow (Backend Synced To Accounts)

- API module: `lib/api/accounts.ts`
- Context integration: `lib/AppContext.tsx`
- UI usage: `components/pages/WalletsPage.tsx`

Current behavior:

1. On login/session restore, wallets are fetched from backend accounts API.
2. Create wallet calls backend account create endpoint.
3. Update wallet calls backend account update endpoint.
4. Delete wallet calls backend account delete endpoint.
5. After each wallet mutation, app re-fetches account list to keep UI state consistent.

Backend endpoints used:

- `GET /accounts/list/`
- `POST /accounts/create/`
- `PATCH /accounts/update/{account_id}/`
- `DELETE /accounts/delete/{account_id}/`

### Transactions List/Delete Flow

`components/pages/TransactionsPage.tsx` uses shared Axios client instead of calling local `/api/*` routes.

Endpoints used:

- `GET /transactions/list/`
- `POST /transactions/create/`
- `PATCH /transactions/update/{transaction_id}/`
- `DELETE /transactions/delete/{transaction_id}/`

Transaction form integration:

1. `TransactionsPage` loads backend transactions and passes selected transaction data to `TransactionForm` when editing.
2. `TransactionForm` sends create/update requests directly to backend.
3. After submit success, the page refetches transaction list to keep UI consistent with server state.

## Code Structure

- `app/`: Next.js app router files
- `components/`: UI/page components
- `lib/`: app context, domain types, API clients
- `lib/api/`: backend API adapters

## Quality Checklist

- Keep API calls in `lib/api/*` instead of directly in UI components.
- Normalize backend response mapping in one place before storing in context state.
- Reuse `getApiErrorMessage` for consistent error messages.
- Avoid token key duplication (`access_token` is the standard key).

## Build

```bash
npm run build
npm run start
```
