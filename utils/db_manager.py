import sqlite3
import threading
import logging
import os
import time
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class DatabaseManager:
    """
    Singleton database manager to handle database connections and prevent locking issues.
    """
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, db_name=None):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(DatabaseManager, cls).__new__(cls)
                cls._instance.db_name = db_name or "courses.db"
                cls._instance.connection_pool = {}
                cls._instance.connection_locks = {}
                cls._instance.initialized = False
            elif db_name is not None:
                cls._instance.db_name = db_name
        return cls._instance
    
    def initialize(self):
        """Initialize the database with required tables"""
        if self.initialized:
            return
            
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Create course tables
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS course_details (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    course_symbol TEXT,
                    course_name TEXT NOT NULL,
                    teacher_1 TEXT,
                    teacher_2 TEXT,
                    class TEXT,
                    data_origin TEXT
                )
            ''')

            cursor.execute('''
                CREATE TABLE IF NOT EXISTS courses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    course_symbol TEXT NOT NULL,
                    course_datetime TEXT NOT NULL,
                    week TEXT,
                    class TEXT,
                    period TEXT,
                    comment TEXT,
                    event TEXT,
                    data_origin TEXT,
                    detail_origin TEXT,
                    hall TEXT
                )
            ''')
            
            # Create lecture hall table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS lecture_halls (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    hall_symbol TEXT NOT NULL,
                    hall_datetime TEXT NOT NULL,
                    week TEXT,
                    class TEXT,
                    period TEXT,
                    data_origin TEXT
                )
            ''')
            
        self.initialized = True
        logger.info(f"Database {self.db_name} initialized with required tables")
    
    def reset_database(self):
        """Reset the database by dropping and recreating tables"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Drop existing tables
            cursor.execute('DROP TABLE IF EXISTS courses')
            cursor.execute('DROP TABLE IF EXISTS course_details')
            cursor.execute('DROP TABLE IF EXISTS lecture_halls')
            
        self.initialized = False
        self.initialize()
        logger.info(f"Database {self.db_name} has been reset")
    
    @contextmanager
    def get_connection(self, max_retries=5, retry_delay=0.5):
        """
        Get a database connection from the pool or create a new one.
        Uses thread-specific connections to avoid conflicts.
        """
        thread_id = threading.get_ident()
        
        # Create a lock for this thread if it doesn't exist
        if thread_id not in self.connection_locks:
            self.connection_locks[thread_id] = threading.Lock()
        
        # Acquire the lock for this thread
        with self.connection_locks[thread_id]:
            # Get or create a connection for this thread
            if thread_id not in self.connection_pool:
                for attempt in range(max_retries):
                    try:
                        # Use default isolation_level (which is '') to allow manual transaction control
                        self.connection_pool[thread_id] = sqlite3.connect(
                            self.db_name, 
                            timeout=20  # Increase timeout to wait for locks
                        )
                        # Enable foreign keys
                        self.connection_pool[thread_id].execute("PRAGMA foreign_keys = ON")
                        # Use WAL mode for better concurrency
                        self.connection_pool[thread_id].execute("PRAGMA journal_mode = WAL")
                        break
                    except sqlite3.OperationalError as e:
                        if "database is locked" in str(e) and attempt < max_retries - 1:
                            logger.warning(f"Database locked, retrying in {retry_delay}s (attempt {attempt+1}/{max_retries})")
                            time.sleep(retry_delay)
                        else:
                            raise
            
            conn = self.connection_pool[thread_id]
            
            try:
                # Begin a transaction
                conn.execute("BEGIN")
                
                # Yield the connection for use
                yield conn
                
                # Commit the transaction if no exception occurred
                conn.commit()
            except Exception as e:
                # Rollback on error
                try:
                    conn.rollback()
                except sqlite3.OperationalError as rollback_error:
                    # If rollback fails because no transaction is active, just log it
                    if "no transaction is active" in str(rollback_error):
                        logger.warning("No transaction to rollback")
                    else:
                        # For other rollback errors, log and continue
                        logger.error(f"Error during rollback: {str(rollback_error)}")
                
                logger.error(f"Database error: {str(e)}")
                raise
    
    def close_all_connections(self):
        """Close all database connections in the pool"""
        for thread_id, conn in list(self.connection_pool.items()):
            try:
                conn.close()
                del self.connection_pool[thread_id]
            except Exception as e:
                logger.error(f"Error closing connection: {str(e)}")
    
    def execute_query(self, query, params=None, fetch_all=False, fetch_one=False):
        """Execute a query and optionally fetch results"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            if fetch_all:
                return cursor.fetchall()
            elif fetch_one:
                return cursor.fetchone()
            else:
                return cursor.lastrowid
    
    def execute_many(self, query, params_list):
        """Execute a query with multiple parameter sets"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.executemany(query, params_list)
            return cursor.rowcount
    
    def table_exists(self, table_name):
        """Check if a table exists in the database"""
        query = "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
        result = self.execute_query(query, (table_name,), fetch_one=True)
        return result is not None
    
    def column_exists(self, table_name, column_name):
        """Check if a column exists in a table"""
        if not self.table_exists(table_name):
            return False
            
        query = f"PRAGMA table_info({table_name})"
        columns = self.execute_query(query, fetch_all=True)
        return any(column[1] == column_name for column in columns)
    
    def add_column_if_not_exists(self, table_name, column_name, column_type):
        """Add a column to a table if it doesn't exist"""
        if not self.column_exists(table_name, column_name):
            query = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
            self.execute_query(query)
            logger.info(f"Added column {column_name} to table {table_name}")
            return True
        return False 