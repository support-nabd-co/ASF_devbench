# DevBench Manager - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Deployment](#detailed-deployment)
4. [Configuration](#configuration)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance](#maintenance)
8. [Backup & Recovery](#backup--recovery)

## Prerequisites

### Required Software
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Git**: For cloning the repository
- **SSH Access**: To remote VM host (asf-server.duckdns.org:49152)

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows with WSL2
- **RAM**: Minimum 512MB for container
- **Disk**: Minimum 1GB free space
- **Network**: Internet connection for Docker images and SSH

### Access Requirements
- SSH credentials for VM host
- Domain name configured (optional, for Caddy)
- Port 9090 available (or configure different port)

## Quick Start

### One-Command Deployment

```bash
# Clone the repository
git clone <repository-url>
cd ASF_devbench

# Run deployment script
chmod +x deploy.sh
./deploy.sh
```

That's it! The application will be available at:
- **Direct**: http://localhost:9090
- **Via Caddy**: https://tbm.nabd-co.com (if configured)

### Default Credentials
- **Username**: admin
- **Password**: admin123

⚠️ **Important**: Change the default password after first login!

## Detailed Deployment

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd ASF_devbench
```

### Step 2: Review Configuration

Check `config.js` for default settings:
```javascript
{
  port: 3001,
  database: { path: './data/devbench.db' },
  session: { secret: 'your-secret-key' },
  defaultAdmin: {
    username: 'admin',
    password: 'admin123',
    email: 'admin@nabd-co.com'
  }
}
```

### Step 3: Set Environment Variables (Optional)

Create `.env` file:
```bash
NODE_ENV=production
PORT=3001
SECRET_KEY=your-secure-secret-key
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-secure-password
```

### Step 4: Prepare Directories

```bash
# Create necessary directories
mkdir -p data logs public/downloads

# Set permissions
chmod 755 data logs
chmod +x provision_vm.sh deploy.sh
```

### Step 5: Configure Docker Network

```bash
# Create Caddy network (if using reverse proxy)
docker network create caddy_network
```

### Step 6: Deploy with Docker Compose

```bash
# Build and start container
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 7: Verify Deployment

```bash
# Check health endpoint
curl http://localhost:9090/health

# Expected response:
# {"status":"ok","timestamp":"2025-11-23T...","version":"1.0.0"}
```

## Configuration

### Docker Compose Configuration

Edit `docker-compose.yml`:

```yaml
services:
  devbench-manager:
    ports:
      - "9090:3001"  # Change external port here
    environment:
      - NODE_ENV=production
      - SECRET_KEY=${SECRET_KEY:-dev-secret-key}
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./provision_vm.sh:/app/provision_vm.sh:ro
```

### Caddy Reverse Proxy

Add to your Caddyfile:

```
tbm.nabd-co.com {
    reverse_proxy devbench-manager:3001
}
```

Ensure Caddy container is on `caddy_network`:

```bash
# Check Caddy network
docker network inspect caddy_network

# Connect Caddy to network if needed
docker network connect caddy_network caddy-container-name
```

### SSH Configuration

The application connects to the VM host via SSH. Ensure:

1. **Host**: asf-server.duckdns.org
2. **Port**: 49152
3. **User**: asf
4. **Password**: ASF (configured in provision_vm.sh)

Test SSH connection:
```bash
ssh -p 49152 asf@asf-server.duckdns.org
```

### Firewall Configuration

Open required ports:

```bash
# For direct access
sudo ufw allow 9090/tcp

# For Caddy (if using)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Verification

### 1. Container Status

```bash
# Check if container is running
docker ps | grep devbench-manager

# Expected output:
# CONTAINER ID   IMAGE                    STATUS         PORTS
# abc123...      devbench-manager:latest  Up 2 minutes   0.0.0.0:9090->3001/tcp
```

### 2. Health Check

```bash
# Test health endpoint
curl http://localhost:9090/health

# Or with jq for formatted output
curl -s http://localhost:9090/health | jq
```

### 3. Network Connectivity

```bash
# Check networks
docker inspect devbench-manager --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'

# Expected: app-network caddy_network
```

### 4. Database

```bash
# Check if database was created
ls -la data/devbench.db

# Connect to database
docker exec -it devbench-manager sqlite3 /app/data/devbench.db

# Run query
sqlite> SELECT * FROM users;
```

### 5. Logs

```bash
# View application logs
docker-compose logs -f

# View last 50 lines
docker-compose logs --tail=50

# View specific service
docker-compose logs devbench-manager
```

### 6. Web Interface

1. Open browser: http://localhost:9090
2. Login with admin credentials
3. Create a test DevBench
4. Verify real-time log output
5. Check connection information

## Troubleshooting

### Container Won't Start

**Problem**: Container exits immediately

**Solution**:
```bash
# Check logs
docker-compose logs

# Common issues:
# 1. Port already in use
sudo lsof -i :9090
# Kill process or change port in docker-compose.yml

# 2. Permission issues
sudo chown -R $USER:$USER data logs

# 3. Missing provision script
ls -la provision_vm.sh
chmod +x provision_vm.sh
```

### Cannot Access Web Interface

**Problem**: Connection refused or timeout

**Solution**:
```bash
# 1. Check if container is running
docker ps | grep devbench-manager

# 2. Check port mapping
docker port devbench-manager

# 3. Test from inside container
docker exec devbench-manager wget -O- http://localhost:3001/health

# 4. Check firewall
sudo ufw status
sudo ufw allow 9090/tcp

# 5. Check if port is listening
sudo netstat -tlnp | grep 9090
```

### Caddy Proxy Not Working

**Problem**: Cannot access via domain

**Solution**:
```bash
# 1. Check if both containers are on caddy_network
docker network inspect caddy_network

# 2. Connect devbench-manager to network
docker network connect caddy_network devbench-manager

# 3. Restart Caddy
docker restart caddy-container-name

# 4. Check Caddy logs
docker logs caddy-container-name

# 5. Test from Caddy container
docker exec caddy-container-name wget -O- http://devbench-manager:3001/health
```

### SSH Connection Fails

**Problem**: Cannot connect to VM host

**Solution**:
```bash
# 1. Test SSH manually
ssh -p 49152 asf@asf-server.duckdns.org

# 2. Check if sshpass is installed in container
docker exec devbench-manager which sshpass

# 3. Check provision script
docker exec devbench-manager cat /app/provision_vm.sh | grep SSH_

# 4. Test from container
docker exec -it devbench-manager bash
./provision_vm.sh status test_vm
```

### Database Errors

**Problem**: Database locked or corrupted

**Solution**:
```bash
# 1. Stop container
docker-compose down

# 2. Backup database
cp data/devbench.db data/devbench.db.backup

# 3. Check database integrity
sqlite3 data/devbench.db "PRAGMA integrity_check;"

# 4. If corrupted, restore from backup or recreate
rm data/devbench.db
docker-compose up -d
```

### WebSocket Not Working

**Problem**: Real-time updates not appearing

**Solution**:
```bash
# 1. Check browser console for errors
# Open DevTools → Console

# 2. Verify WebSocket connection
# Look for "WebSocket connected" message

# 3. Check if behind proxy
# Ensure proxy supports WebSocket upgrade

# 4. Test WebSocket endpoint
wscat -c ws://localhost:9090
```

## Maintenance

### Regular Tasks

#### Daily
- Monitor logs for errors
- Check disk space
- Verify health endpoint

#### Weekly
- Review user activity
- Clean up old logs
- Check for updates

#### Monthly
- Backup database
- Review security
- Update dependencies

### Updating the Application

```bash
# 1. Pull latest changes
git pull origin main

# 2. Backup database
cp data/devbench.db data/devbench.db.$(date +%Y%m%d)

# 3. Rebuild and restart
docker-compose down
docker-compose up -d --build

# 4. Verify
curl http://localhost:9090/health
```

### Viewing Logs

```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific time range
docker-compose logs --since 2h

# Save logs to file
docker-compose logs > logs/docker-$(date +%Y%m%d).log
```

### Cleaning Up

```bash
# Remove stopped containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Clean everything
docker system prune -a -f
```

### Scaling (Future)

For multiple instances:

```bash
# Scale to 3 instances
docker-compose up -d --scale devbench-manager=3

# Use load balancer (nginx/haproxy)
# Configure session persistence
```

## Backup & Recovery

### Backup Strategy

#### Database Backup

```bash
# Manual backup
cp data/devbench.db backups/devbench-$(date +%Y%m%d-%H%M%S).db

# Automated backup script
#!/bin/bash
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR
cp data/devbench.db $BACKUP_DIR/devbench-$(date +%Y%m%d).db
# Keep only last 7 days
find $BACKUP_DIR -name "devbench-*.db" -mtime +7 -delete
```

#### Full Backup

```bash
# Backup everything
tar -czf devbench-backup-$(date +%Y%m%d).tar.gz \
  data/ \
  logs/ \
  config.js \
  .env \
  docker-compose.yml
```

### Recovery

#### Restore Database

```bash
# 1. Stop container
docker-compose down

# 2. Restore database
cp backups/devbench-20251123.db data/devbench.db

# 3. Start container
docker-compose up -d

# 4. Verify
curl http://localhost:9090/health
```

#### Full Recovery

```bash
# 1. Extract backup
tar -xzf devbench-backup-20251123.tar.gz

# 2. Deploy
./deploy.sh

# 3. Verify all services
```

### Disaster Recovery

#### Complete System Failure

```bash
# 1. Fresh installation
git clone <repository-url>
cd ASF_devbench

# 2. Restore backups
cp /backup/location/devbench.db data/
cp /backup/location/.env .

# 3. Deploy
./deploy.sh

# 4. Verify users and DevBenches
```

## Security Hardening

### Change Default Credentials

```bash
# 1. Login as admin
# 2. Go to admin panel
# 3. Reset admin password
# Or use API:
curl -X POST http://localhost:9090/admin/reset-password/1 \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"new-secure-password"}'
```

### Update Session Secret

Edit `.env`:
```bash
SECRET_KEY=$(openssl rand -base64 32)
```

Restart:
```bash
docker-compose restart
```

### Enable HTTPS

Use Caddy for automatic HTTPS:
```
tbm.nabd-co.com {
    reverse_proxy devbench-manager:3001
}
```

### Restrict Access

Use firewall:
```bash
# Allow only specific IPs
sudo ufw allow from 192.168.1.0/24 to any port 9090
```

## Monitoring

### Health Monitoring

```bash
# Simple health check script
#!/bin/bash
if curl -sf http://localhost:9090/health > /dev/null; then
  echo "OK"
else
  echo "FAILED"
  # Send alert
fi
```

### Log Monitoring

```bash
# Watch for errors
docker-compose logs -f | grep -i error

# Count errors
docker-compose logs | grep -i error | wc -l
```

### Resource Monitoring

```bash
# Container stats
docker stats devbench-manager

# Disk usage
du -sh data/ logs/

# Database size
ls -lh data/devbench.db
```

## Performance Tuning

### Database Optimization

```bash
# Vacuum database
docker exec devbench-manager sqlite3 /app/data/devbench.db "VACUUM;"

# Analyze database
docker exec devbench-manager sqlite3 /app/data/devbench.db "ANALYZE;"
```

### Container Resources

Edit `docker-compose.yml`:
```yaml
services:
  devbench-manager:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Support

### Getting Help

1. Check logs: `docker-compose logs`
2. Review documentation in `/docs`
3. Check GitHub issues
4. Contact system administrator

### Reporting Issues

Include:
- Docker version: `docker --version`
- Docker Compose version: `docker-compose --version`
- Container logs: `docker-compose logs`
- Error messages
- Steps to reproduce
