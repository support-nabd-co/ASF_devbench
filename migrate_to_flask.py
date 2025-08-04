#!/usr/bin/env python3
"""
ASF Devbench Manager - Automated Migration Script
Automates the migration from Node.js/Firebase to Flask/SQLite
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def print_step(step, message):
    """Print a formatted step message"""
    print(f"\n{'='*60}")
    print(f"STEP {step}: {message}")
    print('='*60)

def run_command(command, cwd=None, check=True):
    """Run a shell command and return the result"""
    try:
        result = subprocess.run(command, shell=True, cwd=cwd, check=check, 
                              capture_output=True, text=True)
        return result
    except subprocess.CalledProcessError as e:
        print(f"❌ Command failed: {command}")
        print(f"Error: {e.stderr}")
        return None

def check_prerequisites():
    """Check if all prerequisites are installed"""
    print_step(1, "Checking Prerequisites")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ is required")
        return False
    print(f"✅ Python {sys.version.split()[0]} found")
    
    # Check if pip is available
    result = run_command("pip --version", check=False)
    if result is None or result.returncode != 0:
        print("❌ pip is not available")
        return False
    print("✅ pip found")
    
    # Check if Node.js is available (for frontend build)
    result = run_command("node --version", check=False)
    if result is None or result.returncode != 0:
        print("❌ Node.js is not available (needed for frontend build)")
        return False
    print(f"✅ Node.js found: {result.stdout.strip()}")
    
    # Check if npm is available
    result = run_command("npm --version", check=False)
    if result is None or result.returncode != 0:
        print("❌ npm is not available")
        return False
    print(f"✅ npm found: {result.stdout.strip()}")
    
    return True

def install_python_dependencies():
    """Install Python dependencies"""
    print_step(2, "Installing Python Dependencies")
    
    if not os.path.exists("requirements.txt"):
        print("❌ requirements.txt not found")
        return False
    
    result = run_command("pip install -r requirements.txt")
    if result is None:
        return False
    
    print("✅ Python dependencies installed successfully")
    return True

def setup_environment():
    """Set up environment configuration"""
    print_step(3, "Setting Up Environment Configuration")
    
    # Copy .env.flask to .env if .env doesn't exist
    if not os.path.exists(".env"):
        if os.path.exists(".env.flask"):
            shutil.copy(".env.flask", ".env")
            print("✅ Created .env from .env.flask template")
        else:
            print("❌ .env.flask template not found")
            return False
    else:
        print("⚠️  .env already exists, skipping template copy")
    
    # Make provision script executable (Unix-like systems)
    if os.path.exists("provision_vm.sh") and hasattr(os, 'chmod'):
        try:
            os.chmod("provision_vm.sh", 0o755)
            print("✅ Made provision_vm.sh executable")
        except Exception as e:
            print(f"⚠️  Could not make provision_vm.sh executable: {e}")
    
    return True

def build_frontend():
    """Build the React frontend"""
    print_step(4, "Building React Frontend")
    
    frontend_dir = "frontend"
    if not os.path.exists(frontend_dir):
        print("❌ Frontend directory not found")
        return False
    
    # Install frontend dependencies
    print("Installing frontend dependencies...")
    result = run_command("npm install", cwd=frontend_dir)
    if result is None:
        return False
    
    # Build frontend
    print("Building frontend...")
    result = run_command("npm run build", cwd=frontend_dir)
    if result is None:
        return False
    
    # Check if build directory was created
    build_dir = os.path.join(frontend_dir, "build")
    if not os.path.exists(build_dir):
        print("❌ Frontend build failed - build directory not found")
        return False
    
    print("✅ Frontend built successfully")
    return True

def initialize_database():
    """Initialize the SQLite database"""
    print_step(5, "Initializing Database")
    
    if not os.path.exists("app.py"):
        print("❌ app.py not found")
        return False
    
    # Test import to ensure all dependencies are available
    try:
        print("Testing Flask app import...")
        result = run_command("python -c \"from app import app, db; print('Import successful')\"")
        if result is None:
            return False
        print("✅ Flask app imports successfully")
    except Exception as e:
        print(f"❌ Failed to import Flask app: {e}")
        return False
    
    # Initialize database
    print("Initializing database...")
    result = run_command("python -c \"from app import app, db, init_db; init_db(); print('Database initialized')\"")
    if result is None:
        return False
    
    print("✅ Database initialized successfully")
    return True

def test_migration():
    """Test the migration by starting the server briefly"""
    print_step(6, "Testing Migration")
    
    print("Starting Flask server for testing...")
    print("⚠️  This will start the server - press Ctrl+C to stop after testing")
    print("🌐 Visit http://localhost:3001 to test the application")
    print("👤 Default admin login: username=admin, password=admin123")
    
    # Start the server (this will block until user stops it)
    try:
        subprocess.run([sys.executable, "app.py"], check=True)
    except KeyboardInterrupt:
        print("\n✅ Server stopped by user")
        return True
    except Exception as e:
        print(f"❌ Server failed to start: {e}")
        return False

def backup_old_files():
    """Backup the old Node.js files"""
    print_step(0, "Backing Up Old Files")
    
    backup_dir = "nodejs_backup"
    files_to_backup = ["server.js", "package.json", ".env.production"]
    
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
        print(f"✅ Created backup directory: {backup_dir}")
    
    for file in files_to_backup:
        if os.path.exists(file):
            backup_path = os.path.join(backup_dir, file)
            shutil.copy2(file, backup_path)
            print(f"✅ Backed up {file} to {backup_path}")
    
    return True

def main():
    """Main migration function"""
    print("🚀 ASF Devbench Manager - Flask Migration Script")
    print("This script will migrate your application from Node.js/Firebase to Flask/SQLite")
    
    # Ask for confirmation
    response = input("\nDo you want to proceed with the migration? (y/N): ")
    if response.lower() not in ['y', 'yes']:
        print("Migration cancelled by user")
        return
    
    # Run migration steps
    steps = [
        ("Backup old files", backup_old_files),
        ("Check prerequisites", check_prerequisites),
        ("Install Python dependencies", install_python_dependencies),
        ("Set up environment", setup_environment),
        ("Build frontend", build_frontend),
        ("Initialize database", initialize_database),
    ]
    
    for step_name, step_func in steps:
        if not step_func():
            print(f"\n❌ Migration failed at step: {step_name}")
            print("Please check the error messages above and try again.")
            return
    
    print("\n" + "="*60)
    print("🎉 MIGRATION COMPLETED SUCCESSFULLY!")
    print("="*60)
    print("\n✅ Your ASF Devbench Manager has been migrated to Flask!")
    print("\n📋 Next steps:")
    print("1. Start the server: python app.py")
    print("2. Visit: http://localhost:3001")
    print("3. Login with: admin / admin123")
    print("4. Test VM creation functionality")
    print("\n📖 For more details, see MIGRATION_GUIDE.md")
    
    # Ask if user wants to start the server now
    response = input("\nWould you like to start the Flask server now? (y/N): ")
    if response.lower() in ['y', 'yes']:
        test_migration()

if __name__ == "__main__":
    main()
