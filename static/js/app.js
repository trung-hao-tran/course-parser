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
    dayOfWeekSearch: '',
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
    weeklyTableData: {
      weekNumber: "",
      days: {},
    },
    showWeeklyView: false,
    weeklyViewFilters: {
      courses: [],
      teachers: [],
      halls: []
    },
    weeklyViewSelectedFilters: {
      courses: [],
      teachers: [],
      halls: []
    },
    currentPage: 1,
    perPage: 100,
    totalCourses: 0,
    totalPages: 1,
    isLoading: false,
    // Add filterOptions cache
    filterOptions: {},
    filterOptionsLoaded: false,
    loggedFilterOptions: {},

    init() {
      // Fetch courses and filter options in parallel
      Promise.all([
        this.fetchCourses(),
        this.fetchFilterOptions()
      ]).then(() => {
        // Initial filtering
        console.log('Initial data loading complete');
        
        // Initialize date picker after data is loaded
        this.initDateRangePicker();
      }).catch(error => {
        console.error('Error during initialization:', error);
      });
    },

    initDateRangePicker() {
      // Convert min/max dates to Date objects for the picker
      const minDateObj = this.minDate ? new Date(this.minDate) : null;
      const maxDateObj = this.maxDate ? new Date(this.maxDate) : null;

      // Set start and end dates (either from existing selection or null)
      const startDateObj = this.startDate ? new Date(this.startDate) : null;
      const endDateObj = this.endDate ? new Date(this.endDate) : null;

      console.log(
        `Initializing date picker with min: ${minDateObj ? minDateObj.toDateString() : 'none'}, max: ${
          maxDateObj ? maxDateObj.toDateString() : 'none'
        }`,
        `Current selection: ${startDateObj ? startDateObj.toDateString() : 'none'} to ${
          endDateObj ? endDateObj.toDateString() : 'none'
        }`
      );

      // Initialize the date range picker with min/max restrictions but still allow browsing all months
      this.dateRangePicker = new Litepicker({
        element: this.$refs.dateRangePicker,
        startDate: startDateObj,
        endDate: endDateObj,
        minDate: minDateObj,  // Restrict minimum selectable date
        maxDate: maxDateObj,  // Restrict maximum selectable date
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
        dropdowns: {
          minYear: minDateObj ? minDateObj.getFullYear() - 5 : 2020,  // Allow browsing 5 years before min date
          maxYear: maxDateObj ? maxDateObj.getFullYear() + 5 : 2030,  // Allow browsing 5 years after max date
          months: true,
          years: true
        },
        lang: 'vi-VN',  // Set language to Vietnamese
        langMoment: 'vi-VN',
        buttonText: {
          apply: 'Chọn',
          cancel: 'Đóng',
          reset: 'Đặt lại',
        },
        tooltipText: {
          one: 'ngày',
          other: 'ngày'
        },
        // Define Vietnamese language configuration
        locale: {
          firstDay: 1, // Monday as first day of week
          format: 'DD/MM/YYYY',
          delimiter: ' - ',
          tooltipPrevMonth: 'Tháng trước',
          tooltipNextMonth: 'Tháng sau',
          tooltipAriaNewSelection: 'Lựa chọn mới',
          tooltipAriaSelected: 'Đã chọn',
          tooltipAriaCalendar: 'Lịch',
          tooltipAriaJump: 'Chuyển đến',
          rangeDelimiter: ' đến ',
          cancelLabel: 'Đóng',
          resetLabel: 'Đặt lại',
          applyLabel: 'Chọn',
          minDays: 1,
          maxDays: 0,
          // Vietnamese month names
          months: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
          // Vietnamese weekday names
          weekdaysShort: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
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
        // Show loading state
        this.isLoading = true;
        
        // Build query parameters
        const params = new URLSearchParams();
        
        // Add pagination
        params.append('page', this.currentPage || 1);
        params.append('per_page', this.perPage || 100);
        
        // Add active filters to query
        if (this.activeFilters.length > 0) {
          // Group filters by field
          const filtersByField = {};
          this.activeFilters.forEach((filter) => {
            if (!filtersByField[filter.field]) {
              filtersByField[filter.field] = [];
            }
            filtersByField[filter.field].push(filter.value);
          });
          
          // Add filters to query params
          Object.entries(filtersByField).forEach(([field, values]) => {
            // Handle special filter types
            if (field === 'symbol_numeric') {
              // Add all course symbol values
              values.forEach(value => {
                params.append('course_symbol', value);
              });
            } else if (field === 'symbol_suffix') {
              // For suffix (event) filter, send all values without translation text
              values.forEach(eventValue => {
                // Extract the prefix letter from the translated value
                // e.g., "H - Thực hành" -> "H", "K - Kiểm tra" -> "K"
                const translationMatch = eventValue.match(/^([A-Za-z]+)\s+-\s+/);
                const cleanValue = translationMatch ? translationMatch[1] : eventValue;
                // Ensure we're sending just the suffix letter
                console.log(`Filtering by event suffix: "${cleanValue}"`);
                params.append('event', cleanValue);
              });
            } else if (field === 'teacher') {
              // Teacher can match either teacher_1 or teacher_2
              values.forEach(value => {
                params.append('teacher_1', value);
              });
            } else {
              // Standard fields - append all values
              values.forEach(value => {
                params.append(field, value);
              });
            }
          });
        }
        
        // Add date range filters
        if (this.startDate) {
          params.append('start_date', this.startDate);
        }
        if (this.endDate) {
          params.append('end_date', this.endDate);
        }
        
        // Add sorting
        if (this.sortField) {
          params.append('sort_field', this.sortField);
          params.append('sort_direction', this.sortDirection);
        }
        
        // Add search query if active
        if (this.searchQuery && this.searchQuery.length >= 1) {
          params.append('search', this.searchQuery);
        }
        
        const queryString = params.toString();
        console.log('Fetching with params:', queryString);
        
        const response = await fetch(`/api/courses?${queryString}`);
        const data = await response.json();
        console.log('API Response:', data);

        if (data.error) {
          throw new Error(data.error);
        }

        // Update courses and pagination data
        this.courses = data.courses || [];
        this.totalCourses = data.pagination?.total || 0;
        this.totalPages = data.pagination?.pages || 1;
        
        console.log('Courses loaded:', this.courses.length);
        console.log('Total courses:', this.totalCourses);
        console.log('Total pages:', this.totalPages);
        
        // No need to filter courses again since the server has already filtered them
        this.filteredCourses = [...this.courses];

        // If this is the first load, set date boundaries
        if (!this.dateRangePicker) {
          this.setDateBoundaries();
        }
        
        // Hide loading state
        this.isLoading = false;
        return Promise.resolve();
      } catch (error) {
        console.error('Error fetching courses:', error);
        alert('Error fetching courses: ' + error.message);
        // Hide loading state
        this.isLoading = false;
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
      // Reset to page 1 when applying new filters
      this.currentPage = 1;
      // Fetch courses with updated filters
      this.fetchCourses();
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

    // Update getFilterOptions method to use the cache
    getFilterOptions(field, searchQuery = '') {
      // If we have cached filter options, use them
      if (this.filterOptionsLoaded && this.filterOptions[field]) {
        const options = this.filterOptions[field];
        
        // Log the options for this field
        if (!this.loggedFilterOptions) {
          this.loggedFilterOptions = {};
        }
        
        if (!this.loggedFilterOptions[field]) {
          console.log(`Filter options for ${field}:`, options);
          this.loggedFilterOptions[field] = true;
        }
        
        // If there's a search query, filter the options
        if (searchQuery && searchQuery.length > 0) {
          const query = searchQuery.toLowerCase();
          return options.filter((value) => value.toLowerCase().includes(query));
        }
        
        return options;
      }
      
      // Fall back to the old method if filter options aren't loaded yet
      console.log(`Using fallback method for ${field} options`);
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
      // First, update the activeFilters based on selectedFilters, keeping original values
      this.activeFilters = JSON.parse(JSON.stringify(this.selectedFilters));
      
      // Log the filters being applied
      console.log('Applying filters:', this.activeFilters);
      
      // Reset to page 1 when applying new filters
      this.currentPage = 1;
      
      // Fetch courses with updated filters
      this.fetchCourses();
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
      
      // Clear search field
      this.searchQuery = '';
      
      // Reset date range
      this.startDate = '';
      this.endDate = '';
      this.dateRangeDisplay = '';
      
      // Reset date picker
      if (this.dateRangePicker) {
        this.dateRangePicker.clearSelection();
      }
      
      // Reset to page 1
      this.currentPage = 1;
      
      // Refresh the data
      this.fetchCourses();
    },

    // Use the helper functions from the modules
    getNumericSymbol: FilterUtils.getNumericSymbol,
    getSymbolSuffix: FilterUtils.getSymbolSuffix,

    // Check if filtered courses contain only a single week
    isSingleWeek() {
      // Get unique weeks from filtered courses
      const uniqueWeeks = [...new Set(this.filteredCourses.map(course => course.week).filter(Boolean))];
      return uniqueWeeks.length === 1;
    },

    // Helper function to group similar entries by combining their classes
    groupSimilarEntries(entries) {
      const groupedMap = new Map();
      
      entries.forEach(entry => {
        // Create a key based on course, teacher, hall, and period
        const key = `${entry.period}-${entry.course_symbol}-${entry.teacher}-${entry.hall}`;
        
        if (groupedMap.has(key)) {
          // If entry with same key exists, combine classes
          const existingEntry = groupedMap.get(key);
          const existingClasses = existingEntry.class.split(';');
          const newClasses = entry.class.split(';');
          
          // Combine and deduplicate classes
          const combinedClasses = [...new Set([...existingClasses, ...newClasses])].filter(Boolean);
          existingEntry.class = combinedClasses.join(';');
        } else {
          // Add new entry to the map
          groupedMap.set(key, {...entry});
        }
      });
      
      // Convert map back to array
      return Array.from(groupedMap.values());
    },
    
    // Helper function to consolidate periods for entries with same course, teacher, class, and hall
    consolidatePeriods(entries) {
      const consolidatedMap = new Map();
      
      entries.forEach(entry => {
        // Create a key based on course, teacher, class, and hall (excluding period)
        const key = `${entry.course_symbol}-${entry.teacher}-${entry.class}-${entry.hall}`;
        
        if (consolidatedMap.has(key)) {
          // If entry with same key exists, combine periods
          const existingEntry = consolidatedMap.get(key);
          const existingPeriods = existingEntry.period.split(';');
          
          // Add new period if it doesn't exist
          if (!existingPeriods.includes(entry.period)) {
            existingPeriods.push(entry.period);
            // Sort periods numerically
            existingPeriods.sort((a, b) => parseInt(a) - parseInt(b));
            existingEntry.period = existingPeriods.join(';');
          }
        } else {
          // Add new entry to the map
          consolidatedMap.set(key, {...entry});
        }
      });
      
      // Convert map back to array
      return Array.from(consolidatedMap.values());
    },
    
    // Format entry for display in the weekly table
    formatEntry(entry) {
      return `Period: ${entry.period} / ${entry.course_symbol} / ${entry.hall} / ${entry.teacher} / ${entry.class}`;
    },

    calculateTeacherStats() {
      // Check if we have only one week - if so, generate weekly table data
      this.showWeeklyView = this.isSingleWeek();
      
      if (this.showWeeklyView) {
        this.weeklyTableData = this.generateWeeklyTableData();
        this.getWeeklyViewFilterOptions();
      }
      
      // Always calculate teacher stats for the original view
      // Initialize stats object for each teacher
      const teacherMap = new Map();

      this.filteredCourses.forEach((course) => {
        // Process teacher 1 only
        if (course.teacher_1) {
          this.processTeacherData(teacherMap, course.teacher_1, course);
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

    getFilterFieldTranslation(field) {
      const translations = {
        'symbol_numeric': 'Mã môn học',
        'symbol_suffix': 'Hình thức HL',
        'week': 'Tuần',
        'class': 'Đối tượng HL',
        'hall': 'Giảng đường',
        'period': 'Tiết học',
        'teacher': 'Giáo viên',
        'date': 'Ngày',
        'day_of_week': 'Thứ',
        'course_name': 'Tên môn học',
        'comment': 'Ghi chú'
      };
      return translations[field] || field;
    },

    // Extract unique options for weekly view filters
    getWeeklyViewFilterOptions() {
      // Extract unique courses, teachers, and halls from the filtered courses
      const courses = new Set();
      const teachers = new Set();
      const halls = new Set();
      
      this.filteredCourses.forEach(course => {
        if (course.course_symbol) courses.add(course.course_symbol);
        if (course.teacher_1) teachers.add(course.teacher_1);
        if (course.hall) halls.add(course.hall);
      });
      
      // Sort and return as arrays
      this.weeklyViewFilters = {
        courses: [...courses].sort(),
        teachers: [...teachers].sort(),
        halls: [...halls].sort()
      };
      
      // Initialize selected filters with all options checked by default
      this.weeklyViewSelectedFilters = {
        courses: [...this.weeklyViewFilters.courses],
        teachers: [...this.weeklyViewFilters.teachers],
        halls: [...this.weeklyViewFilters.halls]
      };
    },
    
    // Toggle a weekly view filter
    toggleWeeklyViewFilter(type, value) {
      const index = this.weeklyViewSelectedFilters[type].indexOf(value);
      if (index === -1) {
        // Add to selected filters
        this.weeklyViewSelectedFilters[type].push(value);
      } else {
        // Remove from selected filters
        this.weeklyViewSelectedFilters[type].splice(index, 1);
      }
    },
    
    // Check if a value is in the selected filters
    isWeeklyViewFilterSelected(type, value) {
      return this.weeklyViewSelectedFilters[type].includes(value);
    },
    
    // Apply weekly view filters to an entry
    shouldShowEntry(entry) {
      return (
        this.weeklyViewSelectedFilters.courses.includes(entry.course_symbol) &&
        this.weeklyViewSelectedFilters.teachers.includes(entry.teacher) &&
        this.weeklyViewSelectedFilters.halls.includes(entry.hall)
      );
    },
    
    // Format periods into readable ranges, treating them as pairs (e.g., 1 represents 1-2, 3 represents 3-4)
    // With special handling for period 9 to group it with 7-8 when present
    formatPeriods(periodsStr) {
      if (!periodsStr) return "Tiết: N/A";
      
      // Split by semicolon
      const periods = periodsStr.split(';').map(p => parseInt(p)).sort((a, b) => a - b);
      
      if (periods.length === 0) return "Tiết: N/A";
      
      // Special case: check if both periods 7/8 and 9 are present
      const has7or8 = periods.some(p => p === 7 || p === 8);
      const has9 = periods.includes(9);
      
      // If we have both 7/8 and 9, we'll treat them as a single range 7-9
      if (has7or8 && has9) {
        // Remove 9 from the periods array - we'll handle it specially
        const periodsWithout9 = periods.filter(p => p !== 9);
        
        // Convert remaining periods to pairs and format
        let formattedPeriods = periodsWithout9.map(period => {
          // For odd periods (except 7), show as a pair (e.g., 1 becomes "1-2")
          if (period % 2 === 1 && period !== 7) {
            return `${period}-${period + 1}`;
          }
          // For even periods (except 8), show as a pair with the previous odd period
          if (period % 2 === 0 && period !== 8) {
            return `${period - 1}-${period}`;
          }
          // Special case for periods 7 and 8 when 9 is also present
          if (period === 7 || period === 8) {
            return '7-9';  // Combine 7, 8, and 9 into one range
          }
          return period.toString();
        });
        
        // Deduplicate (in case both 7 and 8 were in the original list)
        formattedPeriods = [...new Set(formattedPeriods)];
        
        // Combine consecutive ranges
        return formatRanges(formattedPeriods);
      }
      
      // Normal case without special 7-8-9 handling
      const formattedPeriods = periods.map(period => {
        // Special case for period 9 (when alone)
        if (period === 9) {
          return '9';
        }
        // For odd periods, show as a pair (e.g., 1 becomes "1-2")
        if (period % 2 === 1) {
          return `${period}-${period + 1}`;
        }
        // For even periods, show as a pair with the previous odd period
        return `${period - 1}-${period}`;
      });
      
      // Deduplicate pairs
      const uniquePeriods = [...new Set(formattedPeriods)];
      
      // Format the ranges
      return formatRanges(uniquePeriods);
      
      // Helper function to format ranges from period pairs
      function formatRanges(periodPairs) {
        if (periodPairs.length === 1) {
          return `Tiết: ${periodPairs[0]}`;
        }
        
        // Group consecutive pairs into ranges
        const ranges = [];
        let currentRange = { start: null, end: null };
        
        periodPairs.forEach(periodPair => {
          // Handle single-number periods (like "9")
          if (!periodPair.includes('-')) {
            if (currentRange.start !== null) {
              // Add the previous range
              ranges.push(formatRange(currentRange));
            }
            ranges.push(periodPair);
            currentRange = { start: null, end: null };
            return;
          }
          
          // Parse the current pair
          const [start, end] = periodPair.split('-').map(p => parseInt(p));
          
          // If this is the first pair
          if (currentRange.start === null) {
            currentRange = { start, end };
          } 
          // If this pair continues the current range
          else if (start === currentRange.end + 1) {
            currentRange.end = end;
          }
          // If this pair doesn't continue the range
          else {
            // Add the previous range
            ranges.push(formatRange(currentRange));
            // Start a new range
            currentRange = { start, end };
          }
        });
        
        // Add the last range if not empty
        if (currentRange.start !== null) {
          ranges.push(formatRange(currentRange));
        }
        
        return `Tiết: ${ranges.join(', ')}`;
      }
      
      // Helper function to format a single range
      function formatRange(range) {
        if (range.start === range.end) {
          return `${range.start}`;
        }
        return `${range.start}-${range.end}`;
      }
    },
    
    // Export weekly view table to PDF
    exportWeeklyTableToPDF() {
      // Make sure we're using html2pdf.js from CDN
      if (typeof html2pdf === 'undefined') {
        console.error('html2pdf is not defined. Make sure the library is loaded.');
        alert('Could not generate PDF. Please try again later.');
        return;
      }
      
      // Get the table element
      const weeklyTable = document.getElementById('weekly-table-container');
      if (!weeklyTable) {
        console.error('Weekly table element not found.');
        return;
      }
      
      // Set PDF options
      const options = {
        margin: 10,
        filename: `weekly-schedule-week-${this.weeklyTableData.weekNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      
      // Generate PDF
      html2pdf().set(options).from(weeklyTable).save();
    },

    // Add these pagination methods
    goToPage(page) {
      if (page < 1 || page > this.totalPages) return;
      this.currentPage = page;
      this.fetchCourses();
    },

    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.fetchCourses();
      }
    },

    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.fetchCourses();
      }
    },

    // Add the getPageNumber method after the pagination methods
    getPageNumber(i) {
      // Logic to display page numbers around the current page
      if (this.totalPages <= 5) {
        // If we have 5 or fewer pages, just return the page number as is
        return i;
      } else {
        // Calculate a window of 5 pages centered on the current page
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(this.totalPages, startPage + 4);
        
        // Adjust if we're near the end
        if (endPage - startPage < 4) {
          startPage = Math.max(1, endPage - 4);
        }
        
        return startPage + i - 1;
      }
    },

    // Add new method to fetch filter options
    async fetchFilterOptions() {
      if (this.filterOptionsLoaded) {
        console.log('Filter options already loaded, using cache');
        return Promise.resolve();
      }
      
      try {
        console.log('Fetching filter options from server');
        const response = await fetch('/api/filter-options');
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Log each filter type count
        Object.keys(data).forEach(key => {
          const count = data[key] ? data[key].length : 0;
          console.log(`Received ${count} options for ${key}`);
          if (count === 0) {
            console.warn(`Warning: No options found for ${key}`);
          } else if (key === 'symbol_numeric' || key === 'symbol_suffix') {
            // Log sample values for these specific filters
            console.log(`Sample ${key} values:`, data[key].slice(0, 5));
          }
        });
        
        this.filterOptions = data;
        this.filterOptionsLoaded = true;
        return Promise.resolve();
      } catch (error) {
        console.error('Error fetching filter options:', error);
        return Promise.reject(error);
      }
    },

    // Generate weekly table data for the insights view
    generateWeeklyTableData() {
      // Get the week number
      const weekNumber = this.filteredCourses[0]?.week || "";
      
      // Initialize data structure
      const weeklyData = {
        weekNumber,
        days: {}
      };
      
      // Initialize days structure (T2 through CN)
      const dayOrder = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
      dayOrder.forEach(day => {
        weeklyData.days[day] = {
          date: "",
          morning: [],
          afternoon: []
        };
      });
      
      // Group courses by day of week
      this.filteredCourses.forEach(course => {
        const dayOfWeek = course.day_of_week;
        if (!dayOfWeek || !weeklyData.days[dayOfWeek]) return;
        
        // Set the date for this day if not already set
        if (!weeklyData.days[dayOfWeek].date && course.date) {
          weeklyData.days[dayOfWeek].date = course.date;
        }
        
        // Determine if morning or afternoon based on period
        const period = parseInt(course.period, 10);
        const timeSlot = (period >= 1 && period <= 6) ? 'morning' : 'afternoon';
        
        // Create the entry for this course
        const entry = {
          period: course.period,
          course_symbol: course.course_symbol,
          hall: course.hall || "",
          teacher: course.teacher_1 || "",
          class: course.class || ""
        };
        
        // Add to the appropriate time slot
        weeklyData.days[dayOfWeek][timeSlot].push(entry);
      });
      
      // Post-process: sort and group entries
      Object.keys(weeklyData.days).forEach(day => {
        // Sort morning entries by period
        weeklyData.days[day].morning.sort((a, b) => {
          return parseInt(a.period, 10) - parseInt(b.period, 10);
        });
        
        // Sort afternoon entries by period
        weeklyData.days[day].afternoon.sort((a, b) => {
          return parseInt(a.period, 10) - parseInt(b.period, 10);
        });
        
        // First, group entries with the same course, teacher, hall and period, but different classes
        weeklyData.days[day].morning = this.groupSimilarEntries(weeklyData.days[day].morning);
        weeklyData.days[day].afternoon = this.groupSimilarEntries(weeklyData.days[day].afternoon);
        
        // Then, consolidate entries with the same course, teacher, class, and hall but different periods
        weeklyData.days[day].morning = this.consolidatePeriods(weeklyData.days[day].morning);
        weeklyData.days[day].afternoon = this.consolidatePeriods(weeklyData.days[day].afternoon);
      });
      
      return weeklyData;
    },
  }));
});
