import os
import sys
import subprocess
from splash import SplashScreen
import time

def run_app():
    # Show splash screen
    splash = SplashScreen()
    
    try:
        # Get the directory containing the executable
        if getattr(sys, 'frozen', False):
            application_path = os.path.dirname(sys.executable)
        else:
            application_path = os.path.dirname(os.path.abspath(__file__))
        
        # Change to the application directory
        os.chdir(application_path)
        
        # Import and run the main application
        from app import app
        
        # Initialize FlaskUI
        from flaskwebgui import FlaskUI
        
        # Configure FlaskUI
        ui = FlaskUI(
            app=app,
            server="flask",
            width=1920,
            height=1080,
            port=5000
        )
        
        # Close splash screen
        splash.destroy()
        
        # Start the application
        ui.run()
        
    except Exception as e:
        splash.destroy()
        # Log any errors
        with open('error_log.txt', 'a') as f:
            f.write(f"Error: {str(e)}\n")
        raise

if __name__ == '__main__':
    run_app() 