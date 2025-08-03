# Port Configuration for Devbench Manager

## 🔧 Custom Port Setup

To avoid conflicts with existing tools on your server, the Devbench Manager has been configured to use the following custom ports:

### Port Mapping

| Service | Internal Port | External Port | Purpose |
|---------|---------------|---------------|---------|
| **Node.js App** | 3001 | **8080** | Main application server |
| **Nginx HTTP** | 80 | **8081** | HTTP web server (redirects to HTTPS) |
| **Nginx HTTPS** | 443 | **8443** | HTTPS web server with SSL |

## 🌐 Access URLs

After deployment, your application will be accessible at:

- **Primary HTTPS URL**: `https://tbm.asf.nabd-co.com:8443`
- **HTTP URL**: `http://tbm.asf.nabd-co.com:8081` (redirects to HTTPS)
- **Direct App Access**: `http://your-server-ip:8080`
- **Health Check**: `http://your-server-ip:8080/api/health`

## 🔥 Firewall Configuration

Make sure these ports are open in your server's firewall:

```bash
# Ubuntu/Debian with UFW
sudo ufw allow 8080/tcp comment "Devbench App"
sudo ufw allow 8081/tcp comment "Devbench HTTP"
sudo ufw allow 8443/tcp comment "Devbench HTTPS"

# CentOS/RHEL with firewalld
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=8081/tcp
sudo firewall-cmd --permanent --add-port=8443/tcp
sudo firewall-cmd --reload

# Generic iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8081 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8443 -j ACCEPT
```

## 🔄 Updated Files

The following configuration files have been updated with the new port settings:

1. **docker-compose.yml**
   - App port mapping: `8080:3001`
   - Nginx HTTP: `8081:80`
   - Nginx HTTPS: `8443:443`

2. **nginx/conf.d/devbench.conf**
   - HTTP to HTTPS redirect updated
   - SSL configuration on port 443 (internal)

3. **.env.production**
   - Added port configuration variables
   - Updated documentation

4. **deploy.sh**
   - Health check URLs updated
   - Deployment information updated

5. **DEPLOYMENT.md**
   - All documentation updated with new ports
   - Troubleshooting guides updated

## 🚀 Deployment Commands

The deployment process remains the same:

```bash
# Upload files to server
scp -r devbench/ user@tbm.asf.nabd-co.com:/home/user/

# Configure environment
cd /home/user/devbench
cp .env.production .env
nano .env  # Edit with your settings

# Deploy
chmod +x deploy.sh
./deploy.sh
```

## ✅ Verification

After deployment, verify everything is working:

```bash
# Check application health
curl http://localhost:8080/api/health

# Check HTTP access (should redirect)
curl -I http://localhost:8081

# Check HTTPS access
curl -I https://tbm.asf.nabd-co.com:8443

# Check Docker containers
docker-compose ps
```

## 🔧 Port Conflicts Resolution

If you encounter port conflicts in the future, you can easily change the ports by:

1. **Update docker-compose.yml** port mappings
2. **Update nginx configuration** if needed
3. **Update firewall rules**
4. **Restart services**: `docker-compose down && docker-compose up -d`

## 📝 Notes

- **Internal ports** (3001, 80, 443) remain the same inside containers
- **External ports** (8080, 8081, 8443) are what you'll use to access the services
- SSL certificates will be obtained for the standard HTTPS port but served on 8443
- The application will work exactly the same, just on different ports

---

**Your Devbench Manager is now configured to run on ports 8080, 8081, and 8443 to avoid conflicts with your existing tools!**
