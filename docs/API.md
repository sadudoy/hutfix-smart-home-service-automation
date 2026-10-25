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
