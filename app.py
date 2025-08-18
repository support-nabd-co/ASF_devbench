#!/usr/bin/env python3
"""
ASF Devbench Manager - Flask Backend
Replaces Node.js/Firebase backend with local SQLite database
"""

import logging
import os
import subprocess
import sys
import threading
import time
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__, static_folder='frontend/build', static_url_path='')

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Database configuration with robust path handling
database_url = os.environ.get('DATABASE_URL', 'sqlite:///data/devbench.db')

# Ensure data directory exists with proper permissions
def ensure_data_directory():
    """Ensure the data directory exists and is writable"""
    try:
        if database_url.startswith('sqlite:///'):
            # Extract the database file path
            db_path = database_url.replace('sqlite:///', '')
            db_dir = os.path.dirname(db_path)
            
            # Create directory if it doesn't exist
            if not os.path.exists(db_dir):
                os.makedirs(db_dir, mode=0o755, exist_ok=True)
                print(f"✅ Created database directory: {db_dir}")
            
            # Ensure directory is writable
            if not os.access(db_dir, os.W_OK):
                try:
                    os.chmod(db_dir, 0o777)  # More permissive for Docker
                    print(f"✅ Fixed permissions for directory: {db_dir}")
                except Exception as e:
                    print(f"⚠️ Could not fix directory permissions: {e}")
            
            # Test write access
            test_file = os.path.join(db_dir, '.write_test')
            try:
                with open(test_file, 'w') as f:
                    f.write('test')
                os.remove(test_file)
                print(f"✅ Database directory is writable: {db_dir}")
                return True
            except Exception as e:
                print(f"❌ Database directory is not writable: {e}")
                return False
        return True
    except Exception as e:
        print(f"❌ Error ensuring data directory: {e}")
        return False

# Ensure data directory before configuring database
if not ensure_data_directory():
    print("❌ Failed to ensure database directory is writable")
    # Try alternative approach - use /tmp for SQLite in container
    if os.path.exists('/tmp'):
        database_url = 'sqlite:////tmp/devbench.db'
        print(f"⚠️ Falling back to temporary database: {database_url}")
    else:
        print("❌ Cannot create database - exiting")
        sys.exit(1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url

# Initialize extensions
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Enable CORS for frontend
CORS(app, supports_credentials=True, origins=['http://localhost:3000', 'http://localhost:8082', 'https://tbm.asf.nabd-co.com'])

# Models
class User(UserMixin, db.Model):
    """User model for authentication and VM ownership"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to VMs
    vms = db.relationship('VM', backref='owner', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check password against hash"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'vm_count': len(self.vms)
        }

class VM(db.Model):
    """VM model for tracking virtual machines"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), default='Creating')
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    details = db.Column(db.Text)  # JSON string for additional details
    logs = db.Column(db.Text, default='')  # Store logs as plain text
    
    def to_dict(self):
        """Convert VM to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'status': self.status,
            'user_id': self.user_id,
            'username': self.owner.username if self.owner else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'details': self.details,
            'has_logs': bool(self.logs)
        }

@login_manager.user_loader
def load_user(user_id):
    """Load user for Flask-Login"""
    return User.query.get(int(user_id))

# Authentication decorators
def admin_required(f):
    """Decorator to require admin privileges"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({'error': 'Admin privileges required'}), 403
        return f(*args, **kwargs)
    return decorated_function

# Routes

@app.route('/')
def serve_react_app():
    """Serve React frontend"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static_files(path):
    """Serve static files for React app"""
    return send_from_directory(app.static_folder, path)

# API Routes

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'timestamp': datetime.utcnow().isoformat(),
        'database': 'Connected',
        'version': '2.0.0-flask'
    })

@app.route('/api/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        # Create new user
        user = User(username=username)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        print(f"🔐 Login attempt for username: {username}")
        
        if not username or not password:
            print("❌ Missing username or password")
            return jsonify({'error': 'Username and password are required'}), 400
        
        user = User.query.filter_by(username=username).first()
        
        if not user:
            print(f"❌ User not found: {username}")
            return jsonify({'error': 'Invalid credentials'}), 401
        
        print(f"✅ User found: {username}, is_admin: {user.is_admin}")
        
        if user.check_password(password):
            print(f"✅ Password verification successful for: {username}")
            login_user(user)
            return jsonify({
                'message': 'Login successful',
                'user': {
                    'username': user.username,
                    'is_admin': user.is_admin
                }
            }), 200
        else:
            print(f"❌ Password verification failed for: {username}")
            return jsonify({'error': 'Invalid credentials'}), 401
            
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    """User logout endpoint"""
    logout_user()
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/validate-token', methods=['GET'])
@login_required
def validate_token():
    """Validate user session"""
    return jsonify({
        'valid': True,
        'user': current_user.to_dict(),
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/admin/validate-token', methods=['GET'])
@admin_required
def validate_admin_token():
    """Validate admin session"""
    return jsonify({
        'valid': True,
        'admin': True,
        'user': current_user.to_dict(),
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/devbenches', methods=['GET'])
@login_required
def get_devbenches():
    """Get user's VMs"""
    try:
        vms = VM.query.filter_by(user_id=current_user.id).order_by(VM.created_at.desc()).all()
        return jsonify([vm.to_dict() for vm in vms])
    except Exception as e:
        return jsonify({'error': f'Failed to fetch devbenches: {str(e)}'}), 500

@app.route('/api/devbenches/<int:vm_id>', methods=['GET'])
@login_required
def get_devbench(vm_id):
    """Get a specific VM by ID"""
    try:
        vm = VM.query.filter_by(id=vm_id, user_id=current_user.id).first()
        if not vm:
            return jsonify({'error': 'Devbench not found or access denied'}), 404
        return jsonify(vm.to_dict())
    except Exception as e:
        return jsonify({'error': f'Failed to fetch devbench: {str(e)}'}), 500

@app.route('/api/devbenches/create', methods=['POST'])
@login_required
def create_devbench():
    """Create a new VM"""
    try:
        data = request.get_json()
        devbench_name = data.get('devbenchName', '').strip()
        
        if not devbench_name:
            return jsonify({'error': 'Devbench name is required'}), 400
        
        # Create VM record
        vm = VM(
            name=devbench_name,
            status='Creating',
            user_id=current_user.id
        )
        
        db.session.add(vm)
        db.session.commit()
        
        print(f"✅ Created VM record: {vm.id} for user: {current_user.username}")
        
        # Execute provision script asynchronously
        execute_provision_script(vm.id, devbench_name, current_user.username)
        
        return jsonify(vm.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error creating devbench: {e}")
        return jsonify({'error': 'Failed to create devbench'}), 500

@app.route('/api/devbenches/activate', methods=['POST'])
@login_required
def activate_devbench():
    """Activate an existing VM"""
    try:
        data = request.get_json()
        vm_id = data.get('id')
        
        if not vm_id:
            return jsonify({'error': 'VM ID is required'}), 400
        
        vm = VM.query.filter_by(id=vm_id, user_id=current_user.id).first()
        if not vm:
            return jsonify({'error': 'VM not found'}), 404
        
        # Update status
        vm.status = 'Activating'
        vm.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Execute activation script asynchronously
        execute_activation_script(vm.id, vm.name, current_user.username)
        
        return jsonify(vm.to_dict())
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to activate devbench: {str(e)}'}), 500

@app.route('/api/devbenches/<int:vm_id>/logs', methods=['GET'])
@login_required
def get_devbench_logs(vm_id):
    """Get logs for a specific devbench"""
    try:
        vm = VM.query.get_or_404(vm_id)
        
        # Check if the current user owns this VM or is an admin
        if vm.user_id != current_user.id and not current_user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
            
        # Return logs as an array of lines
        logs = vm.logs.split('\n') if vm.logs else []
        return jsonify({
            'logs': logs,
            'status': vm.status
        })
        
    except Exception as e:
        print(f"Error fetching logs: {e}")
        return jsonify({'error': 'Failed to fetch logs'}), 500

# Admin endpoints
@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_users():
    """Get all users (admin only)"""
    try:
        users = User.query.order_by(User.created_at.desc()).all()
        return jsonify([user.to_dict() for user in users])
    except Exception as e:
        return jsonify({'error': f'Failed to fetch users: {str(e)}'}), 500

@app.route('/api/admin/users', methods=['POST'])
@admin_required
def create_user():
    """Create user (admin only)"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        is_admin = data.get('isAdmin', False)
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        user = User(username=username, is_admin=is_admin)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify(user.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create user: {str(e)}'}), 500

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Delete user (admin only)"""
    try:
        if user_id == current_user.id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'message': 'User deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete user: {str(e)}'}), 500

# VM provisioning functions
def setup_logging():
    """Set up logging configuration"""
    log_dir = os.environ.get('LOG_DIR', '/var/log/devbench')
    os.makedirs(log_dir, exist_ok=True)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(os.path.join(log_dir, 'app.log')),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

logger = setup_logging()

def execute_provision_script(vm_id, vm_name, username):
    """Execute VM provision script in background thread"""
    def run(app, vm_id, vm_name, username):
        with app.app_context():
            vm = None
            try:
                logger.info(f"Starting VM provisioning - ID: {vm_id}, Name: {vm_name}, User: {username}")
                
                # Get VM object
                vm = VM.query.get(vm_id)
                if not vm:
                    logger.error(f"VM {vm_id} not found in database")
                    return
                
                # Initialize logs
                start_time = datetime.utcnow()
                init_log = f"[{start_time.isoformat()}] Starting VM creation for {vm_name}"
                vm.logs = init_log
                db.session.commit()
                logger.info(init_log)
                
                # Sanitize inputs (replace spaces with underscores and remove special chars)
                safe_username = ''.join(c if c.isalnum() or c == '_' else '_' for c in username.lower())
                safe_vm_name = ''.join(c if c.isalnum() or c in ('_', '-') else '_' for c in vm_name.lower())
                
                # Combine username and vm_name with underscore
                combined_name = f"{safe_username}_{safe_vm_name}"
                
                # Run the provision script with correct format
                script_path = os.environ.get('PROVISION_SCRIPT_PATH', './provision_vm.sh')
                cmd = [script_path, 'create', combined_name]
                logger.info(f"Executing command: {' '.join(cmd)}")
                
                # Ensure PATH includes /usr/bin for sshpass
                env = os.environ.copy()
                if '/usr/bin' not in env.get('PATH', ''):
                    env['PATH'] = f"/usr/bin:{env.get('PATH', '')}"
                
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                    universal_newlines=True,
                    env=env
                )
                
                # Stream output to logs
                for line in process.stdout:
                    if not line.strip():
                        continue
                        
                    with app.app_context():
                        try:
                            vm = VM.query.get(vm_id)
                            if not vm:
                                logger.error(f"VM {vm_id} no longer exists during provisioning")
                                break
                                
                            timestamp = datetime.utcnow().isoformat()
                            log_entry = f"[{timestamp}] {line.strip()}"
                            logger.debug(f"VM {vm_id} - {log_entry}")
                            
                            # Update logs and status
                            vm.logs = (vm.logs or '') + '\n' + log_entry
                            
                            # Update status if we detect it in the output
                            if 'status:' in line.lower():
                                status = line.lower().split('status:')[-1].strip()
                                vm.status = status.capitalize()
                                logger.info(f"VM {vm_id} status updated to: {vm.status}")
                            
                            db.session.commit()
                            
                        except Exception as update_error:
                            logger.error(f"Error updating VM {vm_id} status: {str(update_error)}", exc_info=True)
                    
                    # Small delay to prevent database lock
                    time.sleep(0.1)
                
                # Wait for process to complete
                process.wait()
                end_time = datetime.utcnow()
                duration = end_time - start_time
                
                # Final status update
                with app.app_context():
                    vm = VM.query.get(vm_id)
                    if vm:
                        if process.returncode == 0:
                            vm.status = 'Ready'
                            completion_msg = f"VM creation completed successfully in {duration.total_seconds():.2f} seconds"
                            vm.logs = (vm.logs or '') + f"\n[{end_time.isoformat()}] {completion_msg}"
                            logger.info(f"VM {vm_id} - {completion_msg}")
                        else:
                            vm.status = 'Error'
                            error_msg = f"VM creation failed with code {process.returncode} after {duration.total_seconds():.2f} seconds"
                            vm.logs = (vm.logs or '') + f"\n[{end_time.isoformat()}] {error_msg}"
                            logger.error(f"VM {vm_id} - {error_msg}")
                        db.session.commit()
                
                logger.info(f"Completed VM provisioning for {vm_id} with status: {vm.status if vm else 'Unknown'}")
                        
            except Exception as e:
                error_msg = f"Unexpected error in provisioning thread: {str(e)}"
                logger.error(error_msg, exc_info=True)
                
                try:
                    with app.app_context():
                        if vm:
                            vm.status = 'Error'
                            error_log = f"\n[{datetime.utcnow().isoformat()}] {error_msg}"
                            vm.logs = (vm.logs or '') + error_log
                            db.session.commit()
                except Exception as inner_e:
                    logger.error(f"Failed to update VM status after error: {str(inner_e)}", exc_info=True)
    
    # Start the provisioning in a background thread
    try:
        from flask import current_app
        app = current_app._get_current_object()
        
        logger.info(f"Starting provisioning thread for VM {vm_id}")
        thread = threading.Thread(
            target=run,
            args=(app, vm_id, vm_name, username),
            name=f"Provision-{vm_id}"
        )
        thread.daemon = True
        thread.start()
        logger.info(f"Started provisioning thread for VM {vm_id}")
        
    except Exception as e:
        logger.error(f"Failed to start provisioning thread: {str(e)}", exc_info=True)
        raise

def execute_activation_script(vm_id, vm_name, username):
    """Execute VM activation script in background thread"""
    def run_script():
        try:
            vm = VM.query.get(vm_id)
            if not vm:
                return
            
            print(f"🔄 Activating VM: {vm_name}")
            
            # Execute activation command
            script_path = './provision_vm.sh'
            result = subprocess.run(
                [script_path, 'activate', vm_name, username],
                capture_output=True,
                text=True,
                timeout=120  # 2 minute timeout
            )
            
            # Update VM status
            vm = VM.query.get(vm_id)
            if vm:
                if result.returncode == 0:
                    vm.status = 'Running'
                    vm.details = f"Successfully activated. Output: {result.stdout}"
                    print(f"✅ VM {vm_name} activated successfully")
                else:
                    vm.status = 'Failed'
                    vm.details = f"Activation failed. Error: {result.stderr}"
                    print(f"❌ VM {vm_name} activation failed: {result.stderr}")
                
                vm.updated_at = datetime.utcnow()
                db.session.commit()
                
        except Exception as e:
            print(f"❌ Error in activation script: {e}")
            vm = VM.query.get(vm_id)
            if vm:
                vm.status = 'Failed'
                vm.details = f"Activation error: {str(e)}"
                vm.updated_at = datetime.utcnow()
                db.session.commit()
    
    thread = threading.Thread(target=run_script)
    thread.daemon = True
    thread.start()

# Initialize database
def init_db():
    """Initialize database and create default admin user"""
    with app.app_context():
        db.create_all()
        
        # Create default admin user if it doesn't exist
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
            print(f"🔧 Creating admin user with password from environment: {admin_password}")
            admin = User(username='admin', is_admin=True)
            admin.set_password(admin_password)
            db.session.add(admin)
            db.session.commit()
            print("✅ Created default admin user (username: admin)")
        else:
            print("ℹ️ Admin user already exists, skipping creation")

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 3001))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    print(f"🚀 Starting ASF Devbench Manager on port {port}")
    print(f"📊 Database: {app.config['SQLALCHEMY_DATABASE_URI']}")
    print(f"🔧 Debug mode: {debug}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
