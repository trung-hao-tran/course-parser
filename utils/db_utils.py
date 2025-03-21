import os
import logging
from CourseManageSystem import CourseManagementSystem

logger = logging.getLogger(__name__)

def init_db():
    try:
        # Remove the old database file if it exists
        if os.path.exists("courses.db"):
            os.remove("courses.db")
        
        # Create a new database
        cms = CourseManagementSystem("courses.db")
        return cms
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise 