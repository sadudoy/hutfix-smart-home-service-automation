# HutFix API Documentation

## System Endpoints

### 1. Health Check

Verifies server responsiveness and active PostgreSQL database pool connectivity.

- **Method:** `GET`
- **Path:** `/api/health`
- **Authentication:** None (Public)

#### Success Response

- **Status Code:** `200 OK`
- **Content-Type:** `application/json`
- **Body:**

```json
{
  "ok": true,
  "db": "connected",
  "now": "2026-10-25T13:16:00.000Z"
}
```

#### Failure Response

- **Status Code:** `500 Internal Server Error`
- **Content-Type:** `application/json`
- **Body:**

```json
{
  "ok": false,
  "db": "disconnected",
  "error": "connection to server at 'localhost' failed..."
}
```

---

## Authentication Endpoints

Base path: `/api/auth`  
Session management is handled via httpOnly cookie (`hutfix_token`, `sameSite: lax`, 7-day duration) or `Authorization: Bearer <token>` header.

### 2. User Registration

Creates a new customer or provider account. Password hashing uses PostgreSQL `pgcrypto` `crypt(..., gen_salt('bf'))`.

- **Method:** `POST`
- **Path:** `/api/auth/register`
- **Rate Limit:** 50 requests per 15 minutes
- **Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "John Doe",
  "phone": "+8801700000000",
  "role": "customer"
}
```

- **Validation Rules:**
  - `email`, `password`, `full_name` are required.
  - `password.length >= 6`.
  - `role` must be `'customer'` or `'provider'` (default is `'customer'`). `'admin'` is rejected.

#### Response

- **Status Code:** `200 OK`
- **Set-Cookie:** `hutfix_token=<jwt>; HttpOnly; Path=/; Max-Age=604800`
- **Body:**

```json
{
  "ok": true,
  "user": {
    "id": 15,
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone": "+8801700000000",
    "role": "customer",
    "created_at": "2026-10-25T13:20:00.000Z"
  }
}
```

### 3. User Login

Authenticates existing customer, provider, or administrator credentials.

- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Rate Limit:** 50 requests per 15 minutes
- **Request Body:**

```json
{
  "email": "customer@demo.test",
  "password": "demo1234"
}
```

#### Response

- **Status Code:** `200 OK`
- **Set-Cookie:** `hutfix_token=<jwt>; HttpOnly; Path=/; Max-Age=604800`
- **Body:**

```json
{
  "ok": true,
  "user": {
    "id": 1,
    "email": "customer@demo.test",
    "full_name": "Demo Customer",
    "phone": "+8801700000001",
    "role": "customer",
    "created_at": "2026-10-25T13:14:00.000Z"
  }
}
```

### 4. Current User Session (`me`)

Retrieves the authenticated user profile for active session validation.

- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Authentication:** `requireAuth` (reads `hutfix_token` cookie or `Authorization: Bearer <token>`)

#### Success Response

- **Status Code:** `200 OK`
- **Body:**

```json
{
  "ok": true,
  "user": {
    "id": 1,
    "email": "customer@demo.test",
    "full_name": "Demo Customer",
    "phone": "+8801700000001",
    "role": "customer",
    "created_at": "2026-10-25T13:14:00.000Z"
  }
}
```

#### Unauthorized Response

- **Status Code:** `401 Unauthorized`
- **Body:**

```json
{
  "ok": false,
  "error": "auth required"
}
```

### 5. User Logout

Terminates the session and clears the httpOnly token cookie.

- **Method:** `POST`
- **Path:** `/api/auth/logout`

#### Response

- **Status Code:** `200 OK`
- **Set-Cookie:** `hutfix_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
- **Body:**

```json
{
  "ok": true
}
```
