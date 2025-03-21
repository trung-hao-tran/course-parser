# Course Management System

A standalone desktop application for managing course schedules, lecture halls, and teaching assignments.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Running the Application](#running-the-application)
4. [Building a Standalone Executable](#building-a-standalone-executable)
5. [File Structure](#file-structure)
6. [Features](#features)
7. [Troubleshooting](#troubleshooting)

## Overview

The Course Management System is a desktop application built with Python and Flask that allows users to:

- Import course data from Excel files
- View and filter course information
- Search for specific courses
- Export course data to CSV
- Reset the database when needed

The application uses a web-based interface but runs as a standalone desktop application without requiring an internet connection.

## Installation

### Prerequisites

- Python 3.7 or higher
- Pip (Python package installer)

### Steps

1. **Download the application**:
   - Download the application files or clone the repository

2. **Install dependencies**:
   - Open a terminal/command prompt
   - Navigate to the application directory
   - Run the following command:
   ```
   pip install -r requirements.txt
   ```

## Running the Application

### Method 1: Running from Source

1. Open a terminal/command prompt
2. Navigate to the application directory
3. Run the following command:
   ```
   python app.py
   ```
4. The application will start and open in a new window

### Method 2: Using the Executable (if available)

1. Navigate to the `dist/CourseManagementSystem` directory
2. Double-click the `CourseManagementSystem` executable file
3. The application will start in a new window

## Building a Standalone Executable

To create a standalone executable that can be distributed to others:

1. Open a terminal/command prompt
2. Navigate to the application directory
3. Verify that the `CourseManagementSystem.spec` file exists in the application directory
4. Run the following command:
   ```
   pyinstaller CourseManagementSystem.spec
   ```
5. The executable will be created in the `dist/CourseManagementSystem` directory

Alternatively, you can use the included build script:

## File Structure

The application is organized into the following directories:

### Main Files

- `app.py`: The main application file that starts the Flask server
- `CourseManageSystem.py`: Contains the core logic for managing courses
- `LectureHallExtractor.py`: Handles extraction of lecture hall data from Excel files
- `requirements.txt`: Lists all the Python packages required by the application

### Directories

- **templates/**: Contains HTML templates for the user interface
  - `index.html`: The main page template
  - **components/**: Reusable UI components
    - `header.html`: The application header with buttons
    - `filters.html`: Filter controls for course data
    - `course_table.html`: Table displaying course information
    - `search_bar.html`: Search functionality
    
- **static/**: Contains static files like CSS, JavaScript, and images
  - **css/**: Stylesheet files
    - `style.css`: Main stylesheet for the application
  - **js/**: JavaScript files
    - `app.js`: Main application logic for the frontend
    - **modules/**: JavaScript utility modules
      - `filter-utils.js`: Utilities for filtering data
      - `date-utils.js`: Date handling utilities
      
- **routes/**: Contains API route definitions
  - `course_routes.py`: API endpoints for course data
  - `import_export_routes.py`: API endpoints for importing and exporting data
  
- **utils/**: Utility modules
  - `db_manager.py`: Database management utilities

## Features

### Importing Data

1. Click the "Import Excel" button in the header
2. Select one or more Excel files containing course data
3. Click "Import" to load the data into the application

### Filtering Courses

1. Use the filter dropdowns to select filter criteria
2. Click "Apply Filters" to filter the course list
3. Click "Clear Filters" to remove all filters

### Searching

1. Type in the search box to search for courses
2. Results will update as you type

### Exporting Data

1. Click the "Export" button (if available)
2. Choose a location to save the CSV file
3. All filtered data will be exported

### Resetting the Database

1. Click the "Reset Database" button in the header
2. Confirm the action when prompted
3. The database will be cleared and all data will be removed

## Troubleshooting

### Application Won't Start

- Make sure all dependencies are installed
- Check if another instance of the application is already running
- Try running the application from the command line to see any error messages

### Import Errors

- Make sure your Excel files are in the correct format
- Check if the files are not open in another application
- Try with a smaller file first to test

### Database Errors

- If you encounter database errors, try using the "Reset Database" function
- If that doesn't work, you can manually delete the `courses.db` file and restart the application

### 404 Errors

If you see 404 errors in the application:
- Make sure you're using the correct version of the application
- Try restarting the application
- If the problem persists, try rebuilding the application 