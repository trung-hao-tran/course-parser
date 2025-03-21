from flask import Blueprint, request, jsonify, send_file
import os
import logging
import re
import threading
from utils.db_manager import DatabaseManager

logger = logging.getLogger(__name__)

import_export_bp = Blueprint('import_export_bp', __name__)

@import_export_bp.route('/api/import', methods=['POST'])
def import_file():
    try:
        from app import cms  # Import here to avoid circular imports
        from LectureHallExtractor import LectureHallExtractor  # Import the LectureHallExtractor
        
        # Check if any files were uploaded
        course_files = []
        lecture_hall_files = []
        
        # Process course files
        for key in request.files:
            if key.startswith('course_files'):
                course_files.append(request.files[key])
                logger.info(f"Found course file: {request.files[key].filename}")
        
        # Process lecture hall files
        for key in request.files:
            if key.startswith('lecture_hall_files'):
                lecture_hall_files.append(request.files[key])
                logger.info(f"Found lecture hall file: {request.files[key].filename}")
        
        # For backward compatibility, check if there's a single file
        if 'file' in request.files:
            course_files.append(request.files['file'])
            logger.info(f"Found single file (backward compatibility): {request.files['file'].filename}")
        
        if len(course_files) == 0 and len(lecture_hall_files) == 0:
            return jsonify({'error': 'No files uploaded'}), 400
        
        logger.info(f"Processing {len(course_files)} course files and {len(lecture_hall_files)} lecture hall files")
        
        # Get the database manager
        db_manager = DatabaseManager(cms.db_name)
        
        # Reset the database
        db_manager.reset_database()
        
        # Process files concurrently
        all_courses = []
        all_course_details = []
        all_lecture_halls = []
        
        # Define processing functions for threading
        def process_course_files():
            nonlocal all_courses, all_course_details
            
            for file in course_files:
                if file.filename == '':
                    continue
                    
                # Save the file temporarily
                temp_path = f'temp_course_{threading.get_ident()}.xlsx'
                file.save(temp_path)
                
                try:
                    # Process the file
                    logger.info(f"Processing course file: {file.filename}")
                    courses, course_details = cms.parse_excel(temp_path)
                    logger.info(f"Extracted {len(courses)} courses and {len(course_details)} course details from {file.filename}")
                    
                    # Thread-safe append to lists
                    with threading.Lock():
                        all_courses.extend(courses)
                        all_course_details.extend(course_details)
                finally:
                    # Clean up
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
        
        def process_lecture_hall_files():
            nonlocal all_lecture_halls
            
            # Initialize the LectureHallExtractor with the same database
            hall_extractor = LectureHallExtractor(cms.db_name)
            
            for file in lecture_hall_files:
                if file.filename == '':
                    continue
                    
                # Save the file temporarily
                temp_path = f'temp_lecture_hall_{threading.get_ident()}.xlsx'
                file.save(temp_path)
                
                try:
                    # Process the file using LectureHallExtractor
                    logger.info(f"Processing lecture hall file: {file.filename}")
                    lecture_halls = hall_extractor.parse_excel(temp_path)
                    logger.info(f"Extracted {len(lecture_halls)} lecture halls from {file.filename}")
                    
                    # Thread-safe append to list
                    with threading.Lock():
                        all_lecture_halls.extend(lecture_halls)
                except Exception as e:
                    logger.error(f"Error processing lecture hall file {file.filename}: {str(e)}")
                finally:
                    # Clean up
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
        
        # Create and start threads for concurrent processing
        threads = []
        
        if course_files:
            course_thread = threading.Thread(target=process_course_files)
            course_thread.start()
            threads.append(course_thread)
        
        if lecture_hall_files:
            hall_thread = threading.Thread(target=process_lecture_hall_files)
            hall_thread.start()
            threads.append(hall_thread)
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Process course_details to match the table structure
        processed_details = []
        for detail in all_course_details:
            # Make sure we have exactly 5 elements (course_symbol, course_name, teacher_1, teacher_2, data_origin)
            if len(detail) >= 5:
                # Use the first 5 elements
                processed_details.append(detail[:5])
            elif len(detail) == 4:
                # Add data_origin as the 5th element
                processed_details.append(detail + ['unknown'])
            else:
                logger.warning(f"Skipping course detail with unexpected format: {detail}")
        
        logger.info(f"Processed {len(processed_details)} course details")
        
        # Store data in database
        if all_courses and processed_details:
            logger.info(f"Storing {len(all_courses)} courses and {len(processed_details)} course details")
            cms.store_data(all_courses, processed_details)
        
        # Store lecture hall data and match with courses
        if all_lecture_halls:
            logger.info(f"Storing {len(all_lecture_halls)} lecture halls")
            hall_extractor = LectureHallExtractor(cms.db_name)
            hall_extractor.store_data(all_lecture_halls)
        
        # Prepare response message
        course_count = len(all_courses)
        lecture_hall_count = len(all_lecture_halls)
        
        message = f"Successfully imported {course_count} courses"
        if lecture_hall_count > 0:
            message += f" and {lecture_hall_count} lecture halls"
        
        return jsonify({
            'message': message,
            'course_count': course_count,
            'lecture_hall_count': lecture_hall_count
        })
    except Exception as e:
        logger.error(f"Error importing files: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@import_export_bp.route('/api/export', methods=['GET'])
def export_data():
    try:
        from app import cms  # Import here to avoid circular imports
        
        # Generate temporary CSV file
        temp_path = 'temp_export.csv'
        
        # Export data using the CourseManagementSystem
        cms.export_to_csv(output_file=temp_path)
        
        # Send file
        return send_file(
            temp_path,
            as_attachment=True,
            download_name='courses_export.csv',
            mimetype='text/csv'
        )
    except Exception as e:
        logger.error(f"Error exporting data: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500 