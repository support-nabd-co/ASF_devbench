# Devbench Manager - Docker Deployment Guide

This guide will help you deploy the Devbench Manager application to your cloud server at `tbm.asf.nabd-co.com` using Docker containers.

## 🚀 Quick Deployment

### Prerequisites

1. **Cloud Server Requirements:**
   - Ubuntu 20.04+ or similar Linux distribution
   - Docker and Docker Compose installed
   - Domain `tbm.asf.nabd-co.com` pointing to your server's IP
   - Ports 8081 (HTTP), 8443 (HTTPS), and 8080 (App) open in firewall

2. **Required Configurations:**
   - Firebase project with Firestore enabled
   - Service account credentials for Firebase
   - SSH access to `asf-tb.duckdns.org` for VM provisioning

### Step 1: Install Docker (if not already installed)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER

# Restart session or run:
newgrp docker
```

### Step 2: Upload Application Files

Upload the entire `devbench` directory to your server:

```bash
# Example using scp
scp -r devbench/ user@tbm.asf.nabd-co.com:/home/user/

# Or using rsync
rsync -avz devbench/ user@tbm.asf.nabd-co.com:/home/user/devbench/
```

### Step 3: Configure Environment

```bash
# Navigate to application directory
cd /home/user/devbench

# Copy and edit environment file
cp .env.production .env
nano .env
```

**Required Environment Variables:**

```env
# CRITICAL: Change this to a secure random string
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long

# Firebase Configuration (single line JSON)
FIREBASE_CONFIG={"type":"service_account","project_id":"your-project-id",...}

# App ID for Firestore
APP_ID=devbench-production

# SSL Email for Let's Encrypt
SSL_EMAIL=your-email@example.com

# Domain
DOMAIN=tbm.asf.nabd-co.com
```

### Step 4: Deploy Application

```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The deployment script will:
- ✅ Check Docker installation
- ✅ Validate environment configuration
- ✅ Build Docker images
- ✅ Start all services
- ✅ Setup SSL certificates (Let's Encrypt)
- ✅ Configure Nginx reverse proxy
- ✅ Perform health checks

## 🏗️ Architecture Overview

```
Internet → Nginx (Port 8081/8443) → Node.js App (Port 8080)
                ↓
         SSL Termination
         Static File Serving
         Reverse Proxy
```

### Docker Services

1. **devbench-app**: Main Node.js application
2. **nginx**: Reverse proxy with SSL termination
3. **certbot**: SSL certificate management (optional)

## 🔧 Configuration Files

### Docker Configuration
- `Dockerfile`: Multi-stage build for production
- `docker-compose.yml`: Service orchestration
- `.dockerignore`: Build optimization

### Nginx Configuration
- `nginx/nginx.conf`: Main Nginx configuration
- `nginx/conf.d/devbench.conf`: Site-specific configuration

### Environment
- `.env`: Production environment variables
- `.env.production`: Template for production settings

## 🌐 Access Points

After successful deployment:

- **Primary URL**: https://tbm.asf.nabd-co.com:8443
- **HTTP Access**: http://tbm.asf.nabd-co.com:8081
- **Direct Access**: http://your-server-ip:8080
- **Health Check**: http://your-server-ip:8080/api/health

## 📊 Management Commands

### Service Management
```bash
# View all services status
docker-compose ps

# View logs
docker-compose logs -f
docker-compose logs devbench-app
docker-compose logs nginx

# Restart services
docker-compose restart
docker-compose restart devbench-app

# Stop all services
docker-compose down

# Update application
git pull
docker-compose build --no-cache
docker-compose up -d
```

### SSL Certificate Management
```bash
# Obtain/renew SSL certificates
docker-compose --profile ssl run --rm certbot

# Auto-renewal (add to crontab)
0 12 * * * /usr/local/bin/docker-compose -f /path/to/docker-compose.yml --profile ssl run --rm certbot renew
```

### Monitoring
```bash
# Check container health
docker-compose ps
docker stats

# Check application health
curl http://localhost:8080/api/health

# Check SSL certificate
openssl s_client -connect tbm.asf.nabd-co.com:8443 -servername tbm.asf.nabd-co.com
```

## 🔒 Security Considerations

### Environment Security
- ✅ Strong JWT secret (32+ characters)
- ✅ Firebase credentials properly secured
- ✅ Environment file permissions (600)

### Network Security
- ✅ Firewall configured (UFW recommended)
- ✅ SSH key-based authentication
- ✅ Regular security updates

### Application Security
- ✅ HTTPS enforced
- ✅ Security headers configured
- ✅ Input validation
- ✅ Non-root container user

## 🔧 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   sudo netstat -tlnp | grep :8081
   sudo netstat -tlnp | grep :8443
   sudo netstat -tlnp | grep :8080
   # Stop conflicting services if needed
   ```

2. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   docker-compose logs certbot
   
   # Manual certificate request
   docker-compose --profile ssl run --rm certbot certonly --webroot --webroot-path=/var/www/html --email your-email@example.com --agree-tos --no-eff-email -d tbm.asf.nabd-co.com
   ```

3. **Application Not Starting**
   ```bash
   # Check application logs
   docker-compose logs devbench-app
   
   # Check environment variables
   docker-compose exec devbench-app env
   ```

4. **Database Connection Issues**
   ```bash
   # Verify Firebase configuration
   docker-compose exec devbench-app node -e "console.log(process.env.FIREBASE_CONFIG)"
   ```

### Log Locations
- Application logs: `docker-compose logs devbench-app`
- Nginx logs: `docker-compose logs nginx`
- SSL logs: `docker-compose logs certbot`
- System logs: `/var/log/nginx/` (if mounted)

## 🔄 Updates and Maintenance

### Application Updates
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d

# Or use deployment script
./deploy.sh
```

### System Maintenance
```bash
# Clean up Docker resources
docker system prune -a

# Update system packages
sudo apt update && sudo apt upgrade -y

# Backup important data
tar -czf backup-$(date +%Y%m%d).tar.gz .env ssl/ logs/
```

## 📞 Support

### Health Checks
- Application: `curl http://localhost:8080/api/health`
- Nginx: `curl -I http://localhost:8081`
- SSL: `curl -I https://tbm.asf.nabd-co.com:8443`

### Performance Monitoring
```bash
# Container resource usage
docker stats

# Application metrics
curl http://localhost:8080/api/health

# Nginx status (if enabled)
curl http://localhost:8081/nginx_status
```

## 🎯 Production Checklist

- [ ] Domain DNS configured correctly
- [ ] Firewall ports opened (8081, 8443, 8080)
- [ ] Environment variables configured
- [ ] Firebase project setup
- [ ] SSL certificates obtained
- [ ] Application health check passing
- [ ] Nginx reverse proxy working
- [ ] SSH access to VM provisioning server tested
- [ ] Backup strategy implemented
- [ ] Monitoring setup
- [ ] Log rotation configured

---

**🎉 Your Devbench Manager is now deployed and ready to manage virtual machines at https://tbm.asf.nabd-co.com:8443!**
