# HutFix — Complete REST API Specification

---

## 1. Health
### `GET /api/health`
- **Auth**: None (Public)
- **Role**: Any
- **Response `200 OK`**:
```json
{
  "ok": true,
  "db": "connected"
}
```

---

## 2. Authentication
### `POST /api/auth/register`
- **Auth**: None
- **Body**:
```json
{
  "email": "user@example.com",
  "password": "SecretPassword123",
  "full_name": "Rahim Khan",
  "role": "customer",
  "phone": "+8801700000000"
}
```
- **Response `201 Created`**:
```json
{
  "ok": true,
  "user": {
    "id": "4",
    "email": "user@example.com",
    "role": "customer",
    "full_name": "Rahim Khan",
    "phone": "+8801700000000",
    "created_at": "2026-10-25T12:00:00.000Z"
  }
}
```

### `POST /api/auth/login`
- **Auth**: None
- **Body**:
```json
{
  "email": "customer@demo.test",
  "password": "demo1234"
}
```
- **Response `200 OK`** (Sets HTTP-only `hutfix_token` cookie):
```json
{
  "ok": true,
  "user": {
    "id": "1",
    "email": "customer@demo.test",
    "role": "customer",
    "full_name": "Demo Customer",
    "phone": "+8801700000001",
    "created_at": "2026-10-25T12:00:00.000Z"
  }
}
```
- **Errors**: `400 Bad Request` (`email and password required`), `401 Unauthorized` (`invalid credentials`).

### `POST /api/auth/logout`
- **Auth**: None
- **Response `200 OK`**:
```json
{
  "ok": true
}
```

### `GET /api/auth/me`
- **Auth**: Required (`hutfix_token` cookie or Bearer token)
- **Response `200 OK`**:
```json
{
  "ok": true,
  "user": {
    "id": "1",
    "email": "customer@demo.test",
    "role": "customer",
    "full_name": "Demo Customer",
    "phone": "+8801700000001",
    "created_at": "2026-10-25T12:00:00.000Z"
  }
}
```
- **Errors**: `401 Unauthorized` (`auth required`).

---

## 3. Services Catalog
### `GET /api/services`
- **Auth**: None (Public)
- **Response `200 OK`**:
```json
{
  "ok": true,
  "categories": [
    {
      "id": "1",
      "slug": "appliance-repair",
      "name": "Appliance & Gadget Repair",
      "description": "Expert repair for ACs, refrigerators, washing machines, and microwave ovens.",
      "icon": "bi-tools",
      "base_price": "800.00",
      "is_active": true
    }
  ]
}
```

---

## 4. Providers & Slots
### `GET /api/providers/:id/slots?date=YYYY-MM-DD&category=slug`
- **Auth**: None (Public)
- **Query Params**: `date` (`YYYY-MM-DD`), `category` (`appliance-repair`)
- **Response `200 OK`**:
```json
{
  "ok": true,
  "provider_id": 1,
  "date": "2026-11-21",
  "slots": [
    {
      "start_minute": 540,
      "end_minute": 600,
      "start_label": "09:00",
      "end_label": "10:00",
      "available": true
    },
    {
      "start_minute": 600,
      "end_minute": 660,
      "start_label": "10:00",
      "end_label": "11:00",
      "available": false
    }
  ]
}
```

---

## 5. Requests
### `POST /api/requests/match`
- **Auth**: Required
- **Body**:
```json
{
  "category_slug": "appliance-repair",
  "preferred_date": "2026-11-21",
  "preferred_start_minute": 600,
  "preferred_end_minute": 660,
  "urgency": "normal",
  "address": "Dhanmondi, Dhaka",
  "latitude": 23.7465,
  "longitude": 90.3760
}
```
- **Response `200 OK`**:
```json
{
  "ok": true,
  "candidates": [
    {
      "provider": {
        "id": "2",
        "name": "Rahim Electronics & AC Care",
        "rating": 4.8,
        "rating_count": 115,
        "address": "Green Road, Dhanmondi, Dhaka",
        "headline": "Senior HVAC & Refrigerator Technician",
        "years_experience": 8,
        "distance_km": 1.2,
        "price": 950,
        "workload_slots_used": 1
      },
      "score": 0.8875,
      "breakdown": {
        "availability": 1,
        "rating": 0.96,
        "distance": 0.94,
        "price": 1,
        "workload": 0.8
      }
    }
  ]
}
```

### `POST /api/requests`
- **Auth**: Required (`customer`)
- **Content-Type**: `multipart/form-data` or `application/json`
- **Fields**: `category_slug`, `provider_id`, `preferred_date`, `preferred_start_minute`, `preferred_end_minute`, `urgency`, `address`, `description`, `contact_phone`, `image` (file).
- **Response `200 OK`**:
```json
{
  "ok": true,
  "request": {
    "id": "29",
    "customer_id": "1",
    "category_id": "1",
    "assigned_provider_id": "2",
    "description": "AC cooling problem",
    "urgency": "normal",
    "address": "Dhanmondi, Dhaka",
    "latitude": null,
    "longitude": null,
    "preferred_date": "2026-11-21",
    "preferred_start_minute": 600,
    "preferred_end_minute": 660,
    "contact_phone": "+8801700000001",
    "image_url": null,
    "status": "requested",
    "estimated_price": "950.00",
    "created_at": "2026-10-25T14:00:00.000Z",
    "updated_at": "2026-10-25T14:00:00.000Z"
  }
}
```
- **Errors**: `409 Conflict` (slot already booked, includes `suggestions` array).

### `GET /api/requests/mine`
- **Auth**: Required
- **Response `200 OK`**:
```json
{
  "ok": true,
  "requests": [
    {
      "id": "29",
      "customer_id": "1",
      "category_id": "1",
      "status": "requested",
      "estimated_price": "950.00"
    }
  ]
}
```

### `GET /api/requests/:id`
- **Auth**: Required (scoped to owner, assigned provider, or admin)
- **Response `200 OK`**:
```json
{
  "ok": true,
  "request": {
    "id": "29",
    "customer_id": "1",
    "category_id": "1",
    "assigned_provider_id": "2",
    "status": "completed",
    "estimated_price": "950.00",
    "category_slug": "appliance-repair",
    "category_name": "Appliance & Gadget Repair",
    "category_icon": "bi-tools",
    "provider_name": "Rahim Electronics & AC Care",
    "provider_phone": "+8801711000001"
  },
  "events": [
    { "id": "43", "status": "requested", "note": "Request submitted", "created_at": "2026-10-25T14:00:00.000Z" },
    { "id": "44", "status": "accepted", "note": "Accepted by provider", "created_at": "2026-10-25T14:01:00.000Z" }
  ],
  "invoice": {
    "id": "1",
    "request_id": "29",
    "provider_id": "2",
    "subtotal": "950.00",
    "tax": "47.50",
    "total": "997.50",
    "currency": "BDT"
  },
  "rating": {
    "id": "1",
    "request_id": "29",
    "stars": 5,
    "comment": "Fast and clean work."
  }
}
```

### `POST /api/requests/:id/cancel`
- **Auth**: Required (Customer owner only)
- **Response `200 OK`**: Returns updated request object with status `cancelled`.

### `POST /api/requests/:id/accept`
- **Auth**: Required (Assigned Provider only)
- **Response `200 OK`**: Returns updated request object with status `accepted`.

### `POST /api/requests/:id/reject`
- **Auth**: Required (Assigned Provider only)
- **Response `200 OK`**: Returns updated request object with status `cancelled` and releases slot.

### `PATCH /api/requests/:id/status`
- **Auth**: Required (Assigned Provider only)
- **Body**: `{ "status": "on_the_way" | "in_progress" | "completed" }`
- **Response `200 OK`**: Returns updated request object.
- **Errors**: `400 Bad Request` (`invalid transition from X to Y`).

---

## 6. Provider Dashboard
### `GET /api/provider/requests?bucket={incoming|active|history}`
- **Auth**: Required (`provider`)
- **Response `200 OK`**:
```json
{
  "ok": true,
  "bucket": "incoming",
  "requests": [
    {
      "id": "29",
      "customer_id": "1",
      "status": "requested",
      "customer_name": "Demo Customer",
      "customer_phone": "+8801700000001"
    }
  ]
}
```

---

## 7. Invoices
### `GET /api/invoices/by-request/:requestId`
- **Auth**: Required (Customer owner, Assigned provider, or Admin)
- **Response `200 OK`**:
```json
{
  "ok": true,
  "invoice": {
    "id": "1",
    "request_id": "29",
    "provider_id": "2",
    "subtotal": "950.00",
    "tax": "47.50",
    "total": "997.50",
    "currency": "BDT",
    "issued_at": "2026-10-25T14:15:00.000Z",
    "customer_name": "Demo Customer",
    "customer_phone": "+8801700000001",
    "provider_name": "Rahim Electronics & AC Care",
    "provider_phone": "+8801711000001",
    "provider_address": "Green Road, Dhanmondi, Dhaka",
    "category_name": "Appliance & Gadget Repair"
  }
}
```
- **Errors**: `403 Forbidden`, `404 Not Found`.

---

## 8. Ratings
### `POST /api/ratings/by-request/:requestId`
- **Auth**: Required (`customer` owner only)
- **Body**:
```json
{
  "stars": 5,
  "comment": "Super quick response and fixed the cooling perfectly."
}
```
- **Response `200 OK`**:
```json
{
  "ok": true,
  "rating": {
    "id": "1",
    "request_id": "29",
    "customer_id": "1",
    "provider_id": "2",
    "stars": 5,
    "comment": "Super quick response and fixed the cooling perfectly.",
    "created_at": "2026-10-25T14:20:00.000Z"
  },
  "provider_rating": 4.8,
  "provider_rating_count": 116
}
```
- **Errors**: `400 Bad Request` (`can only rate completed requests`, `stars must be an integer between 1 and 5`), `409 Conflict` (`already rated`).

---

## 9. Notifications
### `GET /api/notifications`
- **Auth**: Required
- **Response `200 OK`**:
```json
{
  "ok": true,
  "notifications": [
    {
      "id": "1",
      "kind": "request_accepted",
      "title": "Your request was accepted",
      "body": "Provider is on the way soon.",
      "is_read": false,
      "request_id": "29",
      "created_at": "2026-10-25T14:05:00.000Z"
    }
  ],
  "unread_count": 1
}
```

### `POST /api/notifications/read`
- **Auth**: Required
- **Body**: `{ "id": 1 }`
- **Response `200 OK`**:
```json
{
  "ok": true,
  "id": "1"
}
```

### `POST /api/notifications/read-all`
- **Auth**: Required
- **Response `200 OK`**:
```json
{
  "ok": true,
  "updated": 1
}
```

---

## 10. Admin Endpoints
### `GET /api/admin/stats`
- **Auth**: Required
- **Role**: `admin`
- **Response `200 OK`**:
```json
{
  "ok": true,
  "stats": {
    "total_bookings": 12,
    "completed_bookings": 8,
    "gross_volume": 12450.00,
    "platform_revenue": 622.50,
    "total_providers": 11,
    "total_users": 14,
    "pending_requests": 2
  },
  "providers": [
    {
      "id": 1,
      "name": "Rahim Electronics",
      "address": "Dhanmondi, Dhaka",
      "rating": 4.8,
      "rating_count": 115,
      "price_per_hour": 500,
      "category": "Appliance & Gadget Repair"
    }
  ],
  "users": [
    {
      "id": 1,
      "name": "Demo Customer",
      "email": "customer@demo.test",
      "role": "customer",
      "phone": "+8801700000001",
      "created_at": "2026-10-25T12:00:00.000Z"
    }
  ]
}
```
- **Errors**: `401 Unauthorized` (`auth required`), `403 Forbidden` (`role required: admin`).

### `GET /api/admin/users`
- **Auth**: Required
- **Role**: `admin`
- **Response `200 OK`**:
```json
{
  "ok": true,
  "users": [
    {
      "id": 1,
      "email": "customer@demo.test",
      "full_name": "Demo Customer",
      "phone": "+8801700000001",
      "role": "customer",
      "created_at": "2026-10-25T12:00:00.000Z"
    }
  ]
}
```
- **Errors**: `401 Unauthorized`, `403 Forbidden`.

### `GET /api/admin/bookings`
- **Auth**: Required
- **Role**: `admin`
- **Response `200 OK`**:
```json
{
  "ok": true,
  "bookings": [
    {
      "id": 1,
      "status": "completed",
      "estimated_price": 950.00,
      "preferred_date": "2026-10-31",
      "preferred_start_minute": 960,
      "category_name": "Appliance & Gadget Repair",
      "customer_name": "Demo Customer",
      "provider_name": "Rahim Electronics"
    }
  ]
}
```
- **Errors**: `401 Unauthorized`, `403 Forbidden`.

---

## 11. Provider Profile & Invoices
### `GET /api/providers/:userId/profile`
- **Auth**: Required
- **Role**: `provider` (own profile) or `admin`
- **Response `200 OK`**:
```json
{
  "ok": true,
  "provider": {
    "id": 1,
    "user_id": 2,
    "full_name": "Rahim Electronics & AC Care",
    "headline": "Master HVAC & Appliance Specialist",
    "bio": "Certified Master Technician with over 8 years experience.",
    "rating": 4.8,
    "rating_count": 115,
    "address": "Dhanmondi, Dhaka",
    "years_experience": 8,
    "services": [
      {
        "category_id": 1,
        "category_slug": "appliance-repair",
        "category_name": "Appliance & Gadget Repair",
        "price": 950.00
      }
    ]
  }
}
```
- **Errors**: `400 Bad Request` (`invalid user id`), `401 Unauthorized`, `403 Forbidden` (`cannot view other provider profile`), `404 Not Found`.

### `GET /api/invoices/mine`
- **Auth**: Required
- **Role**: `provider`
- **Response `200 OK`**:
```json
{
  "ok": true,
  "invoices": [
    {
      "id": 1,
      "invoice_number": "INV-2026-0001",
      "request_id": 14,
      "subtotal": 950.00,
      "tax": 47.50,
      "total": 997.50,
      "currency": "BDT",
      "issued_at": "2026-10-25T14:30:00.000Z",
      "category_name": "Appliance & Gadget Repair",
      "customer_name": "Demo Customer"
    }
  ],
  "totals": {
    "count": 1,
    "sum_total": 997.50
  }
}
```
- **Errors**: `401 Unauthorized`, `403 Forbidden` (`role required: provider`).

