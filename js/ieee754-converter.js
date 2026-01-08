function convertToIEEE754() {
  const input = document.getElementById('decimal-input').value;
  const precision = document.querySelector('input[name="precision"]:checked').value;
  
  if (!input || isNaN(input)) {
    alert('Please enter a valid decimal number');
    return;
  }
  
  const number = parseFloat(input);
  const is32bit = precision === '32';
  
  // Get the binary representation
  const buffer = new ArrayBuffer(is32bit ? 4 : 8);
  const view = new DataView(buffer);
  
  if (is32bit) {
    view.setFloat32(0, number, false); // big-endian
  } else {
    view.setFloat64(0, number, false); // big-endian
  }
  
  // Extract binary string
  let binaryStr = '';
  let hexStr = '';
  const bytes = is32bit ? 4 : 8;
  
  for (let i = 0; i < bytes; i++) {
    const byte = view.getUint8(i);
    binaryStr += byte.toString(2).padStart(8, '0');
    hexStr += byte.toString(16).toUpperCase().padStart(2, '0');
  }
  
  // Extract components
  const signBit = binaryStr[0];
  const exponentBits = is32bit ? binaryStr.substring(1, 9) : binaryStr.substring(1, 12);
  const mantissaBits = is32bit ? binaryStr.substring(9) : binaryStr.substring(12);
  
  // Display results
  document.getElementById('binary-result').textContent = formatBinary(binaryStr, is32bit);
  document.getElementById('hex-result').textContent = '0x' + hexStr;
  document.getElementById('sign-bit').textContent = signBit;
  document.getElementById('exponent-bits').textContent = exponentBits;
  document.getElementById('mantissa-bits').textContent = mantissaBits;
  
  // Generate step-by-step explanation
  generateSteps(number, signBit, exponentBits, mantissaBits, is32bit);
  
  document.getElementById('steps-section').style.display = 'block';
}

function formatBinary(binary, is32bit) {
  if (is32bit) {
    return binary[0] + ' ' + binary.substring(1, 9) + ' ' + binary.substring(9);
  } else {
    return binary[0] + ' ' + binary.substring(1, 12) + ' ' + binary.substring(12);
  }
}

function generateSteps(number, signBit, exponentBits, mantissaBits, is32bit) {
  const stepsContainer = document.getElementById('calculation-steps');
  const bias = is32bit ? 127 : 1023;
  const exponentValue = parseInt(exponentBits, 2);
  const actualExponent = exponentValue - bias;
  
  let steps = `
    <div class="step">
      <div class="step-number">1</div>
      <div class="step-content">
        <h4>Input Number</h4>
        <p><strong>${number}</strong> ${number >= 0 ? '(positive)' : '(negative)'}</p>
      </div>
    </div>
    
    <div class="step">
      <div class="step-number">2</div>
      <div class="step-content">
        <h4>Sign Bit</h4>
        <p>Sign bit = <strong>${signBit}</strong> ${signBit === '0' ? '(positive)' : '(negative)'}</p>
        <p class="step-note">The sign bit is 0 for positive numbers and 1 for negative numbers.</p>
      </div>
    </div>
    
    <div class="step">
      <div class="step-number">3</div>
      <div class="step-content">
        <h4>Convert Absolute Value to Binary</h4>
        <p>|${number}| = ${Math.abs(number)}</p>
        <p class="step-note">First, we work with the absolute value and convert it to binary.</p>
      </div>
    </div>
    
    <div class="step">
      <div class="step-number">4</div>
      <div class="step-content">
        <h4>Normalize to Scientific Notation</h4>
        <p>Express as 1.xxxxx × 2<sup>exponent</sup></p>
        <p class="step-note">Move the binary point so there's exactly one 1 before it.</p>
      </div>
    </div>
    
    <div class="step">
      <div class="step-number">5</div>
      <div class="step-content">
        <h4>Calculate Biased Exponent</h4>
        <p>Exponent bits (binary): <strong>${exponentBits}</strong></p>
        <p>Exponent value (decimal): <strong>${exponentValue}</strong></p>
        <p>Actual exponent: ${exponentValue} - ${bias} = <strong>${actualExponent}</strong></p>
        <p class="step-note">The exponent is stored with a bias of ${bias} for ${is32bit ? 'single' : 'double'} precision.</p>
      </div>
    </div>
    
    <div class="step">
      <div class="step-number">6</div>
      <div class="step-content">
        <h4>Extract Mantissa (Fraction)</h4>
        <p>Mantissa bits: <strong>${mantissaBits}</strong></p>
        <p>Stored mantissa length: <strong>${mantissaBits.length} bits</strong></p>
        <p class="step-note">The mantissa represents the fractional part after the implicit leading 1.</p>
      </div>
    </div>
    
    <div class="step">
      <div class="step-number">7</div>
      <div class="step-content">
        <h4>Final IEEE 754 Representation</h4>
        <p>Formula: (-1)<sup>${signBit}</sup> × 2<sup>${actualExponent}</sup> × (1 + fraction)</p>
        <div class="final-representation">
          <div class="repr-part sign-bg">
            <span class="repr-label">Sign</span>
            <span class="repr-value">${signBit}</span>
          </div>
          <div class="repr-part exponent-bg">
            <span class="repr-label">Exponent</span>
            <span class="repr-value">${exponentBits}</span>
          </div>
          <div class="repr-part mantissa-bg">
            <span class="repr-label">Mantissa</span>
            <span class="repr-value">${mantissaBits}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Handle special cases
  if (exponentValue === 0) {
    steps += `
      <div class="step special">
        <div class="step-content">
          <h4><i class="fas fa-exclamation-circle"></i> Special Case: Denormalized Number</h4>
          <p>When exponent is all zeros, this represents a denormalized number or zero.</p>
        </div>
      </div>
    `;
  } else if (exponentValue === (is32bit ? 255 : 2047)) {
    const isNaN = mantissaBits.includes('1');
    steps += `
      <div class="step special">
        <div class="step-content">
          <h4><i class="fas fa-exclamation-circle"></i> Special Case: ${isNaN ? 'NaN' : 'Infinity'}</h4>
          <p>When exponent is all ones, this represents ${isNaN ? 'Not a Number (NaN)' : 'Infinity'}.</p>
        </div>
      </div>
    `;
  }
  
  stepsContainer.innerHTML = steps;
}
