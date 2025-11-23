# 🚀 DevBench Manager - Quick Start Guide

## One-Minute Setup

```bash
# 1. Clone and enter directory
git clone <repository-url>
cd ASF_devbench

# 2. Deploy
chmod +x deploy.sh
./deploy.sh

# 3. Access
# Open: http://localhost:9090
# Login: admin / admin123
```

## That's It! 🎉

---

## What You Get

### 🌐 Web Interface
- **URL**: http://localhost:9090
- **Caddy**: https://tbm.nabd-co.com (if configured)

### 👤 Default Login
- **Username**: `admin`
- **Password**: `admin123`
- ⚠️ Change this after first login!

### ✨ Features
- ✅ Create and manage VMs
- ✅ Real-time log streaming
- ✅ SSH/VNC connection info
- ✅ Dark/Light theme toggle
- ✅ Help page with guides
- ✅ SSH Config Manager download

---

## Quick Commands

### Check Status
```bash
docker ps | grep devbench-manager
```

### View Logs
```bash
docker-compose logs -f
```

### Health Check
```bash
curl http://localhost:9090/health
```

### Stop
```bash
docker-compose down
```

### Restart
```bash
docker-compose restart
```

---

## First Steps

### 1. Login
- Open http://localhost:9090
- Enter: admin / admin123

### 2. Change Password
- Go to Admin Panel
- Click "Reset Password"
- Enter new secure password

### 3. Add Users
- Click "Add User"
- Enter username (letters only)
- Enter email and password

### 4. Create DevBench
- User logs in
- Click "Create DevBench"
- Enter name (alphanumeric, hyphens, underscores)
- Watch real-time creation logs

### 5. Access VM
- Copy SSH Port from connection info
- Download SSH Config Manager from Help page
- Follow setup guide

---

## Theme Toggle

Click the floating button (bottom-right) to switch between:
- 🌞 Light Theme
- 🌙 Dark Theme

Your preference is saved automatically!

---

## Need Help?

### In-App
- Click the **Help** icon in navbar
- Download SSH Config Manager
- Follow step-by-step guide

### Documentation
- `README.md` - Overview
- `docs/ARCHITECTURE.md` - System design
- `docs/STRUCTURE.md` - Code structure
- `docs/DEPLOYMENT.md` - Deployment guide
- `docs/API.md` - API reference

### Troubleshooting
```bash
# Container not running?
docker-compose logs

# Port in use?
sudo lsof -i :9090

# Permission issues?
sudo chown -R $USER:$USER data logs

# Network issues?
docker network inspect caddy_network
```

---

## Common Tasks

### Add a User
1. Login as admin
2. Go to Admin Panel
3. Click "Add User"
4. Fill in details
5. Click "Add User"

### Create a DevBench
1. Login as user
2. Click "Create DevBench"
3. Enter name
4. Watch creation progress
5. Copy connection info

### Access VM via SSH
1. Note SSH Port from DevBench
2. Download SSH Config Manager
3. Add VM to config
4. Use: `ssh vm-name`

### Check VM Status
1. Go to Dashboard
2. Click "Check Status"
3. View current status

---

## Configuration

### Change Port
Edit `docker-compose.yml`:
```yaml
ports:
  - "8080:3001"  # Change 9090 to 8080
```

### Environment Variables
Create `.env`:
```bash
NODE_ENV=production
SECRET_KEY=your-secret-key
ADMIN_PASSWORD=your-password
```

### Caddy Proxy
Add to Caddyfile:
```
tbm.nabd-co.com {
    reverse_proxy devbench-manager:3001
}
```

---

## Maintenance

### Backup Database
```bash
cp data/devbench.db backups/devbench-$(date +%Y%m%d).db
```

### View Logs
```bash
docker-compose logs --tail=100
```

### Update Application
```bash
git pull
./deploy.sh
```

### Clean Up
```bash
./cleanup.sh
```

---

## Support

📧 **Email**: admin@nabd-co.com
📚 **Docs**: `/docs` directory
🐛 **Issues**: Check logs first

---

## Quick Reference

| Task | Command |
|------|---------|
| Deploy | `./deploy.sh` |
| Start | `docker-compose up -d` |
| Stop | `docker-compose down` |
| Logs | `docker-compose logs -f` |
| Health | `curl http://localhost:9090/health` |
| Backup | `cp data/devbench.db backups/` |
| Clean | `./cleanup.sh` |

---

**Ready to go!** 🚀

For detailed information, see `README.md` or `/docs` directory.
