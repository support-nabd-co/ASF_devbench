#!/usr/bin/env python3
from app import create_app, db
from app.models import User
import os

def init_db():
    app = create_app()
    with app.app_context():
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
        else:
            print("ℹ️  Admin user already exists")

if __name__ == '__main__':
    init_db()
