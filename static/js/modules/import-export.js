/**
 * Import/Export utilities for the course management system
 */

const ImportExportUtils = {
  /**
   * Handle file upload for importing data
   * @param {Array} courseFiles - Array of course files to upload
   * @param {Array} lectureHallFiles - Array of lecture hall files to upload
   * @returns {Promise} - Promise that resolves when import is complete
   */
  importFiles: function (courseFiles, lectureHallFiles) {
    if (courseFiles.length === 0 && lectureHallFiles.length === 0) {
      return Promise.reject(new Error('No files provided'));
    }

    const formData = new FormData();

    // Add course files to form data
    courseFiles.forEach((file, index) => {
      formData.append(`course_files[${index}]`, file);
    });

    // Add lecture hall files to form data
    lectureHallFiles.forEach((file, index) => {
      formData.append(`lecture_hall_files[${index}]`, file);
    });

    return fetch('/api/import', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error);
        }
        return data;
      });
  },

  /**
   * Export data to a CSV file
   * @returns {Promise} - Promise that resolves when export is complete
   */
  exportData: function () {
    return fetch('/api/export', {
      method: 'GET',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Export failed');
        }
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'courses_export.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        return { success: true };
      });
  },
};

// Make the utilities available globally
window.ImportExportUtils = ImportExportUtils;
