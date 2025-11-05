# DevBench Manager Deployment Guide

## Quick Deployment Steps

### 1. Prepare Environment
```bash
# Ensure Docker and Docker Compose are installed
docker --version
docker-compose --version

# Create the caddy network (if not exists)
docker network create caddy_network
```

### 2. Deploy Application
```bash
# Make scripts executable (Linux/Mac)
chmod +x deploy.sh check-network.sh

# Deploy the application
./deploy.sh
```

### 3. Configure Caddy
Add this to your Caddyfile:
```
tbm.nabd-co.com {
    reverse_proxy devbench-manager:3001
}
```

### 4. Verify Deployment
```bash
# Check network configuration
./check-network.sh

# Check container logs
docker-compose logs -f devbench-manager

# Test health endpoint
curl http://localhost:9090/health
```

## Manual Deployment (Alternative)

```bash
# 1. Create network
docker network create caddy_network

# 2. Build and start
docker-compose up -d --build

# 3. Check status
docker ps | grep devbench-manager
```

## Access Points

- **Direct Access**: http://localhost:9090
- **Via Caddy Proxy**: https://tbm.nabd-co.com
- **Health Check**: http://localhost:9090/health

## Default Credentials

- **Username**: admin
- **Password**: admin123

## Environment Variables

You can customize the deployment by setting these environment variables:

```bash
export SECRET_KEY="your-secret-key"
export ADMIN_EMAIL="admin@yourcompany.com"
export ADMIN_PASSWORD="your-secure-password"
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs devbench-manager

# Rebuild container
docker-compose down
docker-compose up -d --build
```

### Network Issues
```bash
# List networks
docker network ls

# Inspect container networks
docker inspect devbench-manager

# Recreate network
docker network rm caddy_network
docker network create caddy_network
docker-compose down && docker-compose up -d
```

### Caddy Can't Reach Container
```bash
# Ensure both containers are on caddy_network
docker network connect caddy_network devbench-manager
docker network connect caddy_network caddy_container_name
```

## File Structure After Deployment

```
├── devbench-manager/          # Application container
│   ├── /app/data/            # Database storage (persistent)
│   ├── /app/logs/            # Application logs
│   └── /app/provision_vm.sh  # VM provisioning script
└── volumes/
    └── devbench_data/        # Docker volume for data persistence
```

## Maintenance Commands

```bash
# View logs
docker-compose logs -f

# Restart application
docker-compose restart

# Update application
git pull
docker-compose down
docker-compose up -d --build

# Backup database
docker cp devbench-manager:/app/data/devbench.db ./backup-$(date +%Y%m%d).db

# Stop application
docker-compose down

# Remove everything (including data)
docker-compose down -v
```

## Security Notes

1. Change default admin password immediately after deployment
2. Use strong SESSION_SECRET in production
3. Consider using HTTPS only in production
4. Regularly backup the database
5. Monitor logs for suspicious activity

## Production Checklist

- [ ] Changed default admin password
- [ ] Set strong SESSION_SECRET
- [ ] Configured proper backup strategy
- [ ] Set up log rotation
- [ ] Configured monitoring/alerting
- [ ] Tested DevBench creation process
- [ ] Verified Caddy proxy configuration
- [ ] Tested network connectivity