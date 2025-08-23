#!/usr/bin/env python3
import os
import sys
from datetime import datetime

# Add current directory to path
sys.path.append('/app')

# Import Flask and extensions from app.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash

# Initialize Flask app
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////app/data/devbench.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

# Initialize database
db = SQLAlchemy(app)

# User model
class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

def init_db():
    with app.app_context():
        try:
            # Create all database tables
            db.create_all()
            
            # Check if admin user already exists
            admin = User.query.filter_by(username='admin').first()
            if not admin:
                # Create admin user
                admin = User(
                    username='admin',
                    email='admin@example.com',
                    is_admin=True
                )
                admin.set_password('ASF_admin')
                db.session.add(admin)
                db.session.commit()
                print("✅ Admin user created successfully!")
                print("   Username: admin")
                print("   Password: ASF_admin")
            else:
                print("ℹ️  Admin user already exists")
                
            # Verify the user was created
            admin = User.query.filter_by(username='admin').first()
            if admin:
                print(f"✅ Verified admin user exists with email: {admin.email}")
            else:
                print("❌ Failed to verify admin user creation")
                
        except Exception as e:
            print(f"❌ Error initializing database: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    print("🚀 Starting database initialization...")
    init_db()
    print("✅ Database initialization complete!")
