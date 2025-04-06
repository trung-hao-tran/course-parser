document.addEventListener('alpine:init', () => {
  Alpine.data('courseApp', () => ({
    courses: [],
    filteredCourses: [],
    searchQuery: '',
    searchResults: [],
    showSearchResults: false,
    showImportModal: false,
    sortField: null,
    sortDirection: 'asc',
    activeFilters: [],
    selectedFilters: [],
    symbolSearch: '',
    weekSearch: '',
    classSearch: '',
    periodSearch: '',
    teacherSearch: '',
    eventSearch: '',
    hallSearch: '',
    minDate: '',
    maxDate: '',
    // Date range filters
    startDate: '',
    endDate: '',
    dateRangeDisplay: '',
    dateRangePicker: null,
    // Import related properties
    selectedCourseFiles: [],
    selectedLectureHallFiles: [],
    importStatus: null, // null, 'processing', 'success', 'error'
    importStatusMessage: '',
    showInsightsModal: false,
    teacherStats: {
      totalTeachers: 0,
      totalSubjects: 0,
      totalPeriods: 0,
      teachers: [],
    },

    init() {
      this.fetchCourses().then(() => {
        // Initial filtering
        this.filterCourses();
        console.log('Initial filtering complete');

        // Initialize date picker after data is loaded
        this.initDateRangePicker();
      });
    },

    initDateRangePicker() {
      // Convert min/max dates to Date objects for the picker
      const minDateObj = this.minDate ? new Date(this.minDate) : null;
      const maxDateObj = this.maxDate ? new Date(this.maxDate) : null;

      // Set start and end dates (either from existing selection or min/max if after import)
      const startDateObj = this.startDate ? new Date(this.startDate) : null;
      const endDateObj = this.endDate ? new Date(this.endDate) : null;

      console.log(
        `Initializing date picker with min: ${minDateObj ? minDateObj.toDateString() : 'none'}, max: ${
          maxDateObj ? maxDateObj.toDateString() : 'none'
        }`,
      );

      if (startDateObj && endDateObj) {
        console.log(`Setting initial selection: ${startDateObj.toDateString()} to ${endDateObj.toDateString()}`);
      }

      // Initialize the date range picker
      this.dateRangePicker = new Litepicker({
        element: this.$refs.dateRangePicker,
        startDate: startDateObj,
        endDate: endDateObj,
        minDate: minDateObj,
        maxDate: maxDateObj,
        singleMode: false,
        numberOfMonths: 2,
        numberOfColumns: 2,
        showWeekNumbers: false,
        format: 'DD/MM/YYYY',
        autoApply: false, // Show apply button
        showTooltip: true,
        allowRepick: true,
        inlineMode: false,
        mobileFriendly: true,
        resetButton: true, // Add reset button
        buttonText: {
          apply: 'Apply',
          cancel: 'Cancel',
          reset: 'Reset',
        },
        setup: (picker) => {
          picker.on('selected', (startDate, endDate) => {
            // Update the display
            this.dateRangeDisplay = startDate.format('DD/MM/YYYY') + ' - ' + endDate.format('DD/MM/YYYY');

            // Store the dates in YYYY-MM-DD format for internal use
            this.startDate = DateUtils.formatDateForInput(startDate.dateInstance);
            this.endDate = DateUtils.formatDateForInput(endDate.dateInstance);

            console.log(`Date range selected: ${this.startDate} to ${this.endDate}`);
          });

          picker.on('button:apply', () => {
            // Apply the date filter when the user clicks the apply button in the picker
            console.log(`Applying date range filter: ${this.startDate} to ${this.endDate}`);
            this.filterCourses();
          });

          picker.on('button:reset', () => {
            // Reset date filters when the user clicks the reset button in the picker
            this.startDate = '';
            this.endDate = '';
            this.dateRangeDisplay = '';
            this.filterCourses();
          });

          // Ensure the reset button is properly styled after the picker is rendered
          picker.on('render', () => {
            // Make sure the reset button is in the correct position (first in the footer)
            const footer = document.querySelector('.litepicker .container__footer');
            const resetBtn = document.querySelector('.litepicker .container__footer .button-reset');

            if (footer && resetBtn) {
              // Move reset button to be the first button
              footer.insertBefore(resetBtn, footer.firstChild);
            }
          });

          // Log when the picker is shown
          picker.on('show', () => {
            console.log(
              'Date picker shown with current selection:',
              picker.getStartDate() ? picker.getStartDate().format('YYYY-MM-DD') : 'none',
              'to',
              picker.getEndDate() ? picker.getEndDate().format('YYYY-MM-DD') : 'none',
            );
          });
        },
      });
    },

    openDatePicker() {
      if (this.dateRangePicker) {
        this.dateRangePicker.show();
      }
    },

    // Apply date range filter when the confirm button is clicked
    applyDateRangeFilter() {
      console.log(`Applying date range filter: ${this.startDate} to ${this.endDate}`);
      this.filterCourses();
    },

    async fetchCourses() {
      try {
        const response = await fetch('/api/courses');
        const data = await response.json();
        console.log('Raw API Response:', data);

        if (data.error) {
          throw new Error(data.error);
        }

        this.courses = data.courses || [];

        // Log raw course data for testing
        console.log('Courses loaded:', this.courses.length);
        console.log('Sample course data (first 3 courses):', this.courses.slice(0, 3));

        // Log lecture hall information
        const coursesWithHalls = this.courses.filter((course) => course.hall);
        console.log('Courses with lecture halls:', coursesWithHalls.length);
        if (coursesWithHalls.length > 0) {
          console.log('Sample course with lecture hall:', coursesWithHalls[0]);
        }

        // Set min and max dates based on course data
        this.setDateBoundaries();

        this.filteredCourses = [...this.courses];
        return Promise.resolve();
      } catch (error) {
        console.error('Error fetching courses:', error);
        alert('Error fetching courses: ' + error.message);
        return Promise.reject(error);
      }
    },

    // Function to set min and max dates based on course data
    setDateBoundaries() {
      if (this.courses.length === 0) {
        console.log('No courses available to set date boundaries');
        return;
      }

      // Convert all valid dates to Date objects
      const validDates = this.courses
        .filter((course) => course.date)
        .map((course) => {
          const parsedDate = DateUtils.parseDate(course.date);
          if (parsedDate) {
            // Reset time to midnight to ensure proper comparison
            parsedDate.setHours(0, 0, 0, 0);
          }
          return parsedDate;
        })
        .filter((date) => date !== null); // Filter out null dates

      if (validDates.length === 0) {
        console.log('No valid dates found in courses');
        return;
      }

      // Find min and max dates by comparing timestamps
      const timestamps = validDates.map((date) => date.getTime());
      const minTimestamp = Math.min(...timestamps);
      const maxTimestamp = Math.max(...timestamps);

      const minDate = new Date(minTimestamp);
      const maxDate = new Date(maxTimestamp);

      // Log the actual date objects for debugging
      console.log('Actual min date object:', minDate);
      console.log('Actual max date object:', maxDate);

      // Format dates for input elements (YYYY-MM-DD)
      this.minDate = DateUtils.formatDateForInput(minDate);
      this.maxDate = DateUtils.formatDateForInput(maxDate);

      console.log(
        `Date boundaries set: ${this.minDate} (${DateUtils.formatDate(minDate)}) to ${
          this.maxDate
        } (${DateUtils.formatDate(maxDate)})`,
      );
      console.log(`Found ${validDates.length} valid dates out of ${this.courses.length} courses`);

      // Log the first and last few dates for verification
      if (validDates.length > 0) {
        // Sort dates for better debugging
        const sortedDates = [...validDates].sort((a, b) => a.getTime() - b.getTime());
        console.log(
          'First 3 dates in data:',
          sortedDates.slice(0, 3).map((d) => DateUtils.formatDate(d)),
        );
        console.log(
          'Last 3 dates in data:',
          sortedDates.slice(-3).map((d) => DateUtils.formatDate(d)),
        );
      }
    },

    searchTable() {
      if (!this.searchQuery || this.searchQuery.length < 1) {
        this.filteredCourses = [...this.courses];
        this.filterCourses();
        return;
      }

      const query = this.searchQuery.toLowerCase();

      this.filteredCourses = this.courses.filter((course) => {
        // Search through fields, but only match from the beginning
        return (
          (course.course_symbol && course.course_symbol.toLowerCase().startsWith(query)) ||
          (course.week && course.week.toLowerCase().startsWith(query)) ||
          (course.class && course.class.toLowerCase().startsWith(query)) ||
          (course.period && course.period.toLowerCase().startsWith(query)) ||
          (course.teacher_1 && course.teacher_1.toLowerCase().startsWith(query)) ||
          (course.teacher_2 && course.teacher_2.toLowerCase().startsWith(query)) ||
          (course.hall && course.hall.toLowerCase().startsWith(query)) ||
          (course.date && course.date.toLowerCase().startsWith(query)) ||
          (course.comment && course.comment.toLowerCase().startsWith(query))
        );
      });

      // Apply date filters to search results
      this.applyDateFilters();
    },

    clearFilters() {
      this.startDate = '';
      this.endDate = '';
      this.dateRangeDisplay = '';
      this.searchQuery = '';
      this.filteredCourses = [...this.courses];

      // Reset date picker
      if (this.dateRangePicker) {
        this.dateRangePicker.clearSelection();
      }
    },

    filterCourses() {
      // Start with all courses
      this.filteredCourses = [...this.courses];

      // Apply active filters
      if (this.activeFilters.length > 0) {
        // Group filters by field
        const filtersByField = {};
        this.activeFilters.forEach((filter) => {
          if (!filtersByField[filter.field]) {
            filtersByField[filter.field] = [];
          }
          filtersByField[filter.field].push(filter.value);
        });

        // Apply filters by field
        Object.entries(filtersByField).forEach(([field, values]) => {
          if (values.length === 0) return; // Skip if no values selected

          if (field === 'symbol_numeric') {
            // Filter by numeric part of symbol
            this.filteredCourses = this.filteredCourses.filter((course) => {
              const numericPart = FilterUtils.getNumericSymbol(course.course_symbol);
              return values.includes(numericPart);
            });
          } else if (field === 'symbol_suffix') {
            // Filter by suffix part of symbol
            this.filteredCourses = this.filteredCourses.filter((course) => {
              const suffixPart = FilterUtils.getSymbolSuffix(course.course_symbol);
              return values.includes(suffixPart);
            });
          } else if (field === 'teacher') {
            // Special handling for teachers
            this.filteredCourses = this.filteredCourses.filter((course) => {
              return values.some((value) => course.teacher_1 === value || course.teacher_2 === value);
            });
          } else {
            // Standard field filtering
            this.filteredCourses = this.filteredCourses.filter((course) => values.includes(course[field]));
          }
        });
      }

      // Apply search query if active
      if (this.searchQuery && this.searchQuery.length >= 1) {
        this.filteredCourses = SearchUtils.searchCourses(this.filteredCourses, this.searchQuery);
      }

      // Apply date filters last
      this.applyDateFilters();
    },

    applyDateFilters() {
      // Apply date range filter
      if (this.startDate || this.endDate) {
        console.log(`Applying date filters: ${this.startDate} to ${this.endDate}`);

        this.filteredCourses = this.filteredCourses.filter((course) => {
          if (!course.date) {
            return false;
          }

          // Parse the course date (DD/MM/YYYY format)
          const courseDate = DateUtils.parseDate(course.date);
          if (!courseDate) {
            console.warn(`Invalid date format: ${course.date} for course ${course.course_symbol}`);
            return false;
          }

          try {
            if (this.startDate && this.endDate) {
              // Create date objects with time set to midnight for consistent comparison
              const start = new Date(this.startDate);
              start.setHours(0, 0, 0, 0);

              const end = new Date(this.endDate);
              // Set end date to end of day for inclusive filtering
              end.setHours(23, 59, 59, 999);

              // Inclusive comparison (>= and <=)
              return courseDate >= start && courseDate <= end;
            } else if (this.startDate) {
              const start = new Date(this.startDate);
              start.setHours(0, 0, 0, 0);
              return courseDate >= start;
            } else if (this.endDate) {
              const end = new Date(this.endDate);
              // Set end date to end of day for inclusive filtering
              end.setHours(23, 59, 59, 999);
              return courseDate <= end;
            }
          } catch (e) {
            console.error('Error in date filtering:', e);
            return true; // Include the course if there's an error in filtering
          }

          return true;
        });

        console.log(`After date filtering: ${this.filteredCourses.length} courses`);
      }
    },

    sortCourses(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDirection = 'asc';
      }

      this.filteredCourses.sort((a, b) => {
        const aValue = a[field] || '';
        const bValue = b[field] || '';

        const comparison = aValue.toString().localeCompare(bValue.toString(), undefined, { numeric: true });

        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
    },

    handleCourseFilesSelection(event) {
      const files = event.target.files;
      if (files && files.length > 0) {
        // Convert FileList to Array and add to selectedCourseFiles
        for (let i = 0; i < files.length; i++) {
          this.selectedCourseFiles.push(files[i]);
        }
      }
    },

    handleLectureHallFilesSelection(event) {
      const files = event.target.files;
      if (files && files.length > 0) {
        // Convert FileList to Array and add to selectedLectureHallFiles
        for (let i = 0; i < files.length; i++) {
          this.selectedLectureHallFiles.push(files[i]);
        }
      }
    },

    removeCourseFile(index) {
      this.selectedCourseFiles.splice(index, 1);
    },

    removeLectureHallFile(index) {
      this.selectedLectureHallFiles.splice(index, 1);
    },

    startImport() {
      if (this.selectedCourseFiles.length === 0 && this.selectedLectureHallFiles.length === 0) {
        this.importStatus = 'error';
        this.importStatusMessage = 'Please select at least one file to import.';
        return;
      }

      this.importStatus = 'processing';
      this.importStatusMessage = 'Importing files, please wait...';

      // Use the ImportExportUtils module to handle the file upload
      ImportExportUtils.importFiles(this.selectedCourseFiles, this.selectedLectureHallFiles)
        .then((data) => {
          this.importStatus = 'success';
          this.importStatusMessage = data.message || 'Import successful!';

          // Clear selected files
          this.selectedCourseFiles = [];
          this.selectedLectureHallFiles = [];

          // Automatically close the modal after a short delay
          setTimeout(() => {
            this.showImportModal = false;
            this.importStatus = null;
            this.importStatusMessage = '';
          }, 1500);

          // Fetch courses and set date boundaries
          return this.fetchCourses();
        })
        .then(() => {
          // Destroy the old date picker
          if (this.dateRangePicker) {
            this.dateRangePicker.destroy();
          }

          // Set date range to the full range (min to max)
          if (this.minDate && this.maxDate) {
            this.startDate = this.minDate;
            this.endDate = this.maxDate;

            // Format dates for display
            const minDateObj = new Date(this.minDate);
            const maxDateObj = new Date(this.maxDate);
            this.dateRangeDisplay = `${DateUtils.formatDate(minDateObj)} - ${DateUtils.formatDate(maxDateObj)}`;

            console.log(`Date range set to full range: ${this.dateRangeDisplay}`);
          }

          // Initialize a new date picker with the updated min/max dates
          this.initDateRangePicker();

          // Apply filters to update the table with the full date range
          this.filterCourses();
        })
        .catch((error) => {
          console.error('Error importing files:', error);
          this.importStatus = 'error';
          this.importStatusMessage = error.message || 'Error importing files. Please try again.';
        });
    },

    handleFileUpload(event) {
      // This method is kept for backward compatibility
      // It will be redirected to the new course files selection method
      this.handleCourseFilesSelection(event);
      // And then immediately start the import
      this.startImport();
    },

    exportData() {
      // Use the ImportExportUtils module to handle the export
      ImportExportUtils.exportData().catch((error) => {
        console.error('Error exporting data:', error);
        alert('Error exporting data: ' + error.message);
      });
    },

    getFilterOptions(field, searchQuery = '') {
      // Use the SearchUtils module to get filter options
      return SearchUtils.getFilterOptions(this.courses, field, searchQuery);
    },

    // Method to select filters without applying them immediately
    selectFilter(field, value) {
      // Check if this filter is already selected
      const filterIndex = this.selectedFilters.findIndex(
        filter => filter.field === field && filter.value === value
      );
      
      if (filterIndex === -1) {
        // Add the filter
        this.selectedFilters.push({ field, value });
      } else {
        // Remove the filter
        this.selectedFilters.splice(filterIndex, 1);
      }
      
      // No need to call applyFilters here, as we're just tracking selections
      // User still needs to click "Apply Filters" to apply them
    },

    // Check if a filter is selected but not yet applied
    isFilterSelected(field, value) {
      return this.selectedFilters.some(filter => filter.field === field && filter.value === value);
    },

    // Apply all selected filters
    applyFilters() {
      // First, update the activeFilters based on selectedFilters
      this.activeFilters = [...this.selectedFilters];
      
      // Then apply the filtering logic as before
      this.filterCourses();
    },

    // Check if a filter is active (already applied)
    isFilterActive(field, value) {
      return this.activeFilters.some((f) => f.field === field && f.value === value);
    },

    removeFilter(field, value) {
      // Remove from selectedFilters
      const filterIndex = this.selectedFilters.findIndex(
        filter => filter.field === field && filter.value === value
      );
      
      if (filterIndex !== -1) {
        this.selectedFilters.splice(filterIndex, 1);
      }
      
      // Also uncheck the corresponding checkbox
      const checkboxId = `${field}-${value}`;
      const checkbox = document.getElementById(checkboxId);
      if (checkbox) {
        checkbox.checked = false;
      }
      
      // No need to call applyFilters here, as we're just tracking selections
      // User still needs to click "Apply Filters" to apply them
    },

    resetDateFilters() {
      // Reset date filters to the full available range
      this.startDate = '';
      this.endDate = '';
      this.dateRangeDisplay = '';

      // Reset date picker
      if (this.dateRangePicker) {
        this.dateRangePicker.clearSelection();
      }

      this.filterCourses();
    },

    clearAllFilters() {
      // Clear selected filters array
      this.selectedFilters = [];
      
      // Also update active filters and reset UI
      this.activeFilters = [];
      
      // Uncheck all checkboxes
      document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
      });
      
      this.resetDateFilters();
      this.filterCourses();
    },

    // Use the helper functions from the modules
    getNumericSymbol: FilterUtils.getNumericSymbol,
    getSymbolSuffix: FilterUtils.getSymbolSuffix,

    calculateTeacherStats() {
      // Initialize stats object for each teacher
      const teacherMap = new Map();

      this.filteredCourses.forEach((course) => {
        // Process teacher 1
        if (course.teacher_1) {
          this.processTeacherData(teacherMap, course.teacher_1, course);
        }

        // Process teacher 2
        if (course.teacher_2) {
          this.processTeacherData(teacherMap, course.teacher_2, course);
        }
      });

      // Convert map to array and sort by name
      const sortedTeachers = Array.from(teacherMap.values())
        .map((teacher) => ({
          ...teacher,
          subjectsCount: teacher.subjects.size,
          subjects: Array.from(teacher.subjects).sort(),
          classes: Array.from(teacher.classes).sort(),
          periodsCount: teacher.periods,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Calculate totals
      this.teacherStats = {
        totalTeachers: sortedTeachers.length,
        totalSubjects: new Set(sortedTeachers.flatMap((t) => t.subjects)).size,
        totalPeriods: sortedTeachers.reduce((sum, t) => sum + t.periodsCount, 0),
        teachers: sortedTeachers,
      };
    },

    processTeacherData(teacherMap, teacherName, course) {
      if (!teacherMap.has(teacherName)) {
        teacherMap.set(teacherName, {
          name: teacherName,
          subjects: new Set(),
          periods: 0,
          // Add a Set to track unique date-period combinations
          datePeriodCombinations: new Set(),
          // Add a Set to track classes taught
          classes: new Set()
        });
      }

      const teacherData = teacherMap.get(teacherName);
      
      // Extract the base numeric symbol without the event suffix
      const baseSymbol = FilterUtils.getNumericSymbol(course.course_symbol);
      
      // Add only the base symbol to the subjects Set
      teacherData.subjects.add(baseSymbol);
      
      // Add class to the classes Set if it exists
      if (course.class) {
        teacherData.classes.add(course.class);
      }
      
      // Create a unique key for date-period combination
      const datePeriodKey = `${course.date}-${course.period}`;
      
      // Only count this period if we haven't seen this date-period combination before
      if (!teacherData.datePeriodCombinations.has(datePeriodKey)) {
        // Add this combination to the Set
        teacherData.datePeriodCombinations.add(datePeriodKey);
        
        // Count periods based on the period value
        // If period is "9", count as 1, otherwise count as 2
        const periodCount = course.period === '9' ? 1 : 2;
        teacherData.periods += periodCount;
      }
    },

    resetDatabase() {
      if (confirm('Are you sure you want to reset the database? This will delete all data and cannot be undone.')) {
        fetch('/api/reset-database', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
          .then((response) => {
            // Check if the response is JSON before trying to parse it
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              return response.json();
            } else {
              // If not JSON, throw an error with the text content
              return response.text().then((text) => {
                throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
              });
            }
          })
          .then((data) => {
            if (data.success) {
              alert('Database reset successfully.');
              // Clear local data
              this.courses = [];
              this.filteredCourses = [];
              this.activeFilters = [];
              this.selectedFilters = [];
              this.resetDateFilters();
            } else {
              alert('Error resetting database: ' + (data.error || 'Unknown error'));
            }
          })
          .catch((error) => {
            console.error('Error resetting database:', error);
            alert('Error resetting database: ' + error.message);
          });
      }
    },
  }));
});
