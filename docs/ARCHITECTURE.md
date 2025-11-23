# DevBench Manager - Architecture Documentation

## System Overview

DevBench Manager is a web-based application for managing virtual machine (VM) development environments. It provides a centralized interface for users to create, manage, and access their DevBench VMs through a secure web portal.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Dashboard  │  │  Admin Panel │  │  Help Page   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS/WSS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Caddy Reverse Proxy                         │
│                   (tbm.nabd-co.com)                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DevBench Manager Container                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Express.js Server                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │   Routes   │  │ WebSocket  │  │   Auth     │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    SQLite Database                        │  │
│  │  ┌────────────┐  ┌────────────┐                          │  │
│  │  │   Users    │  │ DevBenches │                          │  │
│  │  └────────────┘  └────────────┘                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Provision Script Executor                    │  │
│  │                (provision_vm.sh)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ SSH (Port 49152)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Remote VM Host Server                         │
│                  (asf-server.duckdns.org)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  VirtualBox Manager                       │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐         │  │
│  │  │  VM 1  │  │  VM 2  │  │  VM 3  │  │  VM N  │         │  │
│  │  │ SSH:   │  │ SSH:   │  │ SSH:   │  │ SSH:   │         │  │
│  │  │ 6001   │  │ 6002   │  │ 6003   │  │ 600N   │         │  │
│  │  │ VNC:   │  │ VNC:   │  │ VNC:   │  │ VNC:   │         │  │
│  │  │ 5001   │  │ 5002   │  │ 5003   │  │ 500N   │         │  │
│  │  └────────┘  └────────┘  └────────┘  └────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Frontend Layer

#### Technologies
- **EJS Templates**: Server-side rendering
- **Bootstrap 5**: UI framework
- **Font Awesome**: Icons
- **Custom CSS**: Theming (light/dark mode)
- **Vanilla JavaScript**: Client-side interactivity

#### Components
- **Dashboard**: User's DevBench management interface
- **Admin Panel**: User and system management
- **Help Page**: Documentation and SSH config guide
- **Login Page**: Authentication interface

### 2. Backend Layer

#### Technologies
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **WebSocket (ws)**: Real-time communication
- **SQLite3**: Database
- **bcryptjs**: Password hashing
- **express-session**: Session management

#### Core Modules

##### Authentication Module
```javascript
- Session-based authentication
- Password hashing with bcrypt
- Role-based access control (Admin/User)
- Middleware for route protection
```

##### DevBench Management Module
```javascript
- Create DevBench
- Delete DevBench
- Activate DevBench
- Status monitoring
- Real-time log streaming
```

##### WebSocket Module
```javascript
- Real-time script output
- Status updates
- User-specific broadcasting
- Connection management
```

##### Provision Script Executor
```javascript
- SSH connection to remote host
- Script execution via sshpass
- Output parsing
- Error handling
- Timeout management (30 minutes)
```

### 3. Database Layer

#### Schema

**Users Table**
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**DevBenches Table**
```sql
CREATE TABLE devbenches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    actual_name TEXT,
    status TEXT DEFAULT 'inactive',
    ssh_info TEXT,
    vnc_info TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
)
```

### 4. Infrastructure Layer

#### Docker Container
```yaml
- Base Image: Node.js 18
- Exposed Port: 3001 (mapped to 9090)
- Volumes:
  - ./data:/app/data (Database persistence)
  - ./logs:/app/logs (Log files)
  - ./provision_vm.sh:/app/provision_vm.sh (Script)
- Networks:
  - app-network (Internal)
  - caddy_network (External proxy)
```

#### Reverse Proxy (Caddy)
```
- Domain: tbm.nabd-co.com
- SSL/TLS: Automatic (Let's Encrypt)
- Proxy Target: devbench-manager:3001
```

## Data Flow

### DevBench Creation Flow

```
1. User clicks "Create DevBench"
   ↓
2. Frontend sends POST /create-devbench
   ↓
3. Backend validates input
   ↓
4. Database record created (status: creating)
   ↓
5. WebSocket connection established
   ↓
6. provision_vm.sh executed via SSH
   ↓
7. Real-time output streamed via WebSocket
   ↓
8. Script parses VM info (name, SSH port, VNC port)
   ↓
9. Database updated with connection info
   ↓
10. Frontend receives completion notification
   ↓
11. Page refreshes to show active DevBench
```

### Authentication Flow

```
1. User submits login form
   ↓
2. Backend validates credentials
   ↓
3. Password compared with bcrypt
   ↓
4. Session created on success
   ↓
5. User redirected to dashboard/admin
   ↓
6. Session cookie stored in browser
   ↓
7. Subsequent requests include session
   ↓
8. Middleware validates session
```

### Status Monitoring Flow

```
1. Periodic check (every 60 seconds)
   ↓
2. For each DevBench in database
   ↓
3. Execute provision_vm.sh status <vm_name>
   ↓
4. Parse output for status
   ↓
5. Update database if changed
   ↓
6. Broadcast update via WebSocket
   ↓
7. Frontend updates UI in real-time
```

## Security Architecture

### Authentication & Authorization
- **Password Hashing**: bcrypt with salt rounds
- **Session Management**: Secure HTTP-only cookies
- **Role-Based Access**: Admin vs User permissions
- **Route Protection**: Middleware guards

### Input Validation
- **Username**: Letters only, no special characters
- **DevBench Name**: Alphanumeric, hyphens, underscores
- **SQL Injection**: Parameterized queries
- **XSS Prevention**: EJS auto-escaping

### Network Security
- **HTTPS**: Enforced via Caddy
- **SSH**: Password-based (sshpass) with timeout
- **Container Isolation**: Docker networking
- **Port Exposure**: Minimal (only 9090)

## Scalability Considerations

### Current Limitations
- Single SQLite database (not suitable for high concurrency)
- SSH-based provisioning (sequential, not parallel)
- In-memory WebSocket connections (lost on restart)
- Single container deployment

### Future Improvements
- **Database**: Migrate to PostgreSQL/MySQL
- **Queue System**: Redis/RabbitMQ for async jobs
- **Load Balancing**: Multiple container instances
- **Persistent WebSocket**: Redis pub/sub
- **Caching**: Redis for session and status data

## Monitoring & Logging

### Application Logs
- Location: `/app/logs/`
- Format: Timestamped console output
- Rotation: Manual (not automated)

### Provision Script Logs
- Location: `/var/log/devbench/`
- Format: Timestamped with operation details
- Retention: Indefinite

### Health Checks
- Endpoint: `/health`
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | EJS, Bootstrap 5, JavaScript | UI rendering and interactivity |
| Backend | Node.js, Express.js | Web server and API |
| Real-time | WebSocket (ws) | Live updates |
| Database | SQLite3 | Data persistence |
| Authentication | bcryptjs, express-session | Security |
| Container | Docker, Docker Compose | Deployment |
| Proxy | Caddy | SSL/TLS and routing |
| VM Management | Bash, SSH, VirtualBox | VM provisioning |

## Deployment Architecture

### Production Environment
```
Internet
   ↓
Caddy (Port 443) → SSL Termination
   ↓
Docker Network (caddy_network)
   ↓
DevBench Manager Container (Port 3001)
   ↓
SQLite Database (Volume: ./data)
   ↓
SSH Connection (Port 49152)
   ↓
Remote VM Host
```

### Development Environment
```
localhost:9090
   ↓
DevBench Manager Container
   ↓
Local SQLite Database
   ↓
SSH to Remote Host
```

## Configuration Management

### Environment Variables
- `NODE_ENV`: production/development
- `PORT`: Application port (default: 3001)
- `SECRET_KEY`: Session secret
- `ADMIN_EMAIL`: Default admin email
- `ADMIN_PASSWORD`: Default admin password

### Configuration Files
- `config.js`: Application configuration
- `docker-compose.yml`: Container orchestration
- `Dockerfile`: Container build instructions
- `.env`: Environment variables (optional)

## Error Handling

### Application Errors
- Database errors: Logged and returned as 500
- Authentication errors: Returned as 401/403
- Validation errors: Returned as 400
- Script errors: Logged and broadcast via WebSocket

### Script Errors
- Timeout: 30 minutes (1800 seconds)
- SSH failures: Logged and status set to 'error'
- Parsing failures: Status set to 'error'
- Network issues: Retry not implemented

## Performance Considerations

### Bottlenecks
1. **SSH Connection**: Sequential, blocking
2. **Script Execution**: Long-running (up to 30 min)
3. **Status Checks**: Every 60 seconds for all VMs
4. **SQLite**: Limited concurrent writes

### Optimizations
- WebSocket for real-time updates (no polling)
- Session caching in memory
- Static asset serving via Express
- Minimal database queries

## Maintenance & Operations

### Backup Strategy
- Database: Copy `./data/devbench.db`
- Logs: Archive `./logs/` directory
- Configuration: Version control

### Update Procedure
1. Pull latest code
2. Run `./deploy.sh`
3. Verify health endpoint
4. Check logs for errors

### Troubleshooting
- Check container logs: `docker-compose logs -f`
- Verify network: `docker network inspect caddy_network`
- Test SSH: `ssh -p 49152 asf@asf-server.duckdns.org`
- Check database: `sqlite3 data/devbench.db`
