# DevBench Manager - API Documentation

## Base URL

```
http://localhost:9090
https://tbm.nabd-co.com
```

## Authentication

All API endpoints (except `/login` and `/health`) require authentication via session cookies.

### Session Cookie
- **Name**: `connect.sid`
- **Type**: HTTP-only
- **Secure**: true (in production with HTTPS)
- **SameSite**: Lax

## Endpoints

### Health Check

#### GET /health

Check application health status.

**Authentication**: Not required

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-23T12:00:00.000Z",
  "version": "1.0.0"
}
```

**Status Codes**:
- `200`: Application is healthy

---

### Authentication

#### GET /login

Display login page.

**Authentication**: Not required

**Response**: HTML page

---

#### POST /login

Authenticate user and create session.

**Authentication**: Not required

**Request Body**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response**: Redirect to `/dashboard` or `/admin`

**Status Codes**:
- `302`: Success, redirect to dashboard
- `200`: Failed, re-render login with error

---

#### GET /logout

Destroy session and logout user.

**Authentication**: Required

**Response**: Redirect to `/login`

**Status Codes**:
- `302`: Success, redirect to login

---

### User Dashboard

#### GET /dashboard

Display user's DevBench dashboard.

**Authentication**: Required (User role)

**Response**: HTML page with user's DevBenches

**Status Codes**:
- `200`: Success
- `302`: Redirect to `/admin` if user is admin
- `302`: Redirect to `/login` if not authenticated

---

#### GET /help

Display help page with SSH configuration guide.

**Authentication**: Required

**Response**: HTML page with documentation

**Status Codes**:
- `200`: Success
- `302`: Redirect to `/login` if not authenticated

---

### DevBench Management

#### POST /create-devbench

Create a new DevBench.

**Authentication**: Required (User role)

**Request Body**:
```json
{
  "name": "test-vm"
}
```

**Validation**:
- Name must match pattern: `[a-zA-Z0-9_-]+`
- Name must be unique for user

**Response**:
```json
{
  "success": true,
  "devbenchId": 123
}
```

**Error Response**:
```json
{
  "error": "DevBench with this name already exists"
}
```

**Status Codes**:
- `200`: Success
- `400`: Validation error
- `500`: Database error

**Side Effects**:
- Creates database record with status "creating"
- Spawns provision script execution
- Sends real-time updates via WebSocket

---

#### POST /delete-devbench/:id

Delete a DevBench.

**Authentication**: Required (User role, owner only)

**Parameters**:
- `id`: DevBench ID (integer)

**Response**:
```json
{
  "success": true
}
```

**Error Response**:
```json
{
  "error": "DevBench not found"
}
```

**Status Codes**:
- `200`: Success
- `404`: DevBench not found
- `500`: Database error

**Side Effects**:
- Executes delete command on remote host
- Removes database record

---

#### POST /activate-devbench/:id

Activate a DevBench.

**Authentication**: Required (User role, owner only)

**Parameters**:
- `id`: DevBench ID (integer)

**Response**:
```json
{
  "success": true
}
```

**Error Response**:
```json
{
  "error": "DevBench not found"
}
```

**Status Codes**:
- `200`: Success
- `404`: DevBench not found

**Side Effects**:
- Executes activate command on remote host
- Updates status via WebSocket

---

#### GET /check-status/:id

Check DevBench status.

**Authentication**: Required (User role, owner only)

**Parameters**:
- `id`: DevBench ID (integer)

**Response**:
```json
{
  "status": "active"
}
```

**Possible Status Values**:
- `active`: VM is running
- `inactive`: VM is stopped
- `creating`: VM is being created
- `error`: VM creation failed
- `unknown`: Status cannot be determined

**Status Codes**:
- `200`: Success

**Side Effects**:
- Updates database with current status

---

### Admin Panel

#### GET /admin

Display admin dashboard.

**Authentication**: Required (Admin role)

**Response**: HTML page with users and DevBenches

**Status Codes**:
- `200`: Success
- `403`: Access denied (not admin)
- `302`: Redirect to `/login` if not authenticated

---

#### POST /admin/add-user

Create a new user.

**Authentication**: Required (Admin role)

**Request Body**:
```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "password123"
}
```

**Validation**:
- Username must match pattern: `[a-zA-Z]+` (letters only)
- Username must be unique
- Email must be valid format
- Password required

**Response**:
```json
{
  "success": true
}
```

**Error Response**:
```json
{
  "error": "Username already exists"
}
```

**Status Codes**:
- `200`: Success
- `400`: Validation error
- `500`: Database error

---

#### POST /admin/delete-user/:id

Delete a user and all their DevBenches.

**Authentication**: Required (Admin role)

**Parameters**:
- `id`: User ID (integer)

**Response**:
```json
{
  "success": true
}
```

**Error Response**:
```json
{
  "error": "Database error"
}
```

**Status Codes**:
- `200`: Success
- `500`: Database error

**Side Effects**:
- Deletes all user's DevBenches
- Deletes user record
- Cannot delete admin users

---

#### POST /admin/reset-password/:id

Reset user password.

**Authentication**: Required (Admin role)

**Parameters**:
- `id`: User ID (integer)

**Request Body**:
```json
{
  "newPassword": "newpassword123"
}
```

**Response**:
```json
{
  "success": true
}
```

**Error Response**:
```json
{
  "error": "Database error"
}
```

**Status Codes**:
- `200`: Success
- `500`: Database error

**Side Effects**:
- Updates user password (hashed with bcrypt)
- Cannot reset admin passwords

---

### User Info

#### GET /api/user-info

Get current user information for WebSocket registration.

**Authentication**: Required

**Response**:
```json
{
  "userId": 1,
  "username": "admin",
  "isAdmin": true
}
```

**Status Codes**:
- `200`: Success
- `302`: Redirect to `/login` if not authenticated

---

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('ws://localhost:9090');
```

### Registration

After connection, register with user ID:

```javascript
ws.send(JSON.stringify({
  type: 'register',
  userId: 1
}));
```

### Message Types

#### script_output

Real-time output from provision script.

```json
{
  "type": "script_output",
  "devbenchId": 123,
  "data": "Cloning VM...\n"
}
```

#### script_complete

Script execution completed.

```json
{
  "type": "script_complete",
  "devbenchId": 123,
  "exitCode": 0
}
```

#### status_update

DevBench status changed.

```json
{
  "type": "status_update",
  "devbenchId": 123,
  "status": "active"
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- `200`: Success
- `302`: Redirect
- `400`: Bad Request (validation error)
- `401`: Unauthorized (not authenticated)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

---

## Rate Limiting

Currently not implemented. Consider adding rate limiting for production:

- Login attempts: 5 per minute
- DevBench creation: 10 per hour per user
- API calls: 100 per minute per user

---

## Data Models

### User

```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "password": "$2a$10$...", // bcrypt hash
  "is_admin": 1,
  "created_at": "2025-11-23T12:00:00.000Z"
}
```

### DevBench

```json
{
  "id": 1,
  "user_id": 1,
  "name": "test-vm",
  "actual_name": "admin_test-vm",
  "status": "active",
  "ssh_info": "6004",
  "vnc_info": "5004",
  "created_at": "2025-11-23T12:00:00.000Z",
  "updated_at": "2025-11-23T12:05:00.000Z"
}
```

---

## Examples

### Create DevBench with cURL

```bash
# Login first to get session cookie
curl -c cookies.txt -X POST http://localhost:9090/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"

# Create DevBench
curl -b cookies.txt -X POST http://localhost:9090/create-devbench \
  -H "Content-Type: application/json" \
  -d '{"name":"test-vm"}'
```

### Check Status with cURL

```bash
curl -b cookies.txt http://localhost:9090/check-status/1
```

### Add User with cURL

```bash
curl -b cookies.txt -X POST http://localhost:9090/admin/add-user \
  -H "Content-Type: application/json" \
  -d '{
    "username":"john",
    "email":"john@example.com",
    "password":"password123"
  }'
```

### WebSocket with JavaScript

```javascript
// Connect
const ws = new WebSocket('ws://localhost:9090');

// Register
ws.onopen = () => {
  fetch('/api/user-info')
    .then(res => res.json())
    .then(data => {
      ws.send(JSON.stringify({
        type: 'register',
        userId: data.userId
      }));
    });
};

// Listen for messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
  
  if (message.type === 'script_output') {
    // Update UI with script output
    document.getElementById('log').textContent += message.data;
  }
};
```

---

## Security Considerations

### Authentication
- Session-based authentication
- HTTP-only cookies
- Password hashing with bcrypt (10 rounds)

### Authorization
- Role-based access control (Admin/User)
- Owner-only access to DevBenches
- Admin-only routes protected

### Input Validation
- Username: Letters only
- DevBench name: Alphanumeric, hyphens, underscores
- SQL injection prevention: Parameterized queries
- XSS prevention: EJS auto-escaping

### Best Practices
- Always use HTTPS in production
- Change default admin password
- Use strong session secret
- Implement rate limiting
- Add CSRF protection
- Enable security headers

---

## Changelog

### Version 1.0.0 (2025-11-23)
- Initial API release
- User authentication
- DevBench management
- Admin panel
- WebSocket support
- Help page
- Dark theme support
