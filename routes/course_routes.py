from flask import Blueprint, jsonify
import logging
from datetime import datetime
from utils.db_manager import DatabaseManager
import re

logger = logging.getLogger(__name__)

course_bp = Blueprint('course_bp', __name__)

@course_bp.route('/api/courses', methods=['GET'])
def get_courses():
    try:
        from app import cms  # Import here to avoid circular imports
        from flask import request
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 100, type=int)
        
        # Get filter parameters - group by field
        filter_groups = {}
        for param in ['week', 'class', 'period', 'hall', 'day_of_week']:
            field_values = request.args.getlist(param)
            if field_values:
                filter_groups[param] = field_values
        
        # Get special filter parameters
        course_symbol_values = request.args.getlist('course_symbol')  # For symbol_numeric
        event_values = request.args.getlist('event')  # For symbol_suffix
        teacher_values = request.args.getlist('teacher_1')  # For teacher filter
        
        # Get search query parameter
        search = request.args.get('search')
        
        # Get date range parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Get sort parameters
        sort_field = request.args.get('sort_field')
        sort_direction = request.args.get('sort_direction', 'asc')
        
        # Get the database manager
        db_manager = DatabaseManager(cms.db_name)
        
        # Check required columns exist
        hall_column_exists = db_manager.column_exists('courses', 'hall')
        if not hall_column_exists:
            db_manager.add_column_if_not_exists('courses', 'hall', 'TEXT')
        
        # Base query to select courses
        base_query = '''
            SELECT 
                c.course_symbol, 
                c.course_datetime, 
                c.week, 
                c.class, 
                c.period, 
                c.comment, 
                c.event, 
                c.data_origin, 
                c.detail_origin,
                c.hall,
                c.day_of_week
            FROM courses c
        '''
        
        # Build where clauses and params
        where_clauses = []
        params = []
        
        # Handle date range filters
        if start_date:
            where_clauses.append("c.course_datetime >= ?")
            params.append(start_date)
        if end_date:
            where_clauses.append("c.course_datetime <= ?")
            params.append(end_date + " 23:59:59")  # Include the entire day
        
        # Handle standard filters - same field values use OR, different fields use AND
        for field, values in filter_groups.items():
            field_clauses = []
            for value in values:
                field_clauses.append(f"c.{field} LIKE ?")
                params.append(f"%{value}%")
            
            if field_clauses:
                where_clauses.append(f"({' OR '.join(field_clauses)})")
        
        # Handle special case: symbol_numeric filter (course_symbol)
        if course_symbol_values:
            symbol_clauses = []
            for course_symbol in course_symbol_values:
                symbol_clauses.append("c.course_symbol LIKE ?")
                params.append(f"{course_symbol}%")
            
            where_clauses.append(f"({' OR '.join(symbol_clauses)})")
        
        # Handle special case: symbol_suffix filter (event)
        if event_values:
            event_clauses = []
            
            for event in event_values:
                # For event filter, we need to match course symbols that end with the specific letter
                # SQLite doesn't always support REGEXP, so we'll use LIKE with a specific pattern
                
                # Special handling for "H" and "K" suffixes, which are common
                if event.upper() in ["H", "K"]:
                    # Extract all course symbols ending with this suffix
                    extract_query = f"SELECT DISTINCT course_symbol FROM courses WHERE course_symbol LIKE ?"
                    extract_params = [f"%{event}"]
                    filtered_symbols = db_manager.execute_query(extract_query, extract_params, fetch_all=True)
                    
                    # Validate that the symbols actually end with the suffix and not just contain it
                    suffix_symbols = []
                    for symbol_row in filtered_symbols:
                        symbol = symbol_row[0]
                        if symbol and re.search(r'\d+' + re.escape(event) + '$', symbol, re.IGNORECASE):
                            suffix_symbols.append(symbol)
                    
                    # If we found matching symbols, add them to the filter
                    if suffix_symbols:
                        # Create placeholders for all matching symbols
                        placeholders = ','.join(['?'] * len(suffix_symbols))
                        event_clauses.append(f"(c.course_symbol IN ({placeholders}) OR c.event = ?)")
                        params.extend(suffix_symbols)  # Add all symbols to params
                        params.append(event)           # Also match the event field
                    else:
                        # Fallback if no specific symbols found
                        event_clauses.append("(c.course_symbol LIKE ? OR c.event = ?)")
                        params.append(f"%{event}")  # Use % to match any prefix
                        params.append(event)        # Also match the event field
                else:
                    # For other event types, use the simple pattern
                    event_clauses.append("(c.course_symbol LIKE ? OR c.event = ?)")
                    params.append(f"%{event}")  # Use % to match any prefix
                    params.append(event)        # Also match the event field
            
            if event_clauses:
                where_clauses.append(f"({' OR '.join(event_clauses)})")
        
        # Handle special case: teacher filter
        if teacher_values:
            # Need to check only teacher_1 in course_details table
            # This requires a JOIN with the course_details table
            base_query = '''
                SELECT 
                    c.course_symbol, 
                    c.course_datetime, 
                    c.week, 
                    c.class, 
                    c.period, 
                    c.comment, 
                    c.event, 
                    c.data_origin, 
                    c.detail_origin,
                    c.hall,
                    c.day_of_week
                FROM courses c
                JOIN course_details cd ON c.course_symbol = cd.course_symbol AND c.class = cd.class
            '''
            
            teacher_clauses = []
            for teacher in teacher_values:
                teacher_clauses.append("cd.teacher_1 LIKE ?")
                params.append(f"%{teacher}%")
            
            if teacher_clauses:
                where_clauses.append(f"({' OR '.join(teacher_clauses)})")
        
        # Handle search query across multiple fields
        if search:
            search_clauses = [
                "c.course_symbol LIKE ?",
                "c.week LIKE ?",
                "c.class LIKE ?",
                "c.period LIKE ?",
                "c.comment LIKE ?",
                "c.hall LIKE ?",
                "c.day_of_week LIKE ?",
            ]
            where_clauses.append(f"({' OR '.join(search_clauses)})")
            search_param = f"%{search}%"
            params.extend([search_param] * len(search_clauses))
        
        # Execute paginated query
        logger.debug(f"Executing paginated query with params: {params}")
        courses, total_count = db_manager.execute_paginated_query(
            base_query, 
            where_clauses, 
            params, 
            sort_field, 
            sort_direction, 
            page, 
            per_page
        )
        logger.debug(f"Found {len(courses)} courses for page {page} of {total_count} total")
        
        # Get course details only for the courses we've retrieved
        if courses:
            # Extract course symbols and classes for joining with details
            course_symbols = [course[0] for course in courses if course[0]]
            course_classes = [course[3] for course in courses if course[3]]
            
            if course_symbols and course_classes:
                # Construct query to get only the needed details
                placeholders_symbols = ','.join(['?'] * len(course_symbols))
                placeholders_classes = ','.join(['?'] * len(course_classes))
                
                details_query = f'''
                    SELECT course_symbol, course_name, teacher_1, teacher_2, class 
                    FROM course_details 
                    WHERE course_symbol IN ({placeholders_symbols})
                    AND class IN ({placeholders_classes})
                '''
                
                details_params = course_symbols + course_classes
                details = db_manager.execute_query(details_query, details_params, fetch_all=True)
                logger.debug(f"Found {len(details)} matching course details")
            else:
                details = []
        else:
            details = []
        
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
                'hall': course[9] if len(course) > 9 and course[9] is not None else '',
                'day_of_week': course[10] if len(course) > 10 and course[10] is not None else ''
            }
            
            # Find matching details
            matched = False
            for detail in details:
                if detail[0] == course[0]:
                    # Check if the class matches
                    detail_class = detail[4] if detail[4] is not None else ''
                    course_class = course[3] if course[3] is not None else ''
                    
                    if detail_class == course_class:  # Only match if classes are the same
                        course_dict.update({
                            'course_name': detail[1],
                            'teacher_1': detail[2] if detail[2] is not None else '',
                            'teacher_2': detail[3] if detail[3] is not None else ''
                        })
                        matched = True
                        break
            
            # Add the course to the list if it has a name or if we're not filtering by name
            if matched and detail[1] and detail[1].strip():
                course_list.append(course_dict)
        
        # Add metadata for pagination
        response_data = {
            'courses': course_list,
            'pagination': {
                'total': total_count,
                'page': page,
                'per_page': per_page,
                'pages': (total_count + per_page - 1) // per_page
            }
        }
        
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Error in get_courses: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500 

# Get all filter options
@course_bp.route('/api/filter-options', methods=['GET'])
def get_filter_options():
    try:
        from app import cms  # Import here to avoid circular imports
        
        # Get the database manager
        db_manager = DatabaseManager(cms.db_name)
        
        # Dictionary to store all filter options
        filter_options = {}
        
        # Get standard filter fields
        standard_fields = {
            'week': 'SELECT DISTINCT week FROM courses WHERE week IS NOT NULL',
            'class': 'SELECT DISTINCT class FROM courses WHERE class IS NOT NULL',
            'period': 'SELECT DISTINCT period FROM courses WHERE period IS NOT NULL',
            'hall': 'SELECT DISTINCT hall FROM courses WHERE hall IS NOT NULL',
            'day_of_week': 'SELECT DISTINCT day_of_week FROM courses WHERE day_of_week IS NOT NULL',
            'teacher_1': 'SELECT DISTINCT teacher_1 FROM course_details WHERE teacher_1 IS NOT NULL',
            'teacher_2': 'SELECT DISTINCT teacher_2 FROM course_details WHERE teacher_2 IS NOT NULL',
        }
        
        # Get standard field values
        for field, query in standard_fields.items():
            results = db_manager.execute_query(query, fetch_all=True)
            filter_options[field] = sorted([item[0] for item in results if item[0]])
        
        # Special handling for teachers (combine teacher_1 and teacher_2)
        teachers = set(filter_options.get('teacher_1', []) + filter_options.get('teacher_2', []))
        filter_options['teacher'] = sorted(list(teachers))
        
        # DIRECT QUERIES FOR COURSE SYMBOLS
        # This is more reliable than the regex approach
        
        # Get numeric parts directly with SQL
        symbol_numeric_query = """
            SELECT DISTINCT SUBSTR(course_symbol, 1, 4) as numeric_part
            FROM courses
            WHERE course_symbol REGEXP '^\\d{4}[A-Za-z]*$'
            AND SUBSTR(course_symbol, 1, 4) != ''
        """
        
        try:
            # Try with REGEXP first
            numeric_results = db_manager.execute_query(symbol_numeric_query, fetch_all=True)
        except Exception as e:
            logger.warning(f"REGEXP not supported, using alternative approach: {e}")
            # Alternative approach without REGEXP
            symbol_numeric_query = """
                SELECT DISTINCT SUBSTR(course_symbol, 1, 4) as numeric_part
                FROM courses
                WHERE LENGTH(course_symbol) >= 4
                AND SUBSTR(course_symbol, 1, 1) BETWEEN '0' AND '9'
                AND SUBSTR(course_symbol, 2, 1) BETWEEN '0' AND '9'
                AND SUBSTR(course_symbol, 3, 1) BETWEEN '0' AND '9'
                AND SUBSTR(course_symbol, 4, 1) BETWEEN '0' AND '9'
            """
            numeric_results = db_manager.execute_query(symbol_numeric_query, fetch_all=True)
        
        numeric_symbols = [item[0] for item in numeric_results if item[0]]
        logger.debug(f"Found {len(numeric_symbols)} numeric symbols with direct SQL")
        
        # Get any other numeric-only course symbols
        numeric_only_query = """
            SELECT DISTINCT course_symbol 
            FROM courses 
            WHERE course_symbol GLOB '[0-9]*'
            AND course_symbol NOT GLOB '*[A-Za-z]*'
        """
        numeric_only_results = db_manager.execute_query(numeric_only_query, fetch_all=True)
        numeric_only_symbols = [item[0] for item in numeric_only_results if item[0]]
        
        # Combine both sets
        numeric_symbols.extend(numeric_only_symbols)
        numeric_symbols = list(set(numeric_symbols))  # Deduplicate
        
        # Get suffix parts directly with SQL
        symbol_suffix_query = """
            SELECT DISTINCT SUBSTR(course_symbol, 5) as suffix_part
            FROM courses
            WHERE LENGTH(course_symbol) > 4
            AND SUBSTR(course_symbol, 1, 4) GLOB '[0-9][0-9][0-9][0-9]'
            AND SUBSTR(course_symbol, 5) GLOB '[A-Za-z]*'
            AND SUBSTR(course_symbol, 5) != ''
        """
        suffix_results = db_manager.execute_query(symbol_suffix_query, fetch_all=True)
        suffix_symbols = [item[0] for item in suffix_results if item[0]]
        
        # Also get event field values
        event_query = "SELECT DISTINCT event FROM courses WHERE event IS NOT NULL AND event != ''"
        event_results = db_manager.execute_query(event_query, fetch_all=True)
        events = [item[0] for item in event_results if item[0]]
        
        # Combine suffix and event values
        all_suffixes = set(suffix_symbols + events)
        
        # Normalize suffix values - keep just the first letter for common types
        symbol_suffixes = set()
        for suffix in all_suffixes:
            if suffix.upper() in ['H', 'K']:
                symbol_suffixes.add(suffix.upper())
            else:
                symbol_suffixes.add(suffix)
        
        # Sort and store numeric symbols
        filter_options['symbol_numeric'] = sorted(numeric_symbols)
        logger.debug(f"Final numeric symbols: {len(filter_options['symbol_numeric'])} values")
        if filter_options['symbol_numeric']:
            logger.debug(f"Sample numeric symbols: {filter_options['symbol_numeric'][:10]}")
        
        # Add translations for known suffix types
        suffix_translations = []
        for suffix in sorted(list(symbol_suffixes)):
            if suffix.upper() == 'H':
                suffix_translations.append('H - Thực hành')
            elif suffix.upper() == 'K':
                suffix_translations.append('K - Kiểm tra')
            else:
                suffix_translations.append(suffix)
        
        filter_options['symbol_suffix'] = suffix_translations
        logger.debug(f"Final suffix values: {filter_options['symbol_suffix']}")
        
        return jsonify(filter_options)
    
    except Exception as e:
        logger.error(f"Error getting filter options: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500 

# Add a new API endpoint for insights that returns all data
@course_bp.route('/api/courses/insights', methods=['GET'])
def get_courses_for_insights():
    try:
        from app import cms  # Import here to avoid circular imports
        from flask import request
        
        # Get filter parameters - group by field
        filter_groups = {}
        for param in ['week', 'class', 'period', 'hall', 'day_of_week']:
            field_values = request.args.getlist(param)
            if field_values:
                filter_groups[param] = field_values
        
        # Get special filter parameters
        course_symbol_values = request.args.getlist('course_symbol')  # For symbol_numeric
        event_values = request.args.getlist('event')  # For symbol_suffix
        teacher_values = request.args.getlist('teacher_1')  # For teacher filter
        
        # Get search query parameter
        search = request.args.get('search')
        
        # Get date range parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Get the database manager
        db_manager = DatabaseManager(cms.db_name)
        
        # Base query to select courses
        base_query = '''
            SELECT 
                c.course_symbol, 
                c.course_datetime, 
                c.week, 
                c.class, 
                c.period, 
                c.comment, 
                c.event, 
                c.data_origin, 
                c.detail_origin,
                c.hall,
                c.day_of_week
            FROM courses c
        '''
        
        # Build where clauses and params
        where_clauses = []
        params = []
        
        # Handle date range filters
        if start_date:
            where_clauses.append("c.course_datetime >= ?")
            params.append(start_date)
        if end_date:
            where_clauses.append("c.course_datetime <= ?")
            params.append(end_date + " 23:59:59")  # Include the entire day
        
        # Handle standard filters - same field values use OR, different fields use AND
        for field, values in filter_groups.items():
            field_clauses = []
            for value in values:
                field_clauses.append(f"c.{field} LIKE ?")
                params.append(f"%{value}%")
            
            if field_clauses:
                where_clauses.append(f"({' OR '.join(field_clauses)})")
        
        # Handle special case: symbol_numeric filter (course_symbol)
        if course_symbol_values:
            symbol_clauses = []
            for course_symbol in course_symbol_values:
                symbol_clauses.append("c.course_symbol LIKE ?")
                params.append(f"{course_symbol}%")
            
            where_clauses.append(f"({' OR '.join(symbol_clauses)})")
        
        # Handle special case: symbol_suffix filter (event)
        if event_values:
            event_clauses = []
            
            for event in event_values:
                # For event filter, we need to match course symbols that end with the specific letter
                event_clauses.append("(c.course_symbol LIKE ? OR c.event = ?)")
                params.append(f"%{event}")  # Use % to match any prefix
                params.append(event)        # Also match the event field
            
            if event_clauses:
                where_clauses.append(f"({' OR '.join(event_clauses)})")
        
        # Handle special case: teacher filter
        if teacher_values:
            # Need to check only teacher_1 in course_details table
            # This requires a JOIN with the course_details table
            base_query = '''
                SELECT 
                    c.course_symbol, 
                    c.course_datetime, 
                    c.week, 
                    c.class, 
                    c.period, 
                    c.comment, 
                    c.event, 
                    c.data_origin, 
                    c.detail_origin,
                    c.hall,
                    c.day_of_week
                FROM courses c
                JOIN course_details cd ON c.course_symbol = cd.course_symbol AND c.class = cd.class
            '''
            
            teacher_clauses = []
            for teacher in teacher_values:
                teacher_clauses.append("cd.teacher_1 LIKE ?")
                params.append(f"%{teacher}%")
            
            if teacher_clauses:
                where_clauses.append(f"({' OR '.join(teacher_clauses)})")
        
        # Handle search query across multiple fields
        if search:
            search_clauses = [
                "c.course_symbol LIKE ?",
                "c.week LIKE ?",
                "c.class LIKE ?",
                "c.period LIKE ?",
                "c.comment LIKE ?",
                "c.hall LIKE ?",
                "c.day_of_week LIKE ?",
            ]
            where_clauses.append(f"({' OR '.join(search_clauses)})")
            search_param = f"%{search}%"
            params.extend([search_param] * len(search_clauses))
        
        # Construct the full query
        query = base_query
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
        
        # Execute query without pagination - but limit to 50,000 for safety
        query += " LIMIT 50000"
        
        logger.debug(f"Executing insights query: {query}")
        courses = db_manager.execute_query(query, params, fetch_all=True)
        logger.debug(f"Found {len(courses)} courses for insights")
        
        # Get course details for all courses
        if courses:
            # Extract all course symbols and classes
            course_symbols = list(set([course[0] for course in courses if course[0]]))
            course_classes = list(set([course[3] for course in courses if course[3]]))
            
            if course_symbols and course_classes:
                # Get course details with a separate query
                placeholders_symbols = ','.join(['?'] * len(course_symbols))
                placeholders_classes = ','.join(['?'] * len(course_classes))
                
                details_query = f'''
                    SELECT course_symbol, course_name, teacher_1, teacher_2, class 
                    FROM course_details 
                    WHERE course_symbol IN ({placeholders_symbols})
                    AND class IN ({placeholders_classes})
                '''
                
                details_params = course_symbols + course_classes
                details = db_manager.execute_query(details_query, details_params, fetch_all=True)
                logger.debug(f"Found {len(details)} matching course details for insights")
            else:
                details = []
        else:
            details = []
        
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
                'hall': course[9] if len(course) > 9 and course[9] is not None else '',
                'day_of_week': course[10] if len(course) > 10 and course[10] is not None else ''
            }
            
            # Find matching details
            matched = False
            for detail in details:
                if detail[0] == course[0]:
                    # Check if the class matches
                    detail_class = detail[4] if detail[4] is not None else ''
                    course_class = course[3] if course[3] is not None else ''
                    
                    if detail_class == course_class:  # Only match if classes are the same
                        course_dict.update({
                            'course_name': detail[1],
                            'teacher_1': detail[2] if detail[2] is not None else '',
                            'teacher_2': detail[3] if detail[3] is not None else ''
                        })
                        matched = True
                        break
            
            # Add the course to the list if it has a name
            if matched and detail[1] and detail[1].strip():
                course_list.append(course_dict)
        
        # Return data without pagination info
        return jsonify({'courses': course_list})
    except Exception as e:
        logger.error(f"Error in get_courses_for_insights: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500 