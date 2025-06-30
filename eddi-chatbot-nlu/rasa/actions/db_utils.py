import psycopg2
import psycopg2.extras
from typing import List, Dict, Optional, Tuple
import logging
import os
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class DatabaseConnection:
    """Database connection manager for PostgreSQL."""
    
    def __init__(self, host: Optional[str] = None, port: Optional[int] = None, 
                 database: Optional[str] = None, user: Optional[str] = None, 
                 password: Optional[str] = None):
        # Use environment variables with fallbacks to default values
        self.host = host or os.getenv('DB_HOST', 'localhost')
        self.port = port or int(os.getenv('DB_PORT', '5432'))
        self.database = database or os.getenv('DB_NAME', 'dbq')
        self.user = user or os.getenv('DB_USER', 'dbowner')
        self.password = password or os.getenv('DB_PASSWORD', 'dbq_password_2024')
        
        logger.info(f"Database configuration loaded:")
        logger.info(f"  Host: {self.host}")
        logger.info(f"  Port: {self.port}")
        logger.info(f"  Database: {self.database}")
        logger.info(f"  User: {self.user}")
        logger.info(f"  Password: {'*' * len(self.password) if self.password else 'None'}")
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections."""
        conn = None
        try:
            logger.info(f"Connecting to PostgreSQL at {self.host}:{self.port}/{self.database}")
            conn = psycopg2.connect(
                host=self.host,
                port=self.port,
                database=self.database,
                user=self.user,
                password=self.password
            )
            logger.info("Database connection established successfully")
            yield conn
        except psycopg2.Error as e:
            logger.error(f"Database connection error: {e}")
            raise
        finally:
            if conn:
                conn.close()
                logger.info("Database connection closed")
    
    def check_hostname_exists(self, hostname: str) -> bool:
        """Check if a hostname exists in the inventory table."""
        logger.info(f"Checking if hostname '{hostname}' exists in inventory")
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    query = "SELECT COUNT(*) FROM dbq.inventory WHERE host_nm = %s"
                    logger.info(f"Executing query: {query} with hostname: {hostname}")
                    cursor.execute(query, (hostname,))
                    result = cursor.fetchone()
                    count = result[0] if result else 0
                    logger.info(f"Hostname '{hostname}' found {count} times in inventory")
                    return count > 0
        except Exception as e:
            logger.error(f"Error checking hostname existence: {e}")
            return False
    
    def get_patch_information(self, hostname: str) -> List[Dict]:
        """Get patch information for a specific hostname."""
        logger.info(f"Retrieving patch information for hostname: '{hostname}'")
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                    query = """
                    SELECT 
                        i.resource_id,
                        i.resource_nm,
                        i.db_type_cd,
                        i.host_nm,
                        i.version_num,
                        i.resource_status,
                        p.patch_id,
                        p.patch_version,
                        p.patch_type,
                        p.patch_status,
                        p.applied_ts,
                        p.patch_details
                    FROM dbq.inventory i
                    LEFT JOIN dbq.patches p ON i.resource_id = p.resource_id
                    WHERE i.host_nm = %s
                    ORDER BY p.applied_ts DESC NULLS LAST
                    """
                    logger.info(f"Executing patch query for hostname: {hostname}")
                    cursor.execute(query, (hostname,))
                    results = cursor.fetchall()
                    logger.info(f"Found {len(results)} total rows for hostname '{hostname}'")
                    
                    # Convert to list of dictionaries
                    patches = []
                    for row in results:
                        patch_data = dict(row)
                        if patch_data['patch_id']:  # Only include rows with patch data
                            patches.append(patch_data)
                    
                    logger.info(f"Returning {len(patches)} patches for hostname '{hostname}'")
                    return patches
        except Exception as e:
            logger.error(f"Error getting patch information: {e}")
            return []
    
    def get_host_info(self, hostname: str) -> Optional[Dict]:
        """Get basic host information."""
        logger.info(f"Retrieving host information for hostname: '{hostname}'")
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                    query = """
                    SELECT resource_id, resource_nm, db_type_cd, host_nm, 
                           version_num, resource_status, location
                    FROM dbq.inventory 
                    WHERE host_nm = %s
                    """
                    logger.info(f"Executing host info query for hostname: {hostname}")
                    cursor.execute(query, (hostname,))
                    result = cursor.fetchone()
                    if result:
                        logger.info(f"Found host info for '{hostname}': {dict(result)}")
                    else:
                        logger.warning(f"No host info found for '{hostname}'")
                    return dict(result) if result else None
        except Exception as e:
            logger.error(f"Error getting host info: {e}")
            return None

# Global database connection instance
db_connection = DatabaseConnection() 