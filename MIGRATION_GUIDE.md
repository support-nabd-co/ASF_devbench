# ASF Devbench Manager - Firebase to Flask Migration Guide

This guide will help you migrate your ASF Devbench Manager from the current Node.js/Firebase architecture to the new Flask/SQLite architecture.

## 🔄 Migration Overview

**FROM:** Node.js + Express + Firebase (Firestore) + JWT Authentication  
**TO:** Flask + SQLAlchemy + SQLite/PostgreSQL + Session Authentication

## 📋 Prerequisites

- Python 3.8+ installed
- Node.js (for frontend build)
- Git (for version control)

## 🚀 Step-by-Step Migration

### Step 1: Backup Current Data (Optional)

If you have existing data in Firebase, you may want to export it first:

```bash
# Export Firebase data (if needed)
# Use Firebase console or Firebase CLI to export your data
```

### Step 2: Install Python Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt
```

### Step 3: Set Up Environment Configuration

```bash
# Copy the Flask environment template
cp .env.flask .env

# Edit .env file with your configuration
# For development, the default SQLite settings should work
```

### Step 4: Initialize the Database

```bash
# Run the Flask app to initialize the database
python app.py
```

This will:
- Create the SQLite database (`devbench.db`)
- Set up the User and VM tables
- Create a default admin user (username: `admin`, password: `admin123`)

### Step 5: Build the Frontend

```bash
# Install frontend dependencies (if not already done)
cd frontend
npm install

# Build the React frontend
npm run build
cd ..
```

### Step 6: Start the New Flask Server

```bash
# Start the Flask development server
python app.py
```

The server will start on `http://localhost:3001` by default.

### Step 7: Test the Migration

1. **Login Test**: Visit `http://localhost:3001` and try logging in with:
   - Username: `admin`
   - Password: `admin123`

2. **Registration Test**: Try creating a new user account

3. **VM Creation Test**: Try creating a new devbench to ensure VM provisioning works

## 🗃️ Database Schema

### User Table
```sql
CREATE TABLE user (
    id INTEGER PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    password_hash VARCHAR(120) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### VM Table
```sql
CREATE TABLE vm (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Creating',
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    FOREIGN KEY (user_id) REFERENCES user (id)
);
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `FLASK_ENV` | Flask environment | `development` | `production` |
| `SECRET_KEY` | Flask secret key | `dev-secret-key...` | `your-secure-random-key` |
| `PORT` | Server port | `3001` | `8080` |
| `DATABASE_URL` | Database connection | `sqlite:///devbench.db` | `postgresql://user:pass@host/db` |
| `ADMIN_PASSWORD` | Default admin password | `admin123` | `secure-admin-password` |

### Database Options

#### SQLite (Development)
```bash
DATABASE_URL=sqlite:///devbench.db
```

#### PostgreSQL (Production)
```bash
# Install PostgreSQL driver
pip install psycopg2-binary

# Set database URL
DATABASE_URL=postgresql://username:password@localhost:5432/devbench
```

#### MySQL (Production)
```bash
# Install MySQL driver
pip install PyMySQL

# Set database URL
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/devbench
```

## 📊 Data Migration (If Needed)

If you have existing Firebase data to migrate, create a migration script:

```python
# migration_script.py
import json
from app import app, db, User, VM
from datetime import datetime

def migrate_firebase_data():
    with app.app_context():
        # Load your Firebase export
        with open('firebase_export.json', 'r') as f:
            firebase_data = json.load(f)
        
        # Migrate users
        for user_data in firebase_data.get('users', []):
            user = User(
                username=user_data['username'],
                is_admin=user_data.get('is_admin', False),
                created_at=datetime.fromisoformat(user_data.get('created_at', datetime.now().isoformat()))
            )
            user.set_password('default_password')  # Users will need to reset
            db.session.add(user)
        
        # Migrate VMs
        for vm_data in firebase_data.get('vms', []):
            vm = VM(
                name=vm_data['name'],
                status=vm_data.get('status', 'Unknown'),
                user_id=vm_data['user_id'],
                created_at=datetime.fromisoformat(vm_data.get('created_at', datetime.now().isoformat())),
                details=vm_data.get('details', '')
            )
            db.session.add(vm)
        
        db.session.commit()
        print("Migration completed!")

if __name__ == '__main__':
    migrate_firebase_data()
```

## 🔒 Security Considerations

### Password Security
- Passwords are hashed using Werkzeug's secure password hashing
- Default admin password should be changed in production
- Consider implementing password complexity requirements

### Session Security
- Sessions are managed by Flask-Login
- Session cookies are secure and HTTP-only
- Configure `SECRET_KEY` with a strong random value in production

### Database Security
- Use environment variables for database credentials
- Consider using connection pooling for production databases
- Regular database backups are recommended

## 🚀 Production Deployment

### 1. Environment Setup
```bash
# Set production environment
export FLASK_ENV=production
export SECRET_KEY="your-super-secure-random-key-here"
export DATABASE_URL="postgresql://user:password@host:5432/devbench"
export ADMIN_PASSWORD="secure-admin-password"
```

### 2. Database Setup
```bash
# For PostgreSQL
createdb devbench
python app.py  # This will create tables
```

### 3. Web Server
Use a production WSGI server like Gunicorn:

```bash
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:3001 app:app
```

### 4. Reverse Proxy
Configure Nginx or Apache to proxy requests to the Flask app.

## 🔄 Rollback Plan

If you need to rollback to the Node.js/Firebase version:

1. Stop the Flask server
2. Restore the original `server.js` file
3. Ensure Firebase configuration is correct
4. Start the Node.js server: `npm start`

## 🧪 Testing

### Unit Tests
```bash
# Run tests (if implemented)
python -m pytest tests/
```

### Manual Testing Checklist
- [ ] User registration works
- [ ] User login/logout works
- [ ] Admin login works
- [ ] VM creation triggers scripts correctly
- [ ] VM status updates properly
- [ ] Admin panel functions correctly
- [ ] Session persistence works across browser restarts

## 🆘 Troubleshooting

### Common Issues

**Database Connection Error**
```
Solution: Check DATABASE_URL and ensure database server is running
```

**Permission Denied on Script Execution**
```bash
# Make provision script executable
chmod +x provision_vm.sh
```

**Session Not Persisting**
```
Solution: Ensure SECRET_KEY is set and consistent across restarts
```

**Import Errors**
```bash
# Ensure all dependencies are installed
pip install -r requirements.txt
```

## 📞 Support

If you encounter issues during migration:

1. Check the Flask application logs
2. Verify all environment variables are set correctly
3. Ensure the provision script is executable and accessible
4. Test database connectivity independently

## 🎉 Migration Complete!

Once migration is successful, you'll have:

✅ **Local authentication** instead of Firebase Auth  
✅ **SQLite/PostgreSQL database** instead of Firestore  
✅ **Session-based authentication** instead of JWT  
✅ **Python/Flask backend** instead of Node.js  
✅ **Same frontend functionality** with minimal changes  
✅ **VM provisioning** working as before  

Your ASF Devbench Manager is now running on a fully local, self-contained architecture!
