# EVENTRA Demo Accounts (Developer-Only)

> **LOCAL / TEST ENVIRONMENTS ONLY. Never use these accounts or this password in production.**
> This file is intentionally kept inside `backend/docs/`. It is not served by Express, is not
> referenced by any API route, and must never be copied into `frontend/`.

## Shared development password

`Eventra@123`

The seed script does **not** contain this value. It reads `DEMO_ACCOUNT_PASSWORD` from
`backend/.env` and stores only a bcrypt hash. Set it yourself before seeding:

```
DEMO_ACCOUNT_PASSWORD=Eventra@123
```

The seeder refuses to run when `NODE_ENV=production` or when the variable is missing.

## Accounts

| # | Name | Role (DB enum) | Email | Description |
|---|------|----------------|-------|-------------|
| 1 | Arjun Mehta | Customer (`USER`) | arjun@eventra.edu | Owns active and listed NFT passes. |
| 2 | Meera Nair | Customer (`USER`) | meera@eventra.edu | Marketplace fan buyer. |
| 3 | Vikramaditya Soundworks | Organizer (`ORGANIZER`) | organizer@eventra.edu | Access to the six-section Organizer Dashboard. |
| 4 | Dr. Kavita Rao | Admin (`ADMIN`) | admin@eventra.edu | Access to Technical Overview and Benchmarks. |

## Seeding

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

## Security rules for these accounts

- Do not display them in the frontend (no demo cards, switchers, or login shortcuts).
- Do not return them from any API response or store them in browser storage.
- Public registration can only create `USER` or `ORGANIZER` accounts; `ADMIN` can only come from seeding.
- Rotate or delete these accounts before any shared or public deployment.
