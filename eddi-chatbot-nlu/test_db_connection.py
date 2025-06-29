#!/usr/bin/env python3
"""
Test script to verify PostgreSQL database connection and queries.
Run this script to test the database connection before using it in Rasa actions.
"""

import sys
import os

# Add the rasa directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'rasa'))

from actions.db_utils import db_connection

def test_database_connection():
    """Test the database connection and basic queries."""
    
    print("🔍 Testing PostgreSQL Database Connection...")
    print("=" * 50)
    
    # Test 1: Basic connection
    print("\n1. Testing basic connection...")
    try:
        with db_connection.get_connection() as conn:
            print("✅ Database connection successful!")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    
    # Test 2: Check if tables exist
    print("\n2. Checking if required tables exist...")
    try:
        with db_connection.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'dbq' 
                    AND table_name IN ('inventory', 'patches')
                    ORDER BY table_name
                """)
                tables = [row[0] for row in cursor.fetchall()]
                
                if 'inventory' in tables and 'patches' in tables:
                    print("✅ Required tables (dbq.inventory, dbq.patches) found!")
                else:
                    print(f"❌ Missing tables. Found: {tables}")
                    return False
    except Exception as e:
        print(f"❌ Error checking tables: {e}")
        return False
    
    # Test 3: Check sample hostnames
    print("\n3. Checking sample hostnames in inventory...")
    try:
        with db_connection.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT host_nm, db_type_cd, resource_status 
                    FROM dbq.inventory 
                    LIMIT 5
                """)
                hosts = cursor.fetchall()
                
                if hosts:
                    print("✅ Found hostnames in inventory:")
                    for host in hosts:
                        print(f"   - {host[0]} ({host[1]}, {host[2]})")
                else:
                    print("❌ No hostnames found in inventory table")
                    return False
    except Exception as e:
        print(f"❌ Error checking hostnames: {e}")
        return False
    
    # Test 4: Test hostname existence check
    print("\n4. Testing hostname existence check...")
    test_hostname = "postgres-prod-01.company.com"
    exists = db_connection.check_hostname_exists(test_hostname)
    if exists:
        print(f"✅ Hostname '{test_hostname}' found in inventory")
    else:
        print(f"❌ Hostname '{test_hostname}' not found in inventory")
    
    # Test 5: Test patch information retrieval
    print("\n5. Testing patch information retrieval...")
    try:
        patches = db_connection.get_patch_information(test_hostname)
        if patches:
            print(f"✅ Found {len(patches)} patches for '{test_hostname}':")
            for i, patch in enumerate(patches[:3], 1):  # Show first 3 patches
                print(f"   {i}. {patch.get('patch_id')} - {patch.get('patch_version')} ({patch.get('patch_status')})")
        else:
            print(f"ℹ️  No patches found for '{test_hostname}' (this is normal for some hosts)")
    except Exception as e:
        print(f"❌ Error retrieving patch information: {e}")
        return False
    
    # Test 6: Test host info retrieval
    print("\n6. Testing host information retrieval...")
    try:
        host_info = db_connection.get_host_info(test_hostname)
        if host_info:
            print(f"✅ Host info for '{test_hostname}':")
            print(f"   - Resource Name: {host_info.get('resource_nm')}")
            print(f"   - Database Type: {host_info.get('db_type_cd')}")
            print(f"   - Version: {host_info.get('version_num')}")
            print(f"   - Status: {host_info.get('resource_status')}")
            print(f"   - Location: {host_info.get('location')}")
        else:
            print(f"❌ No host info found for '{test_hostname}'")
    except Exception as e:
        print(f"❌ Error retrieving host info: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 All database tests completed successfully!")
    print("The database connection is ready for use with Rasa actions.")
    return True

if __name__ == "__main__":
    success = test_database_connection()
    if not success:
        print("\n❌ Database tests failed. Please check your database configuration.")
        sys.exit(1)
    else:
        print("\n✅ Database is ready for Rasa integration!") 