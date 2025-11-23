# DevBench Manager

A web application for managing DevBench virtual machines with user authentication and real-time monitoring.

## Features

### Admin Features
- Add users with username, email, and initial password
- Create and delete DevBenches
- Delete users and reset passwords
- View all users and their DevBenches
- Dashboard showing all DevBenches with status

### User Features
- Login with username and password
- Create personal DevBenches
- View all personal DevBenches with status
- Activate and delete DevBenches
- Real-time log output during DevBench creation
- Connection information (SSH Port, VNC Port) display
- Help page with SSH configuration tool guide
- Download SSH Config Manager tool

### Technical Features
- Real-time status monitoring (checks every minute)
- WebSocket integration for live updates
- Secure password hashing
- SQLite database for data persistence
- Bootstrap UI with responsive design

## Installation

### Prerequisites
- Node.js 18+
- Docker and Docker Compose (recommended)
- SSH access to the VM host server

### Quick Start with Docker

1. Clone the repository and navigate to the project directory

2. Make sure your `provision_vm.sh` script is in the project root

3. Deploy using the deployment script:
```bash
chmod +x deploy.sh
./deploy.sh
```

Or manually with Docker Compose:
```bash
# Create network if needed
docker network create caddy_network

# Build and run
docker-compose up -d --build
```

4. Access the application at `https://tbm.nabd-co.com` (via Caddy proxy)

### Manual Installation

1. Install dependencies:
```bash
npm install
```

2. Start the application:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Configuration

### Caddy Proxy Configuration
Add this to your Caddyfile:
```
tbm.nabd-co.com {
    reverse_proxy devbench-manager:3001
}
```

Make sure your Caddy container is on the same `caddy_network`. If you need to create the network:
```bash
docker network create caddy_network
```

### Default Admin Account
- Username: `admin`
- Password: `admin123`
- Email: `admin@nabd-co.com`

**Important:** Change the default admin password after first login!

## Usage

### For Administrators
1. Login with admin credentials
2. Add users through the "Add User" button
3. Monitor all DevBenches from the admin dashboard
4. Manage users (reset passwords, delete users)

### For Users
1. Login with provided credentials
2. Create DevBenches using the "Create DevBench" button
3. Monitor DevBench status and connection information
4. Activate or delete DevBenches as needed

### DevBench Naming Rules
- DevBench names can only contain letters, numbers, hyphens (-), and underscores (_)
- Final DevBench name format: `username_devbenchname`
- Example: User "john" creates "test-db" → Final name: "john_test-db"

### SSH Configuration
The application includes a downloadable SSH Config Manager tool (`db_vm_ssh_config_manager.exe`) that helps users configure SSH access to their VMs. The tool:
- Configures SSH jump host (asf-jump)
- Sets up VM-specific SSH configurations
- Generates easy-to-use SSH commands
- Available at `/downloads/db_vm_ssh_config_manager.exe`

Access the help page at `/help` for detailed instructions on using the SSH Config Manager.

## API Endpoints

### Authentication
- `GET /login` - Login page
- `POST /login` - Login submission
- `GET /logout` - Logout

### Admin Routes
- `GET /admin` - Admin dashboard
- `POST /admin/add-user` - Add new user
- `POST /admin/delete-user/:id` - Delete user
- `POST /admin/reset-password/:id` - Reset user password

### User Routes
- `GET /dashboard` - User dashboard
- `GET /help` - Help page with SSH configuration guide
- `POST /create-devbench` - Create new DevBench
- `POST /delete-devbench/:id` - Delete DevBench
- `POST /activate-devbench/:id` - Activate DevBench
- `GET /check-status/:id` - Check DevBench status

## Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `email` - User email
- `password` - Hashed password
- `is_admin` - Admin flag
- `created_at` - Creation timestamp

### DevBenches Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `name` - DevBench name (user input)
- `actual_name` - Actual VM name from script
- `status` - Current status (active/inactive/creating)
- `ssh_info` - SSH port number
- `vnc_info` - VNC port number
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Security Features

- Password hashing with bcryptjs
- Session-based authentication
- Input validation and sanitization
- Admin-only routes protection
- SQL injection prevention with parameterized queries

## Monitoring

- Automatic status checking every minute
- Real-time WebSocket updates
- Live log streaming during DevBench creation
- Connection information extraction and display

## Troubleshooting

### Common Issues

1. **Cannot access via Caddy**: 
   - Ensure `caddy_network` exists: `docker network create caddy_network`
   - Check if Caddy container is on the same network
   - Verify Caddyfile configuration points to `devbench-manager:3001`

2. **Script timeout**: DevBench creation takes up to 30 minutes

3. **SSH connection issues**: Ensure sshpass is installed and SSH credentials are correct

4. **Permission issues**: Make sure the provision script is executable

5. **Database issues**: Check SQLite file permissions

6. **Container networking**: 
   - Check networks: `docker network ls`
   - Inspect container: `docker inspect devbench-manager`
   - Check if both containers are on caddy_network

### Logs
Application logs are available in the container or local environment where the app is running.

## Development

### Project Structure
```
├── server.js              # Main application server
├── package.json           # Dependencies and scripts
├── views/                 # EJS templates
│   ├── layout.ejs        # Base layout
│   ├── login.ejs         # Login page
│   ├── admin.ejs         # Admin dashboard
│   ├── dashboard.ejs     # User dashboard
│   └── help.ejs          # Help page
├── public/                # Static assets
│   ├── css/              # Stylesheets
│   ├── images/           # Images and icons
│   └── downloads/        # Downloadable files (SSH Config Manager)
├── provision_vm.sh        # VM provisioning script
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose configuration
└── README.md             # This file
```

### Adding Features
1. Add routes in `server.js`
2. Create corresponding EJS templates in `views/`
3. Update database schema if needed
4. Add client-side JavaScript for interactivity

## License
MIT License