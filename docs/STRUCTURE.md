# DevBench Manager - Project Structure

## Directory Tree

```
ASF_devbench/
├── docs/                           # Documentation
│   ├── ARCHITECTURE.md            # System architecture
│   ├── STRUCTURE.md               # This file
│   ├── DEPLOYMENT.md              # Deployment guide
│   └── API.md                     # API documentation
│
├── public/                         # Static assets
│   ├── css/
│   │   └── style.css              # Custom styles + dark theme
│   ├── images/
│   │   ├── nabd-logo.svg          # Company logo (light)
│   │   ├── nabd-logo-white.svg    # Company logo (dark)
│   │   └── tbm-icon.png           # TBM branding icon
│   └── downloads/
│       └── db_vm_ssh_config_manager.exe  # SSH config tool
│
├── views/                          # EJS templates
│   ├── layout.ejs                 # Base layout with navbar
│   ├── login.ejs                  # Login page
│   ├── dashboard.ejs              # User dashboard
│   ├── admin.ejs                  # Admin panel
│   └── help.ejs                   # Help/documentation page
│
├── data/                           # Database storage (created on deploy)
│   └── devbench.db                # SQLite database
│
├── logs/                           # Application logs (created on deploy)
│   └── *.log                      # Log files
│
├── server.js                       # Main application server
├── config.js                       # Configuration settings
├── package.json                    # Node.js dependencies
├── provision_vm.sh                 # VM provisioning script
│
├── Dockerfile                      # Docker image definition
├── docker-compose.yml              # Container orchestration
├── .dockerignore                   # Docker build exclusions
│
├── deploy.sh                       # Deployment script
├── install.sh                      # Local installation script
├── start.sh                        # Start script (Docker/Node)
├── cleanup.sh                      # Cleanup script
│
├── .env.example                    # Environment variables template
├── .gitignore                      # Git exclusions
├── README.md                       # Main documentation
└── CHANGELOG.md                    # Change history
```

## File Descriptions

### Core Application Files

#### `server.js`
**Purpose**: Main Express.js application server

**Key Components**:
- Express app initialization
- Database setup and schema
- Route definitions
- WebSocket server
- Authentication middleware
- DevBench management logic
- Provision script executor
- Status monitoring (60-second interval)

**Dependencies**:
- express
- express-session
- sqlite3
- bcryptjs
- ws (WebSocket)
- child_process (for script execution)

**Key Functions**:
```javascript
- requireAuth()           // Authentication middleware
- requireAdmin()          // Admin authorization middleware
- executeProvisionScript() // Execute VM provisioning
- broadcastToUser()       // WebSocket messaging
```

#### `config.js`
**Purpose**: Centralized configuration

**Settings**:
- Server port
- Database path
- Session configuration
- Default admin credentials
- Validation patterns
- Provision script settings

#### `provision_vm.sh`
**Purpose**: VM provisioning and management

**Commands**:
- `create <vm_name>`: Create new VM
- `status <vm_name>`: Check VM status
- `delete <vm_name>`: Delete VM
- `activate <vm_name>`: Activate VM
- `start <vm_name>`: Start VM
- `stop <vm_name>`: Stop VM

**Features**:
- SSH connection to remote host
- Output logging
- Connection info extraction
- Error handling
- Timeout management (30 minutes)

### Frontend Files

#### `views/layout.ejs`
**Purpose**: Base template for all pages

**Features**:
- Navigation bar with logo
- Help link
- Theme toggle button
- WebSocket initialization
- Bootstrap and Font Awesome imports
- Dark theme JavaScript

#### `views/dashboard.ejs`
**Purpose**: User dashboard

**Features**:
- DevBench list with cards
- Create DevBench modal
- Connection info display (SSH/VNC ports)
- Real-time log output
- Status indicators
- Copy-to-clipboard functionality

#### `views/admin.ejs`
**Purpose**: Admin panel

**Features**:
- User management table
- Add user modal
- DevBench overview table
- Password reset
- User deletion
- DevBench deletion

#### `views/help.ejs`
**Purpose**: Help and documentation

**Features**:
- SSH Config Manager guide
- Step-by-step instructions
- Download link for tool
- Connection information
- Important notes

#### `views/login.ejs`
**Purpose**: Authentication page

**Features**:
- Login form
- Error messages
- Branding

### Static Assets

#### `public/css/style.css`
**Purpose**: Custom styling

**Features**:
- NABD brand colors
- Dark theme styles
- Component styling
- Responsive design
- Smooth transitions

#### `public/images/`
**Purpose**: Image assets

**Files**:
- `nabd-logo.svg`: Light theme logo
- `nabd-logo-white.svg`: Dark theme logo
- `tbm-icon.png`: Branding icon and favicon

#### `public/downloads/`
**Purpose**: Downloadable files

**Files**:
- `db_vm_ssh_config_manager.exe`: SSH configuration tool

### Deployment Files

#### `Dockerfile`
**Purpose**: Docker image definition

**Base Image**: node:18-alpine

**Steps**:
1. Set working directory
2. Copy package files
3. Install dependencies
4. Copy application files
5. Create data/logs directories
6. Expose port 3001
7. Set start command

#### `docker-compose.yml`
**Purpose**: Container orchestration

**Configuration**:
- Service: devbench-manager
- Port mapping: 9090:3001
- Volumes: data, logs, provision script
- Networks: app-network, caddy_network
- Health check: /health endpoint
- Restart policy: unless-stopped

#### `deploy.sh`
**Purpose**: Automated deployment

**Steps**:
1. Create directories
2. Set permissions
3. Clean up old containers
4. Create Docker network
5. Build and start container
6. Wait for startup
7. Verify health
8. Display access information

### Configuration Files

#### `package.json`
**Purpose**: Node.js project configuration

**Scripts**:
- `start`: Run production server
- `dev`: Run with nodemon (auto-reload)

**Dependencies**:
- express: Web framework
- express-session: Session management
- bcryptjs: Password hashing
- sqlite3: Database
- body-parser: Request parsing
- ejs: Template engine
- ws: WebSocket
- child_process: Script execution

#### `.env.example`
**Purpose**: Environment variables template

**Variables**:
- NODE_ENV
- PORT
- SECRET_KEY
- ADMIN_EMAIL
- ADMIN_PASSWORD

#### `.gitignore`
**Purpose**: Git exclusions

**Excluded**:
- node_modules/
- data/
- logs/
- .env
- *.log
- .DS_Store

### Utility Scripts

#### `install.sh`
**Purpose**: Local installation

**Actions**:
- Check Node.js version
- Install npm dependencies
- Display start instructions

#### `start.sh`
**Purpose**: Start application

**Logic**:
- Check for Docker
- Start with Docker Compose if available
- Fall back to Node.js
- Install dependencies if needed

#### `cleanup.sh`
**Purpose**: Clean up containers

**Actions**:
- Stop containers
- Remove containers
- Prune dangling containers
- List volumes

### Documentation Files

#### `README.md`
**Purpose**: Main project documentation

**Sections**:
- Features overview
- Installation instructions
- Configuration guide
- Usage instructions
- API endpoints
- Troubleshooting

#### `CHANGELOG.md`
**Purpose**: Change history

**Content**:
- Recent updates
- SSH configuration changes
- Output format changes
- New features
- Migration notes

#### `docs/ARCHITECTURE.md`
**Purpose**: System architecture

**Content**:
- Architecture diagrams
- Component descriptions
- Data flow
- Security architecture
- Technology stack

#### `docs/DEPLOYMENT.md`
**Purpose**: Deployment guide

**Content**:
- Prerequisites
- Deployment steps
- Configuration
- Troubleshooting
- Maintenance

## Data Flow Through Files

### DevBench Creation
```
1. views/dashboard.ejs
   ↓ (User clicks Create)
2. server.js (POST /create-devbench)
   ↓ (Validates and creates DB record)
3. server.js (executeProvisionScript)
   ↓ (Spawns child process)
4. provision_vm.sh
   ↓ (SSH to remote host)
5. Remote VM Host
   ↓ (Creates VM, returns info)
6. provision_vm.sh
   ↓ (Parses output)
7. server.js
   ↓ (Updates database)
8. WebSocket
   ↓ (Broadcasts to user)
9. views/dashboard.ejs
   ↓ (Updates UI)
```

### Authentication
```
1. views/login.ejs
   ↓ (User submits form)
2. server.js (POST /login)
   ↓ (Validates credentials)
3. config.js (validation patterns)
   ↓
4. server.js (bcrypt compare)
   ↓ (Creates session)
5. express-session
   ↓ (Stores session)
6. server.js (redirect)
   ↓
7. views/dashboard.ejs or views/admin.ejs
```

### Theme Toggle
```
1. views/layout.ejs (Theme toggle button)
   ↓ (User clicks)
2. JavaScript (theme toggle handler)
   ↓ (Toggles class)
3. public/css/style.css (dark-theme styles)
   ↓ (Applies styles)
4. localStorage
   ↓ (Saves preference)
```

## Key Directories

### `/data`
- **Created**: On first deployment
- **Purpose**: SQLite database storage
- **Persistence**: Docker volume
- **Backup**: Copy devbench.db file

### `/logs`
- **Created**: On first deployment
- **Purpose**: Application logs
- **Persistence**: Docker volume
- **Rotation**: Manual

### `/public`
- **Purpose**: Static assets served by Express
- **Access**: Direct URL paths
- **Caching**: Browser caching enabled

### `/views`
- **Purpose**: EJS templates
- **Rendering**: Server-side
- **Access**: Via routes only

### `/docs`
- **Purpose**: Project documentation
- **Format**: Markdown
- **Access**: File system only

## Configuration Hierarchy

```
1. Environment Variables (.env)
   ↓
2. config.js (defaults)
   ↓
3. docker-compose.yml (container env)
   ↓
4. Application runtime
```

## Port Mapping

```
External → Container → Application
9090    → 3001      → Express Server
```

## Network Architecture

```
Internet
   ↓
Caddy (caddy_network)
   ↓
DevBench Manager (caddy_network + app-network)
   ↓
SQLite (local file)
   ↓
SSH (external)
   ↓
Remote VM Host
```

## File Permissions

### Scripts
- `provision_vm.sh`: 755 (executable)
- `deploy.sh`: 755 (executable)
- `install.sh`: 755 (executable)
- `start.sh`: 755 (executable)
- `cleanup.sh`: 755 (executable)

### Directories
- `data/`: 755
- `logs/`: 755
- `public/`: 755

### Database
- `devbench.db`: 644 (read/write for owner)

## Build Process

### Docker Build
```
1. Read Dockerfile
2. Pull node:18-alpine
3. Copy package.json
4. npm install
5. Copy application files
6. Set permissions
7. Create image
```

### Docker Compose
```
1. Read docker-compose.yml
2. Create networks
3. Build image (if needed)
4. Create container
5. Mount volumes
6. Start container
7. Run health checks
```

## Runtime Process

### Container Startup
```
1. Docker starts container
2. Node.js starts
3. server.js executes
4. Database initialized
5. Express server starts
6. WebSocket server starts
7. Health check passes
8. Ready for connections
```

### Request Handling
```
1. Request arrives at Caddy
2. Proxied to container
3. Express routes request
4. Middleware checks auth
5. Controller handles logic
6. Database query (if needed)
7. Template rendered
8. Response sent
```
