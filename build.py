import os
import shutil
import subprocess
import sys

def clean_build_folders():
    """Clean up build artifacts from previous builds"""
    folders_to_clean = ['build', 'dist']
    for folder in folders_to_clean:
        if os.path.exists(folder):
            shutil.rmtree(folder)
            print(f"Cleaned {folder} directory")

def copy_required_files(dist_path):
    """Copy necessary files and folders to the distribution directory"""
    # List of files and folders to copy
    resources = [
        'templates',
        'static',
        'routes',
        'utils',
        'courses.db',  # If you're using SQLite
        'requirements.txt'
    ]
    
    for resource in resources:
        if os.path.exists(resource):
            if os.path.isdir(resource):
                shutil.copytree(resource, os.path.join(dist_path, resource))
            else:
                shutil.copy2(resource, dist_path)
            print(f"Copied {resource} to distribution folder")

def build_executable():
    """Build the executable using PyInstaller"""
    # Clean previous builds
    clean_build_folders()
    
    # PyInstaller command
    pyinstaller_command = [
        'pyinstaller',
        '--noconfirm',
        '--onedir',  # Create a directory containing the executable
        '--windowed',  # Windows only: hide the console
        '--icon=static/app.ico',  # Add your icon here
        '--name=CourseManagementSystem',  # Name of your executable
        '--title=Course Management System',  # Title of the window
        '--add-data=templates;templates',  # Include templates
        '--add-data=static;static',  # Include static files
        '--add-data=routes;routes',  # Include routes
        '--add-data=utils;utils',  # Include utils
        '--hidden-import=flask',
        '--hidden-import=flask_cors',
        '--hidden-import=flaskwebgui',
        'app.py'  # Your main script
    ]
    
    # Run PyInstaller
    subprocess.run(pyinstaller_command)
    
    # Copy additional files
    dist_path = os.path.join('dist', 'CourseManagementSystem')
    copy_required_files(dist_path)
    
    print("Build completed successfully!")

if __name__ == '__main__':
    build_executable() 