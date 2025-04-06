/**
 * Date utilities for the course management system
 */

const DateUtils = {
  /**
   * Parse date from DD/MM/YYYY format to a Date object
   * @param {string} dateStr - Date string in DD/MM/YYYY format
   * @returns {Date|null} - Date object or null if invalid
   */
  parseDate: function (dateStr) {
    if (!dateStr) return null;

    try {
      // Split the date string into parts
      const parts = dateStr.split('/');
      if (parts.length !== 3) {
        console.warn(`Invalid date format (wrong parts): ${dateStr}`);
        return null;
      }

      // Create a date in YYYY-MM-DD format (which JS can parse correctly)
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);

      // Validate date parts
      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        console.warn(`Invalid date parts: day=${day}, month=${month}, year=${year} from ${dateStr}`);
        return null;
      }
      if (day < 1 || day > 31 || month < 1 || month > 12) {
        console.warn(`Date out of range: day=${day}, month=${month}, year=${year} from ${dateStr}`);
        return null;
      }

      // Create a new Date object (month is 0-indexed in JS Date)
      // Set time to midnight to ensure consistent comparison
      const date = new Date(year, month - 1, day, 0, 0, 0, 0);

      // Verify the date is valid
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date created: ${date} from ${dateStr}`);
        return null;
      }

      return date;
    } catch (e) {
      console.error('Error parsing date:', e, dateStr);
      return null;
    }
  },

  /**
   * Format date to DD/MM/YYYY for display
   * @param {Date} date - Date object
   * @returns {string} - Formatted date string
   */
  formatDate: function (date) {
    if (!date) return '';

    try {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    } catch (e) {
      console.error('Error formatting date:', e, date);
      return '';
    }
  },

  /**
   * Format a Date object to YYYY-MM-DD for input elements
   * @param {Date} date - Date object
   * @returns {string} - Formatted date string
   */
  formatDateForInput: function (date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
};

// Make the utilities available globally
window.DateUtils = DateUtils;
