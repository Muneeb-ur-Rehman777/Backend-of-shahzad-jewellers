# Shahzad Jewellers Backend

Express + MongoDB/Mongoose backend with guest checkout, admin JWT authentication, product management, and admin-only Socket.IO inventory events.

## Setup

1. Install Node.js LTS.
2. Copy `.env.example` to `.env` and fill in values.
3. Install dependencies: `npm install`
4. Create the first admin: `node scripts/createAdmin.js`
5. Start development server: `npm run dev`

MongoDB transactions used for guest checkout require a replica set. MongoDB Atlas supports this. A standalone local MongoDB server does not support multi-document transactions unless configured as a replica set.

## Main routes

- `GET /api/health`
- `GET /api/products` (public)
- `GET /api/products/:id` (public)
- `POST /api/products` (admin)
- `PATCH /api/products/:id` (admin)
- `PATCH /api/products/:id/stock` (admin)
- `DELETE /api/products/:id` (admin; soft delete)
- `POST /api/admin/login` (public login endpoint)
- `GET /api/admin/me` (admin)
- `POST /api/orders` (guest checkout)
- `GET /api/orders` (admin)
- `PATCH /api/orders/:id/status` (admin)

For protected HTTP routes, send `Authorization: Bearer <token>`.
For Socket.IO, pass the token using `auth: { token }`.

## Important production work still needed

Before public launch, add rate limiting, request/schema validation with a dedicated validation library, robust order idempotency, cancellation/refund stock-restoration rules, payment-provider integration if required, secure token storage (prefer HttpOnly cookies where suitable), logging/monitoring, backups, and tests. Do not expose admin tokens in logs.
