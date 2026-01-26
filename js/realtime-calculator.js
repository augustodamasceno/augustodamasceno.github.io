/**
 * Real-Time Calculator
 * Calculate execution periods for USART, PWM, ADC, and I2C peripherals
 */

(function() {
  'use strict';

  // Utility function to format time
  function formatTime(microseconds) {
    if (microseconds < 1) {
      return (microseconds * 1000).toFixed(3) + ' ns';
    } else if (microseconds < 1000) {
      return microseconds.toFixed(3) + ' µs';
    } else if (microseconds < 1000000) {
      return (microseconds / 1000).toFixed(3) + ' ms';
    } else {
      return (microseconds / 1000000).toFixed(3) + ' s';
    }
  }

  // Utility function to format frequency
  function formatFrequency(hz) {
    if (hz < 1000) {
      return hz.toFixed(2) + ' Hz';
    } else if (hz < 1000000) {
      return (hz / 1000).toFixed(2) + ' kHz';
    } else {
      return (hz / 1000000).toFixed(2) + ' MHz';
    }
  }

  // USART Calculations
  function calculateUSART() {
    const clock = parseFloat($('#usart-clock').val());
    const prescaler = parseInt($('input[name="usart-prescaler"]:checked').val());
    const baudRate = parseInt($('#usart-baud').val());
    const numBytes = parseInt($('#usart-bytes').val());
    const dataBits = parseInt($('input[name="usart-databits"]:checked').val());
    const stopBits = parseInt($('input[name="usart-stopbits"]:checked').val());

    // Effective clock after prescaler
    const effectiveClock = clock / prescaler;

    // Bit period (1 / baud rate)
    const bitPeriod = 1000000 / baudRate; // in microseconds

    // Frame: 1 start bit + data bits + parity (optional, assuming none) + stop bits
    const bitsPerFrame = 1 + dataBits + stopBits;
    const framePeriod = bitPeriod * bitsPerFrame;

    // Total time for all bytes
    const totalTime = framePeriod * numBytes;

    $('#usart-bit-period').text(formatTime(bitPeriod)).addClass('updated');
    $('#usart-byte-period').text(formatTime(framePeriod)).addClass('updated');
    $('#usart-total-time').text(formatTime(totalTime)).addClass('updated');

    setTimeout(() => {
      $('.result-value').removeClass('updated');
    }, 500);
  }

  // PWM Calculations
  function calculatePWM() {
    const clock = parseFloat($('#pwm-clock').val());
    const prescaler = parseInt($('input[name="pwm-prescaler"]:checked').val());
    const top = parseInt($('#pwm-top').val());

    // Effective clock after prescaler
    const effectiveClock = clock / prescaler;

    // Timer tick period
    const timerTick = 1000000 / effectiveClock; // in microseconds

    // PWM frequency = clock / (prescaler * (1 + TOP))
    const pwmFrequency = effectiveClock / (top + 1);

    // PWM period
    const pwmPeriod = (top + 1) * timerTick;

    $('#pwm-frequency').text(formatFrequency(pwmFrequency)).addClass('updated');
    $('#pwm-period').text(formatTime(pwmPeriod)).addClass('updated');
    $('#pwm-tick').text(formatTime(timerTick)).addClass('updated');

    setTimeout(() => {
      $('.result-value').removeClass('updated');
    }, 500);
  }

  // ADC Calculations
  function calculateADC() {
    const clock = parseFloat($('#adc-clock').val());
    const prescaler = parseInt($('input[name="adc-prescaler"]:checked').val());
    const samples = parseInt($('#adc-samples').val());
    const resolution = parseInt($('input[name="adc-resolution"]:checked').val());

    // ADC clock after prescaler
    const adcClock = clock / prescaler;

    // Typical ADC conversion cycles (13 for first conversion, 13 for subsequent)
    // This is typical for AVR, adjust for specific MCU
    const conversionCycles = 13;

    // Conversion time
    const conversionTime = (conversionCycles / adcClock) * 1000000; // in microseconds

    // Total sampling time
    const totalTime = conversionTime * samples;

    $('#adc-freq').text(formatFrequency(adcClock)).addClass('updated');
    $('#adc-conversion').text(formatTime(conversionTime)).addClass('updated');
    $('#adc-total').text(formatTime(totalTime)).addClass('updated');

    setTimeout(() => {
      $('.result-value').removeClass('updated');
    }, 500);
  }

  // I2C Calculations
  function calculateI2C() {
    const clock = parseFloat($('#i2c-clock').val());
    const prescaler = parseInt($('input[name="i2c-prescaler"]:checked').val());
    const sclFreq = parseInt($('#i2c-scl').val());
    const numBytes = parseInt($('#i2c-bytes').val());

    // SCL period (1 / SCL frequency)
    const sclPeriod = 1000000 / sclFreq; // in microseconds

    // I2C frame: 8 data bits + 1 ACK bit = 9 bits per byte
    const bitsPerByte = 9;
    const bytePeriod = sclPeriod * bitsPerByte;

    // Total transaction includes: START condition + Address byte + data bytes + STOP
    // START and STOP each take about 1 bit period
    const overhead = sclPeriod * 2; // START + STOP
    const addressOverhead = bytePeriod; // Address byte

    // Total time (including address byte and data bytes)
    const totalTime = overhead + addressOverhead + (bytePeriod * numBytes);

    $('#i2c-bit-period').text(formatTime(sclPeriod)).addClass('updated');
    $('#i2c-byte-period').text(formatTime(bytePeriod)).addClass('updated');
    $('#i2c-total-time').text(formatTime(totalTime)).addClass('updated');

    setTimeout(() => {
      $('.result-value').removeClass('updated');
    }, 500);
  }

  // Update PWM TOP value when resolution changes
  function updatePWMTop() {
    const resolution = parseInt($('input[name="pwm-resolution"]:checked').val());
    const maxTop = Math.pow(2, resolution) - 1;
    $('#pwm-top').attr('max', maxTop);
    
    // Set default TOP value based on resolution
    const currentTop = parseInt($('#pwm-top').val());
    if (currentTop > maxTop) {
      $('#pwm-top').val(maxTop);
    }
  }

  // Initialize calculations on page load
  $(document).ready(function() {
    // Set up event listeners for USART
    $('#usart-clock, #usart-bytes, #usart-baud').on('input change', calculateUSART);
    $('input[name="usart-prescaler"], input[name="usart-databits"], input[name="usart-stopbits"]').on('change', function() {
      $(this).parent().addClass('active').siblings().removeClass('active');
      calculateUSART();
    });

    // Set up event listeners for PWM
    $('#pwm-clock, #pwm-top').on('input change', calculatePWM);
    $('input[name="pwm-prescaler"]').on('change', function() {
      $(this).parent().addClass('active').siblings().removeClass('active');
      calculatePWM();
    });
    $('input[name="pwm-resolution"]').on('change', function() {
      $(this).parent().addClass('active').siblings().removeClass('active');
      updatePWMTop();
      calculatePWM();
    });

    // Set up event listeners for ADC
    $('#adc-clock, #adc-samples').on('input change', calculateADC);
    $('input[name="adc-prescaler"], input[name="adc-resolution"]').on('change', function() {
      $(this).parent().addClass('active').siblings().removeClass('active');
      calculateADC();
    });

    // Set up event listeners for I2C
    $('#i2c-clock, #i2c-bytes, #i2c-scl').on('input change', calculateI2C);
    $('input[name="i2c-prescaler"], input[name="i2c-operation"]').on('change', function() {
      $(this).parent().addClass('active').siblings().removeClass('active');
      calculateI2C();
    });

    // Perform initial calculations
    calculateUSART();
    calculatePWM();
    calculateADC();
    calculateI2C();

    // Initialize PWM TOP max value
    updatePWMTop();

    // Smooth scroll to sections (optional enhancement)
    $('a[href^="#"]').on('click', function(e) {
      e.preventDefault();
      const target = $(this.getAttribute('href'));
      if (target.length) {
        $('html, body').stop().animate({
          scrollTop: target.offset().top - 100
        }, 1000);
      }
    });
  });

})();
