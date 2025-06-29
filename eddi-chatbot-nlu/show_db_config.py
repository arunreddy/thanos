#!/usr/bin/env python3
"""
Script to display the current database configuration.
This helps verify which environment variables are being used.
"""

import os
import sys
from pathlib import Path

# Add the rasa directory to the Python path
rasa_path = Path(__file__).parent / 'rasa'
sys.path.insert(0, str(rasa_path))

# Import with error handling
try:
    import rasa.actions.db_utils as db_utils  # type: ignore
    DatabaseConnection = db_utils.DatabaseConnection
except ImportError:
    print("❌ Error: Could not import DatabaseConnection")
    print(f"   Make sure you're running from the correct directory")
    print(f"   Expected path: {rasa_path}")
    sys.exit(1)

def show_config():
    """Display the current database configuration."""
    
    print("🔧 Database Configuration")
    print("=" * 40)
    
    # Show environment variables
    print("\n📋 Environment Variables:")
    env_vars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
    for var in env_vars:
        value = os.getenv(var)
        if value:
            if var == 'DB_PASSWORD':
                display_value = '*' * len(value)
            else:
                display_value = value
            print(f"  {var}: {display_value}")
        else:
            print(f"  {var}: (not set)")
    
    # Show actual configuration being used
    print("\n⚙️  Active Configuration:")
    db_conn = DatabaseConnection()
    print(f"  Host: {db_conn.host}")
    print(f"  Port: {db_conn.port}")
    print(f"  Database: {db_conn.database}")
    print(f"  User: {db_conn.user}")
    print(f"  Password: {'*' * len(db_conn.password) if db_conn.password else 'None'}")
    
    print("\n💡 Configuration Priority:")
    print("  1. Constructor parameters (if provided)")
    print("  2. Environment variables")
    print("  3. Default values")

if __name__ == "__main__":
    show_config() 