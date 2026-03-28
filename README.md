# E-Commerce Full-Stack Application

A full-featured e-commerce platform built with **Node.js + Express** (backend) and **React + Tailwind CSS** (frontend), backed by **MongoDB**.

---

## Project Overview

This application covers the complete e-commerce lifecycle: user registration and authentication, product browsing with search/filter/sort, shopping cart management, order placement with stock control, wishlists, product reviews, and an admin panel for product management.

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Tailwind CSS, Vite |
| Backend | Node.js, Express 4, Mongoose 8 |
| Database | MongoDB (Atlas in production, in-memory for tests) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Validation | Zod |
| Testing | Jest, Supertest, fast-check, mongodb-memory-server |

---

## Project Structure

```
├── backend/
│   ├── app.js                  # Express app setup (routes, middleware)
│   ├── server.js               # Entry point — connects MongoDB, starts server
│   ├── config/env.js           # Fail-fast env var validation
│   ├── controllers/            # Route handlers (thin — delegate to services)
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT validation + admin role check
│   │   ├── errorMiddleware.js  # Central error handler
│   │   └── validate.js         # Zod schema middleware + all schemas
│   ├── models/                 # Mongoose schemas (User, Product, Cart, Order, Review)
│   ├── routes/                 # Express routers
│   ├── services/               # Business logic layer
│   ├── scripts/
│   │   ├── seedAdmin.js        # Creates default admin user
│   │   └── seedProducts.js     # Seeds sample product catalog
│   ├── utils/response.js       # Standardised { success, data, message } helper
│   └── __tests__/              # Jest + fast-check property-based tests
├── frontend/
│   └── src/
│       ├── api/apiClient.js    # Axios instance with auth interceptor
│       ├── context/            # AuthContext, CartContext
│       ├── components/         # Navbar, CartDrawer, ProtectedRoute
│       └── pages/              # All page components
└── README.md
```

---

## Setup and Installation

### Prerequisites

- Node.js 18+
- MongoDB (local) or a MongoDB Atlas connection string

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set MONGO_URI and JWT_SECRET
npm install
npm run dev
```

`.env` variables:

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `PORT` | Server port (default: 5000) |

Seed the database (optional):

```bash
node scripts/seedAdmin.js    # creates admin@example.com / admin123
node scripts/seedProducts.js # inserts sample products
```

### Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env — set VITE_API_URL to your backend URL
npm install
npm run dev
```

`.env` variables:

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend base URL (e.g. `http://localhost:5000/api/v1`) |

---

## API Endpoints

All endpoints are prefixed with `/api/v1`. All responses follow the envelope:

```json
{ "success": true, "data": { ... }, "message": "Human-readable message" }
```

Errors:

```json
{ "success": false, "data": null, "message": "Error description" }
```

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register a new user |
| POST | `/auth/login` | — | Login and receive JWT |

**POST /auth/register**
```json
// Request
{ "name": "Jane Doe", "email": "jane@example.com", "password": "securepass" }

// Response 201
{ "success": true, "data": { "user": { ... }, "token": "eyJ..." }, "message": "Account created successfully." }
```

**POST /auth/login**
```json
// Request
{ "email": "jane@example.com", "password": "securepass" }

// Response 200
{ "success": true, "data": { "user": { ... }, "token": "eyJ..." }, "message": "Login successful." }
```

### Products

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/products` | — | List products (paginated, filterable) |
| GET | `/products/:id` | — | Get product detail + reviews |
| POST | `/products` | Admin | Create product |
| PUT | `/products/:id` | Admin | Update product |
| DELETE | `/products/:id` | Admin | Soft-delete product |

**GET /products** query params:

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `category` | string | Exact category match |
| `search` | string | Case-insensitive search on name + description |
| `sort` | string | `price_asc`, `price_desc`, `newest` |

```json
// GET /products?category=electronics&search=phone&sort=price_asc&page=1
// Response 200
{
  "success": true,
  "data": {
    "products": [{ "_id": "...", "name": "Phone X", "price": 299, "category": "electronics" }],
    "total": 42,
    "page": 1,
    "pages": 3
  }
}
```

### Cart

All cart routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/cart` | Get current user's cart |
| POST | `/cart` | Add item `{ productId }` |
| PUT | `/cart/:productId` | Update quantity `{ quantity }` |
| DELETE | `/cart/:productId` | Remove item |

### Orders

All order routes require authentication.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/orders` | Place order from cart |
| GET | `/orders/me` | Get order history (newest first) |

**POST /orders**
```json
// Request
{
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Lagos",
    "country": "NG",
    "postalCode": "100001"
  }
}
// Response 201
{ "success": true, "data": { "order": { "_id": "...", "status": "pending", "totalPrice": 299 } } }
```

### Wishlist

All wishlist routes require authentication.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/wishlist` | Get wishlist |
| POST | `/wishlist` | Add product `{ productId }` (idempotent) |
| DELETE | `/wishlist/:productId` | Remove product |

### Reviews

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/products/:id/reviews` | User | Submit a review |

```json
// Request
{ "rating": 4, "comment": "Great product!" }
```

### Error Status Codes

| Status | Scenario |
|---|---|
| 400 | Validation failure, empty cart, insufficient stock |
| 401 | Missing/invalid/expired JWT, wrong credentials |
| 403 | Non-admin attempting admin action |
| 404 | Resource not found |
| 409 | Duplicate email or duplicate review |
| 429 | Rate limit exceeded on auth endpoints |
| 500 | Internal server error |

---

## Database Schema

### User
```
name          String   required
email         String   required, unique, indexed
passwordHash  String   bcrypt hash — never returned in API responses
role          String   'user' | 'admin', default 'user'
wishlist      [ObjectId] refs Product
createdAt     Date
```

### Product
```
name          String   required
description   String   required
price         Number   required, >= 0
category      String   required, indexed
stock         Number   required, >= 0
images        [String] min 1 URL required
averageRating Number   computed from reviews, default 0
isDeleted     Boolean  soft-delete flag, default false
createdAt     Date     indexed (desc)
```

### Cart
```
user    ObjectId  ref User, unique (one cart per user)
items   [{ product: ObjectId, quantity: Number }]
updatedAt Date
```

### Order
```
user            ObjectId  ref User
items           [{ product, name, price, quantity }]  price/name snapshotted at order time
totalPrice      Number
shippingAddress { street, city, country, postalCode }
status          'pending' | 'shipped' | 'delivered' | 'cancelled'
createdAt       Date
```

### Review
```
product   ObjectId  ref Product
user      ObjectId  ref User
rating    Number    1–5 inclusive
comment   String    non-empty
createdAt Date
Unique compound index: { product, user }  — one review per user per product
```

---

## Security Implementation

- Passwords hashed with **bcryptjs** (10 rounds) via a Mongoose pre-save hook
- `passwordHash` is stripped from all API responses via `toJSON` transform
- Authentication uses **JWT** (24h expiry, HS256)
- `authMiddleware` validates the Bearer token and attaches the full user document to `req.user`
- `adminMiddleware` enforces `role === 'admin'` on product write routes
- Auth endpoints are **rate-limited** to 20 requests per 15 minutes via `express-rate-limit`
- All inputs validated with **Zod** schemas before reaching controllers
- Product deletes are **soft deletes** (`isDeleted: true`) — data is never permanently removed
- Order placement uses **MongoDB transactions** to atomically create the order, decrement stock, and clear the cart

---

## Testing Strategy

Tests live in `backend/__tests__/` and use **Jest + Supertest** with an in-memory MongoDB instance (`mongodb-memory-server`).

### Property-Based Tests (fast-check)

Each correctness property is implemented as `fc.assert(fc.asyncProperty(...))` with a minimum of 100 iterations. Properties cover:

| Property | Description |
|---|---|
| 1 | Registration–login round trip produces a valid JWT |
| 2 | Duplicate email registration is rejected (409) |
| 3 | Invalid credentials return 401 |
| 4 | Valid JWT grants access to protected routes |
| 5 | Category filter returns only matching products |
| 6 | Search query matches name/description (case-insensitive) |
| 7 | Price sort returns non-decreasing order |
| 8 | Product detail contains all required fields |
| 9 | Cart add/retrieve returns correct item and quantity |
| 12 | Order creation produces correct status and total |
| 14 | Order history is sorted newest first |
| 16 | Admin product creation reflects all submitted fields |
| 20 | Wishlist add is idempotent (no duplicates) |
| 22 | Review average rating equals arithmetic mean |
| 25 | Domain object serialization round trip preserves fields |
| 26 | API responses never include `passwordHash` |

### Running Tests

```bash
cd backend
npm test              # runs all tests (watch mode off, in-band)
npm run test:run      # single run, passes with no tests
```

---

## Deployment

| Tier | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | MongoDB Atlas |

### Backend (Render)

1. Connect your GitHub repo to Render
2. Set build command: `npm install`
3. Set start command: `node server.js`
4. Add environment variables: `MONGO_URI`, `JWT_SECRET`, `PORT`

### Frontend (Vercel)

1. Connect your GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add environment variable: `VITE_API_URL` pointing to your Render backend URL

### MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Whitelist your Render service IP (or use `0.0.0.0/0` for development)
3. Copy the connection string into `MONGO_URI`

---

## Code Structure Explanation

### Request Flow

```
Client → Express Router → Zod Validation Middleware → Auth Middleware → Controller → Service → Mongoose Model → MongoDB
```

- **Routes** — wire HTTP methods to controllers, apply middleware
- **Controllers** — extract request data, call services, send responses via `sendSuccess()`
- **Services** — all business logic (no Express objects here — fully testable in isolation)
- **Models** — Mongoose schemas with validation, indexes, and transforms

### Key Design Decisions

- **Layered architecture**: controllers never touch Mongoose directly; services never touch `req`/`res`. This makes services unit-testable without HTTP.
- **Standardised response envelope**: every response is `{ success, data, message }` — consistent for frontend consumers.
- **Soft deletes on products**: preserves order history integrity (orders snapshot product name/price, but the product reference remains valid).
- **Atomic order placement**: MongoDB transactions ensure stock decrement, order creation, and cart clear either all succeed or all roll back.
- **Zod validation as middleware**: schemas are defined once in `middleware/validate.js` and reused across routes.

---

## Development Guidelines

- Keep controllers thin — business logic belongs in services
- All new routes must use the `sendSuccess()` / `next(err)` pattern
- Errors should set `err.status` before calling `next(err)` — the central error handler reads it
- New features should include a property-based test covering the core correctness invariant
- Never return `passwordHash` in any API response
- Run `npm test` before pushing — tests run in-band to avoid port conflicts
