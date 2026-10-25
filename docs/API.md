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


---

## Service Catalog Endpoints

Base path: `/api/services`

### 6. List Service Categories

Returns all active service categories ordered by `id` ASC.

- **Method:** `GET`
- **Path:** `/api/services`
- **Authentication:** None (Public)

#### Response

- **Status Code:** `200 OK`
- **Body:**

```json
{
  "ok": true,
  "services": [
    {
      "id": 1,
      "slug": "appliance-repair",
      "name": "Appliance Repair",
      "icon": "bi-wrench-adjustable",
      "description": "Fix refrigerators, washing machines, microwaves, and ovens.",
      "base_price": "800.00"
    }
  ]
}
```

### 7. Get Category by Slug

Retrieves category details for a specific slug identifier.

- **Method:** `GET`
- **Path:** `/api/services/:slug`
- **Authentication:** None (Public)

#### Response

- **Status Code:** `200 OK` (or `404 Not Found` if slug does not exist)
- **Body:**

```json
{
  "ok": true,
  "service": {
    "id": 1,
    "slug": "appliance-repair",
    "name": "Appliance Repair",
    "icon": "bi-wrench-adjustable",
    "description": "Fix refrigerators, washing machines, microwaves, and ovens.",
    "base_price": "800.00"
  }
}
```

---

## Service Request & Matching Endpoints

Base path: `/api/requests`

### 8. Match Providers

Runs the multi-factor smart matching engine: computes provider availability, rating, haversine distance, price competitiveness, and daily workload balance.

- **Method:** `POST`
- **Path:** `/api/requests/match`
- **Authentication:** `requireAuth`, `requireRole('customer')`
- **Request Body:**

```json
{
  "category_slug": "appliance-repair",
  "preferred_date": "2026-10-31",
  "preferred_start_minute": 960,
  "preferred_end_minute": 1080,
  "urgency": "normal",
  "address": "Dhanmondi, Dhaka",
  "latitude": 23.7465,
  "longitude": 90.3760
}
```

#### Response

- **Status Code:** `200 OK`
- **Body:**

```json
{
  "ok": true,
  "candidates": [
    {
      "provider": {
        "id": 1,
        "name": "Rahim Appliance Care",
        "rating": 4.8,
        "rating_count": 28,
        "address": "Dhanmondi 27, Dhaka",
        "headline": "Certified Home Appliance Specialist",
        "years_experience": 8,
        "distance_km": 0.5,
        "price": 1000.00
      },
      "score": 0.9450,
      "breakdown": {
        "availability": 1.0000,
        "rating": 0.9600,
        "distance": 0.9750,
        "price": 0.8500,
        "workload": 1.0000
      }
    }
  ]
}
```

### 9. Create Service Request & Booking

Executes an atomic transaction that inserts the service request, reserves the provider's calendar slot in `provider_bookings`, and logs the initial `requested` status event. Supports multipart file upload for optional image attachment.

- **Method:** `POST`
- **Path:** `/api/requests`
- **Authentication:** `requireAuth`, `requireRole('customer')`
- **Content-Type:** `multipart/form-data` or `application/x-www-form-urlencoded`
- **Form Fields:**
  - `category_slug` (string, required)
  - `preferred_date` (string `YYYY-MM-DD`, required)
  - `preferred_start_minute` (integer, required)
  - `preferred_end_minute` (integer, required)
  - `urgency` (string, optional: `low` | `normal` | `high` | `urgent`)
  - `address` (string, required)
  - `latitude` (float, optional)
  - `longitude` (float, optional)
  - `description` (string, optional)
  - `contact_phone` (string, optional)
  - `provider_id` (integer, optional)
  - `image` (binary file, optional: jpeg, png, webp <= 5MB)

#### Success Response

- **Status Code:** `200 OK`
- **Body:**

```json
{
  "ok": true,
  "request": {
    "id": 1,
    "customer_id": 1,
    "category_id": 1,
    "assigned_provider_id": 1,
    "status": "requested",
    "description": "Washing machine won't spin.",
    "urgency": "normal",
    "address": "Dhanmondi, Dhaka",
    "latitude": 23.7465,
    "longitude": 90.3760,
    "preferred_date": "2026-10-31",
    "preferred_start_minute": 960,
    "preferred_end_minute": 1080,
    "contact_phone": "+8801700000001",
    "image_url": "/uploads/requests/1761400000000-a1b2c3.jpg",
    "estimated_price": "1000.00",
    "created_at": "2026-10-25T13:30:00.000Z"
  }
}
```

#### Slot Conflict Response

- **Status Code:** `409 Conflict`
- **Body:**

```json
{
  "ok": false,
  "error": "slot already booked",
  "suggestions": [
    {
      "date": "2026-10-31",
      "start_minute": 660,
      "end_minute": 720,
      "label": "11:00–12:00"
    },
    {
      "date": "2026-10-31",
      "start_minute": 720,
      "end_minute": 780,
      "label": "12:00–13:00"
    }
  ]
}
```

### 10. List User Requests (`mine`)

Retrieves requests tailored to the authenticated user's role:
- `customer`: Requests created by this customer (`WHERE customer_id = $1`)
- `provider`: Requests assigned to this provider (`WHERE p.user_id = $1`)
- `admin`: All platform requests

- **Method:** `GET`
- **Path:** `/api/requests/mine`
- **Authentication:** `requireAuth`

#### Response

- **Status Code:** `200 OK`
- **Body:**

```json
{
  "ok": true,
  "requests": [
    {
      "id": 1,
      "customer_id": 1,
      "category_id": 1,
      "assigned_provider_id": 1,
      "status": "requested",
      "address": "Dhanmondi, Dhaka",
      "preferred_date": "2026-10-31",
      "preferred_start_minute": 960,
      "preferred_end_minute": 1080,
      "created_at": "2026-10-25T13:30:00.000Z"
    }
  ]
}
```

---

## Provider Scheduling Endpoints

Base path: `/api/providers`

### 11. Get Provider Real-Time Available Slots

Generates 1-hour time slots for a specified provider, date, and category. Evaluates weekday availability against active bookings in `provider_bookings`.

- **Method:** `GET`
- **Path:** `/api/providers/:id/slots`
- **Authentication:** None (Public)
- **Query Parameters:**
  - `date` (`YYYY-MM-DD`, required): The target service date.
  - `category_slug` (string, required): Service category slug to verify coverage and retrieve pricing.

#### Response

- **Status Code:** `200 OK`
- **Body:**

```json
{
  "ok": true,
  "provider": {
    "id": 2,
    "name": "Rahim Electronics & AC Care",
    "rating": 4.8,
    "rating_count": 115,
    "headline": "Senior HVAC & Refrigerator Technician",
    "address": "Green Road, Dhanmondi, Dhaka",
    "price": 950
  },
  "date": "2026-10-31",
  "slots": [
    {
      "start_minute": 600,
      "end_minute": 660,
      "available": true,
      "label": "10:00–11:00"
    },
    {
      "start_minute": 660,
      "end_minute": 720,
      "available": true,
      "label": "11:00–12:00"
    },
    {
      "start_minute": 720,
      "end_minute": 780,
      "available": false,
      "label": "12:00–13:00"
    }
  ]
}
```

