/**
 * Search utilities for the course management system
 */

const SearchUtils = {
  /**
   * Search through courses based on a query
   * @param {Array} courses - The courses to search through
   * @param {string} query - The search query
   * @returns {Array} - The filtered courses
   */
  searchCourses: function (courses, query) {
    if (!query || query.length < 1) {
      return [...courses];
    }

    const lowercaseQuery = query.toLowerCase();

    return courses.filter((course) => {
      // Search through fields, but only match from the beginning
      return (
        (course.course_symbol && course.course_symbol.toLowerCase().startsWith(lowercaseQuery)) ||
        (course.week && course.week.toLowerCase().startsWith(lowercaseQuery)) ||
        (course.class && course.class.toLowerCase().startsWith(lowercaseQuery)) ||
        (course.period && course.period.toLowerCase().startsWith(lowercaseQuery)) ||
        (course.teacher_1 && course.teacher_1.toLowerCase().startsWith(lowercaseQuery)) ||
        (course.teacher_2 && course.teacher_2.toLowerCase().startsWith(lowercaseQuery)) ||
        (course.hall && course.hall.toLowerCase().startsWith(lowercaseQuery)) ||
        (course.date && course.date.toLowerCase().startsWith(lowercaseQuery)) ||
        (course.comment && course.comment.toLowerCase().startsWith(lowercaseQuery))
      );
    });
  },

  /**
   * Get unique filter options for a specific field
   * @param {Array} courses - The courses to extract options from
   * @param {string} field - The field to get options for
   * @param {string} searchQuery - Optional search query to filter options
   * @returns {Array} - The unique filter options
   */
  getFilterOptions: function (courses, field, searchQuery = '') {
    let allValues = [];

    if (field === 'symbol_numeric') {
      // Get all unique numeric parts of course symbols
      allValues = [
        ...new Set(courses.map((course) => FilterUtils.getNumericSymbol(course.course_symbol)).filter(Boolean)),
      ];
    } else if (field === 'symbol_suffix') {
      // Get all unique suffix parts of course symbols
      allValues = [
        ...new Set(courses.map((course) => FilterUtils.getSymbolSuffix(course.course_symbol)).filter(Boolean)),
      ];
    } else if (field === 'teacher') {
      // Special handling for teachers - combine teacher_1 and teacher_2 fields
      const teacherValues = new Set();
      courses.forEach((course) => {
        if (course.teacher_1) teacherValues.add(course.teacher_1);
        if (course.teacher_2) teacherValues.add(course.teacher_2);
      });
      allValues = [...teacherValues].filter(Boolean);
    } else {
      // Standard field handling
      allValues = [...new Set(courses.map((course) => course[field]))].filter(Boolean);
    }

    // Sort the values
    const sortedValues = allValues.sort();

    // If there's a search query, filter the options
    if (searchQuery && searchQuery.length > 0) {
      const query = searchQuery.toLowerCase();
      return sortedValues.filter((value) => value.toLowerCase().includes(query));
    }

    return sortedValues;
  },
};

// Make the utilities available globally
window.SearchUtils = SearchUtils;
