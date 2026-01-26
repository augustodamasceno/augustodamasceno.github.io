/**
 * Backtesting Time Calculator
 * Calculate backtesting execution time based on period, granularity, and execution speed
 */

function calculateBacktesting() {
  'use strict';

  // Get time period inputs
  const years = parseFloat($('#years').val()) || 0;
  const months = parseFloat($('#months').val()) || 0;
  const weeks = parseFloat($('#weeks').val()) || 0;
  const days = parseFloat($('#days').val()) || 0;
  const hours = parseFloat($('#hours').val()) || 0;
  const minutes = parseFloat($('#minutes').val()) || 0;
  const seconds = parseFloat($('#seconds').val()) || 0;

  // Get granularity and execution configuration
  const granularityMs = parseFloat($('#granularity').val());
  const referenceGranularityMs = parseFloat($('#reference-granularity').val());
  const execTime = parseFloat($('#exec-time').val());
  const execUnit = parseFloat($('#exec-unit').val());
  const dataDuration = parseFloat($('#data-duration').val()); // in seconds

  // Validate inputs
  if (years === 0 && months === 0 && weeks === 0 && days === 0 && 
      hours === 0 && minutes === 0 && seconds === 0) {
    alert('Please enter at least one time period value');
    return;
  }

  if (execTime <= 0) {
    alert('Processing time must be greater than 0');
    return;
  }

  // Convert everything to milliseconds
  const totalMs = (
    (years * 365.25 * 24 * 60 * 60 * 1000) +
    (months * 30.44 * 24 * 60 * 60 * 1000) +
    (weeks * 7 * 24 * 60 * 60 * 1000) +
    (days * 24 * 60 * 60 * 1000) +
    (hours * 60 * 60 * 1000) +
    (minutes * 60 * 1000) +
    (seconds * 1000)
  );

  // Calculate number of data points based on selected granularity
  const dataPoints = Math.floor(totalMs / granularityMs);

  // Calculate execution time in seconds, adjusted for granularity
  // The reference speed is measured at reference granularity
  // If current granularity is coarser, processing will be faster (fewer data points)
  // If current granularity is finer, processing will be slower (more data points)
  const granularityRatio = referenceGranularityMs / granularityMs;
  
  const execTimeSeconds = execTime * execUnit; // time in seconds to process dataDuration seconds of data at reference granularity
  const dataDurationSeconds = dataDuration; // amount of data processed in that time
  
  // Total data to process in seconds
  const totalDataSeconds = totalMs / 1000;
  
  // Calculate total execution time with granularity adjustment
  // Base time: (execTimeSeconds / dataDurationSeconds) * totalDataSeconds
  // Adjusted for granularity: multiply by (referenceGranularity / currentGranularity)
  const totalExecSeconds = (execTimeSeconds / dataDurationSeconds) * totalDataSeconds * granularityRatio;

  // Format results
  $('#total-period').text(formatDuration(totalMs));
  $('#data-points').text(dataPoints.toLocaleString() + ' points');
  $('#data-granularity').text(formatGranularity(granularityMs));
  
  // Format processing speed description with reference granularity
  const speedDesc = execTime + ' ' + getUnitName(execUnit) + ' to process ' + formatDataDuration(dataDuration) + ' at ' + formatGranularity(referenceGranularityMs);
  $('#processing-speed').text(speedDesc);
  
  $('#execution-time').text(formatExecutionTime(totalExecSeconds));

  // Scroll to results
  $('html, body').animate({
    scrollTop: $('#results-section').offset().top - 100
  }, 500);
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30.44);
  const years = Math.floor(days / 365.25);

  const parts = [];

  if (years > 0) {
    parts.push(years + ' year' + (years !== 1 ? 's' : ''));
  }
  if (months % 12 > 0 && years < 10) {
    parts.push((months % 12) + ' month' + (months % 12 !== 1 ? 's' : ''));
  }
  if (days % 30.44 > 0 && months < 12) {
    const remainingDays = Math.floor(days % 30.44);
    if (remainingDays > 0) {
      parts.push(remainingDays + ' day' + (remainingDays !== 1 ? 's' : ''));
    }
  }
  if (hours % 24 > 0 && days < 7) {
    parts.push((hours % 24) + ' hour' + (hours % 24 !== 1 ? 's' : ''));
  }
  if (minutes % 60 > 0 && hours < 24) {
    parts.push((minutes % 60) + ' minute' + (minutes % 60 !== 1 ? 's' : ''));
  }
  if (seconds % 60 > 0 && minutes < 60) {
    parts.push((seconds % 60) + ' second' + (seconds % 60 !== 1 ? 's' : ''));
  }

  if (parts.length === 0) {
    return ms.toFixed(2) + ' milliseconds';
  }

  return parts.slice(0, 3).join(', ');
}

/**
 * Format granularity value to human-readable string
 */
function formatGranularity(ms) {
  if (ms < 1) {
    return (ms * 1000) + ' microseconds';
  } else if (ms < 1000) {
    return ms + ' millisecond' + (ms !== 1 ? 's' : '');
  } else if (ms < 60000) {
    const seconds = ms / 1000;
    return seconds + ' second' + (seconds !== 1 ? 's' : '');
  } else if (ms < 3600000) {
    const minutes = ms / 60000;
    return minutes + ' minute' + (minutes !== 1 ? 's' : '');
  } else if (ms < 86400000) {
    const hours = ms / 3600000;
    return hours + ' hour' + (hours !== 1 ? 's' : '');
  } else {
    const days = ms / 86400000;
    return days + ' day' + (days !== 1 ? 's' : '');
  }
}

/**
 * Format execution time in seconds to human-readable string
 */
function formatExecutionTime(seconds) {
  if (seconds < 0.001) {
    return (seconds * 1000000).toFixed(2) + ' microseconds (µs)';
  } else if (seconds < 1) {
    return (seconds * 1000).toFixed(2) + ' milliseconds (ms)';
  } else if (seconds < 60) {
    return seconds.toFixed(2) + ' seconds';
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return minutes + ' minute' + (minutes !== 1 ? 's' : '') + 
           (remainingSeconds > 0 ? ' ' + remainingSeconds + ' second' + (remainingSeconds !== 1 ? 's' : '') : '');
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return hours + ' hour' + (hours !== 1 ? 's' : '') + 
           (remainingMinutes > 0 ? ' ' + remainingMinutes + ' minute' + (remainingMinutes !== 1 ? 's' : '') : '');
  } else {
    const days = Math.floor(seconds / 86400);
    const remainingHours = Math.floor((seconds % 86400) / 3600);
    return days + ' day' + (days !== 1 ? 's' : '') + 
           (remainingHours > 0 ? ' ' + remainingHours + ' hour' + (remainingHours !== 1 ? 's' : '') : '');
  }
}

/**
 * Get unit name from unit value
 */
function getUnitName(unitValue) {
  switch (unitValue) {
    case 0.000001:
      return 'microseconds';
    case 0.001:
      return 'milliseconds';
    case 1:
      return 'seconds';
    case 60:
      return 'minutes';
    case 3600:
      return 'hours';
    default:
      return 'seconds';
  }
}

/**
 * Format data duration to human-readable string
 */
function formatDataDuration(seconds) {
  if (seconds < 1) {
    if (seconds === 0.001) return '1 millisecond of data';
    if (seconds === 0.01) return '10 milliseconds of data';
    if (seconds === 0.1) return '100 milliseconds of data';
    return (seconds * 1000) + ' milliseconds of data';
  } else if (seconds === 1) {
    return '1 second of data';
  } else if (seconds < 60) {
    return seconds + ' seconds of data';
  } else if (seconds === 60) {
    return '1 minute of data';
  } else if (seconds === 300) {
    return '5 minutes of data';
  } else if (seconds === 900) {
    return '15 minutes of data';
  } else if (seconds === 3600) {
    return '1 hour of data';
  } else if (seconds === 86400) {
    return '1 day of data';
  } else if (seconds < 3600) {
    const minutes = seconds / 60;
    return minutes + ' minutes of data';
  } else if (seconds < 86400) {
    const hours = seconds / 3600;
    return hours + ' hours of data';
  } else {
    const days = seconds / 86400;
    return days + ' days of data';
  }
}

/**
 * Initialize auto-calculation on input change
 */
$(document).ready(function() {
  'use strict';

  // Auto-calculate on any input change
  $('#years, #months, #weeks, #days, #hours, #minutes, #seconds, #granularity, #reference-granularity, #exec-time, #exec-unit, #data-duration').on('change input', function() {
    // Optional: Add debouncing if needed
    // For now, we'll keep manual calculation only via button
  });

  // Update granularity label on change
  $('#granularity').on('change', function() {
    const value = parseFloat($(this).val());
    console.log('Granularity selected:', formatGranularity(value));
  });

  // Prevent negative values
  $('input[type="number"]').on('input', function() {
    const min = parseFloat($(this).attr('min')) || 0;
    if (parseFloat($(this).val()) < min) {
      $(this).val(min);
    }
  });

  // Show notification on page load
  setTimeout(function() {
    if (typeof $.notify !== 'undefined') {
      $.notify({
        icon: 'fas fa-info-circle',
        message: 'Configure your backtesting parameters and click Calculate to see the estimated execution time.'
      }, {
        type: 'info',
        delay: 5000,
        placement: {
          from: 'top',
          align: 'right'
        },
        animate: {
          enter: 'animated fadeInDown',
          exit: 'animated fadeOutUp'
        }
      });
    }
  }, 1000);
});
