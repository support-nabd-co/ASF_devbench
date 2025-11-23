# DevBench Manager 🚀

A modern web application for managing DevBench virtual machines with user authentication, real-time monitoring, and dark theme support.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Docker](https://img.shields.io/badge/docker-required-blue.svg)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Usage](#usage)
- [API](#api)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

DevBench Manager provides a centralized web interface for creating, managing, and accessing virtual machine development environments. Built with Node.js and Express, it offers real-time monitoring, WebSocket-based updates, and a modern responsive UI with dark theme support.

## ✨ Features

### 👤 User Features
- 🔐 Secure authentication with session management
- 🖥️ Create and manage personal DevBenches
- 📊 Real-time status monitoring
- 📝 Live log streaming during VM creation
- 🔌 Easy access to SSH and VNC connection info
- 📚 Comprehensive help page with setup guide
- 📥 Download SSH Config Manager tool
- 🌓 Dark/Light theme toggle
- 📱 Responsive design for mobile and desktop

### 👨‍💼 Admin Features
- 👥 User management (add, delete, reset passwords)
- 🗂️ View all users and their DevBenches
- 📈 System-wide DevBench overview
- 🔧 Centralized management dashboard
- 📊 User activity monitoring

### 🛠️ Technical Features
- ⚡ Real-time WebSocket updates
- 🔒 Secure password hashing (bcrypt)
- 💾 SQLite database for persistence
- 🐳 Docker containerization
- 🔄 Automatic status checks (60-second interval)
- 🎨 Modern Bootstrap 5 UI
- 🌐 Caddy reverse proxy support
- 📡 SSH-based VM provisioning
- 🔍 Health check endpoint
- 📋 Comprehensive logging

## 🚀 Quick Start

### Prerequisites

- **Docker**: Version 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose**: Version 2.0+ ([Install Compose](https://docs.docker.com/compose/install/))
- **Git**: For cloning the repository
- **SSH Access**: To VM host (asf-server.duckdns.org:49152)

### One-Command Deployment

```bash
# Clone the repository
git clone <repository-url>
cd ASF_devbench

# Deploy
chmod +x deploy.sh
./deploy.sh
```

That's it! 🎉

### Access the Application

- **Direct Access**: http://localhost:9090
- **Via Caddy Proxy**: https://tbm.nabd-co.com

### Default Credentials

```
Username: admin
Password: admin123
```

⚠️ **Important**: Change the default password after first login!

### Alternative: Manual Installation

For development without Docker:

```bash
# Install dependencies
npm install

# Start application
npm start

# Or with auto-reload
npm run dev
```

Access at: http://localhost:3001

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

## 📚 Documentation

Comprehensive documentation is available in the `/docs` directory:

- **[Architecture](docs/ARCHITECTURE.md)**: System architecture, components, and data flow
- **[Structure](docs/STRUCTURE.md)**: Project structure and file descriptions
- **[Deployment](docs/DEPLOYMENT.md)**: Detailed deployment guide and troubleshooting
- **[API](docs/API.md)**: Complete API reference and examples

## 📁 Project Structure

```
ASF_devbench/
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md    # System architecture
│   ├── STRUCTURE.md       # Project structure
│   ├── DEPLOYMENT.md      # Deployment guide
│   └── API.md             # API documentation
├── public/                 # Static assets
│   ├── css/               # Stylesheets (with dark theme)
│   ├── images/            # Logos and icons
│   └── downloads/         # SSH Config Manager tool
├── views/                  # EJS templates
│   ├── layout.ejs         # Base layout
│   ├── login.ejs          # Login page
│   ├── dashboard.ejs      # User dashboard
│   ├── admin.ejs          # Admin panel
│   └── help.ejs           # Help page
├── data/                   # Database (created on deploy)
├── logs/                   # Application logs
├── server.js               # Main application
├── config.js               # Configuration
├── provision_vm.sh         # VM provisioning script
├── deploy.sh               # Deployment script
├── docker-compose.yml      # Container orchestration
├── Dockerfile              # Container definition
└── README.md               # This file
```

## 🎨 Theme Support

DevBench Manager includes a beautiful dark theme:

- **Toggle**: Click the theme button (bottom-right corner)
- **Persistence**: Theme preference saved in browser
- **Smooth Transitions**: Animated theme switching
- **Full Coverage**: All pages and components themed

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```bash
NODE_ENV=production
PORT=3001
SECRET_KEY=your-secure-secret-key
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-secure-password
```

### Docker Configuration

Edit `docker-compose.yml` to customize:

```yaml
ports:
  - "9090:3001"  # Change external port
environment:
  - NODE_ENV=production
  - SECRET_KEY=${SECRET_KEY}
volumes:
  - ./data:/app/data
  - ./logs:/app/logs
```

### Caddy Reverse Proxy

Add to your Caddyfile:

```
tbm.nabd-co.com {
    reverse_proxy devbench-manager:3001
}
```

## 📖 Usage

### For Users

1. **Login**: Use provided credentials
2. **Create DevBench**: Click "Create DevBench" button
3. **Monitor Progress**: Watch real-time log output
4. **Access VM**: Use displayed SSH/VNC ports
5. **Get Help**: Click help icon for setup guide

### For Administrators

1. **Add Users**: Click "Add User" in admin panel
2. **Manage DevBenches**: View and delete any DevBench
3. **Reset Passwords**: Reset user passwords as needed
4. **Monitor System**: View all users and their activity

### SSH Configuration

Download the SSH Config Manager tool from the help page to easily configure SSH access to your VMs.

## 🔌 API

### Health Check

```bash
curl http://localhost:9090/health
```

### Create DevBench

```bash
curl -X POST http://localhost:9090/create-devbench \
  -H "Content-Type: application/json" \
  -d '{"name":"my-vm"}'
```

See [API Documentation](docs/API.md) for complete reference.

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs

# Verify port availability
sudo lsof -i :9090

# Check permissions
sudo chown -R $USER:$USER data logs
```

### Cannot Access Web Interface

```bash
# Verify container is running
docker ps | grep devbench-manager

# Test health endpoint
curl http://localhost:9090/health

# Check firewall
sudo ufw allow 9090/tcp
```

### SSH Connection Fails

```bash
# Test SSH manually
ssh -p 49152 asf@asf-server.duckdns.org

# Check from container
docker exec devbench-manager ./provision_vm.sh status test_vm
```

See [Deployment Guide](docs/DEPLOYMENT.md) for more troubleshooting steps.

## 🔄 Updating

```bash
# Pull latest changes
git pull origin main

# Backup database
cp data/devbench.db data/devbench.db.backup

# Redeploy
./deploy.sh
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- UI powered by [Bootstrap 5](https://getbootstrap.com/)
- Icons from [Font Awesome](https://fontawesome.com/)
- Reverse proxy by [Caddy](https://caddyserver.com/)

## 📞 Support

For issues, questions, or contributions:

- 📧 Email: admin@nabd-co.com
- 📚 Documentation: `/docs` directory
- 🐛 Issues: GitHub Issues (if applicable)

---

Made with ❤️ by NABD Solutions