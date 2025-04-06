from flask import Blueprint, jsonify
import logging
from datetime import datetime
from utils.db_manager import DatabaseManager

logger = logging.getLogger(__name__)

course_bp = Blueprint('course_bp', __name__)

@course_bp.route('/api/courses', methods=['GET'])
def get_courses():
    try:
        from app import cms  # Import here to avoid circular imports
        
        # Get the database manager
        db_manager = DatabaseManager(cms.db_name)
        
        # Check if lecture_halls table exists
        lecture_halls_exists = db_manager.table_exists('lecture_halls')
        
        # Check if hall column exists in courses table
        hall_column_exists = db_manager.column_exists('courses', 'hall')
        
        # Make sure the hall column exists
        if not hall_column_exists:
            db_manager.add_column_if_not_exists('courses', 'hall', 'TEXT')
            hall_column_exists = True
        
        # Construct the query based on available tables and columns
        if lecture_halls_exists:
            logger.debug("Lecture halls table exists, using direct query from courses table")
            # No need to join with lecture_halls since we've already populated the hall field
            query = '''
                SELECT 
                    course_symbol, 
                    course_datetime, 
                    week, 
                    class, 
                    period, 
                    comment, 
                    event, 
                    data_origin, 
                    detail_origin,
                    hall
                FROM courses
            '''
        else:
            logger.debug("Using basic query without lecture hall data")
            query = 'SELECT course_symbol, course_datetime, week, class, period, comment, event, data_origin, detail_origin, hall FROM courses'
        
        logger.debug(f"Executing SELECT query on courses table: {query}")
        courses = db_manager.execute_query(query, fetch_all=True)
        logger.debug(f"Found {len(courses)} courses")
        
        logger.debug("Executing SELECT query on course_details table")
        details = db_manager.execute_query('SELECT course_symbol, course_name, teacher_1, teacher_2 FROM course_details', fetch_all=True)
        logger.debug(f"Found {len(details)} course details")
        
        # Convert to list of dictionaries for JSON response
        course_list = []
        for course in courses:
            # Format the date if it exists
            date_str = course[1] if course[1] is not None else ''
            formatted_date = ''
            if date_str:
                try:
                    date_obj = datetime.strptime(str(date_str).strip(), '%Y-%m-%d %H:%M:%S')
                    formatted_date = date_obj.strftime('%d/%m/%Y')
                except Exception as e:
                    logger.error(f"Error formatting date {date_str}: {str(e)}")
                    formatted_date = date_str
            
            # Combine symbol with event if it exists
            symbol = course[0] if course[0] is not None else ''
            event = course[6] if course[6] is not None else ''
            combined_symbol = f"{symbol}{event}" if event else symbol
            
            # Create base course dictionary
            course_dict = {
                'course_symbol': combined_symbol,
                'date': formatted_date,
                'week': course[2] if course[2] is not None else '',
                'class': course[3] if course[3] is not None else '',
                'period': course[4] if course[4] is not None else '',
                'comment': course[5] if course[5] is not None else '',
                'origin': course[7] if course[7] is not None else '',
                'detail_origin': course[8] if course[8] is not None else '',
                'hall': course[9] if len(course) > 9 and course[9] is not None else ''
            }
            
            # Find matching details and only add courses with a name
            for detail in details:
                if detail[0] == course[0] and detail[1] and detail[1].strip():
                    course_dict.update({
                        'course_name': detail[1],
                        'teacher_1': detail[2] if detail[2] is not None else '',
                        'teacher_2': detail[3] if detail[3] is not None else ''
                    })
                    course_list.append(course_dict)
                    break
            
        logger.debug(f"Returning {len(course_list)} formatted courses (filtered out courses without names)")
        logger.debug(f"First course example: {course_list[0] if course_list else 'No courses'}")
        
        response_data = {'courses': course_list}
        logger.debug(f"Response data structure: {list(response_data.keys())}")
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Error in get_courses: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500 