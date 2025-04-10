/**
 * Filter utilities for the course management system
 */

const FilterUtils = {
  /**
   * Extract only numeric part (digits at the beginning) of a symbol
   * @param {string} fullSymbol - The full course symbol
   * @returns {string} - The numeric part of the symbol
   */
  getNumericSymbol: function (fullSymbol) {
    if (!fullSymbol) return '';
    const match = fullSymbol.match(/^\d+/);
    return match ? match[0] : '';
  },

  /**
   * Extract non-numeric suffix by removing all digits from the beginning
   * @param {string} fullSymbol - The full course symbol
   * @returns {string} - The suffix part of the symbol
   */
  getSymbolSuffix: function (fullSymbol) {
    if (!fullSymbol) return '';
    const match = fullSymbol.match(/^[0-9]+([^0-9].*)$/);
    return match && match[1] ? match[1] : '';
  },

  /**
   * Get the original event code from a translated event string
   * @param {string} translatedEvent - The translated event string (e.g., "H - Thực hành")
   * @returns {string} - The original event code (e.g., "H")
   */
  getEventCode: function (translatedEvent) {
    if (!translatedEvent) return '';
    // Extract the code part before the hyphen
    const match = translatedEvent.match(/^([A-Za-z]+)(?:\s*-.*)?$/);
    return match ? match[1] : translatedEvent;
  },

  /**
   * Apply filters to a dataset
   * @param {Array} data - The data to filter
   * @param {Array} filters - The filters to apply
   * @returns {Array} - The filtered data
   */
  applyFilters: function (data, filters) {
    return data.filter((item) => {
      return filters.every((filter) => {
        if (filter.field === 'teacher') {
          // Special handling for teachers
          return item.teacher_1 === filter.value || item.teacher_2 === filter.value;
        } else if (filter.field === 'symbol_suffix') {
          // Get the original event code from the translated value
          const eventCode = this.getEventCode(filter.value);
          const itemSuffix = this.getSymbolSuffix(item.course_symbol);
          return itemSuffix === eventCode;
        } else {
          const fieldName = filter.field === 'course_symbol' ? 'course_symbol' : filter.field;
          return item[fieldName] === filter.value;
        }
      });
    });
  },
};

// Make the utilities available globally
window.FilterUtils = FilterUtils;
