from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
from flaskwebgui import FlaskUI
from CourseManageSystem import CourseManagementSystem
import os
import logging
import atexit
from utils.db_manager import DatabaseManager
import sys
from flask import Blueprint

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize the database manager
db_manager = DatabaseManager("courses.db")
db_manager.initialize()

# Initialize the CourseManagementSystem with the database
cms = CourseManagementSystem("courses.db")

# Import modularized components
from routes.course_routes import course_bp
from routes.import_export_routes import import_export_bp

# Register blueprints
app.register_blueprint(course_bp)
app.register_blueprint(import_export_bp)

# Create a new blueprint for database operations
db_bp = Blueprint('database', __name__)

@db_bp.route('/reset-database', methods=['POST'])
def reset_database():
    try:
        db_manager = DatabaseManager()
        db_manager.reset_database()
        return jsonify({"success": True, "message": "Database reset successfully"})
    except Exception as e:
        app.logger.error(f"Error resetting database: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# Register the blueprint with a prefix
app.register_blueprint(db_bp, url_prefix='/api')

@app.before_request
def log_request_info():
    app.logger.debug('Headers: %s', request.headers)
    app.logger.debug('Body: %s', request.get_data())
    app.logger.debug('Route: %s %s', request.method, request.path)

# Print all registered routes at startup
def list_routes():
    output = []
    for rule in app.url_map.iter_rules():
        methods = ','.join(rule.methods)
        output.append(f"{rule.endpoint:50s} {methods:20s} {rule}")
    for line in sorted(output):
        app.logger.info(line)

# Call this after registering all blueprints
list_routes()

@app.route('/')
def index():
    return render_template('index.html')

def cleanup():
    """Clean up temporary files and database connections on exit"""
    try:
        # Close all database connections
        db_manager.close_all_connections()
        
        # Remove temporary files
        for temp_file in ["temp_upload.xlsx", "temp_export.csv"]:
            if os.path.exists(temp_file):
                os.remove(temp_file)
                
        # Remove any other temporary files that might have been created
        for filename in os.listdir('.'):
            if filename.startswith('temp_course_') or filename.startswith('temp_lecture_hall_'):
                try:
                    os.remove(filename)
                    logger.info(f"Removed temporary file: {filename}")
                except Exception as e:
                    logger.error(f"Error removing temporary file {filename}: {str(e)}")
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")

# Register cleanup function
atexit.register(cleanup)

# Add the application directory to the Python path
if getattr(sys, 'frozen', False):
    application_path = os.path.dirname(sys.executable)
else:
    application_path = os.path.dirname(os.path.abspath(__file__))

# Add the application path to sys.path
if application_path not in sys.path:
    sys.path.insert(0, application_path)

# Error handler
@app.errorhandler(Exception)
def handle_exception(e):
    """Return JSON instead of HTML for any other error"""
    # Log the error
    app.logger.error(f"Unhandled exception: {str(e)}")
    # Return JSON response
    response = jsonify({
        "success": False,
        "error": str(e)
    })
    response.status_code = 500
    return response

# Add this to your app.py to check for any route conflicts
@app.route('/api/routes', methods=['GET'])
def get_routes():
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'rule': str(rule)
        })
    return jsonify(routes)

# Modify the main block to work with PyInstaller
if __name__ == "__main__":
    try:
        # Initialize FlaskUI with larger window size
        ui = FlaskUI(app=app, server="flask", width=1920, height=1080)
        ui.run()
    except Exception as e:
        # Log any errors
        with open('error_log.txt', 'a') as f:
            f.write(f"Error: {str(e)}\n")
        raise
