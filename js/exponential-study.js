// Exponential Study JavaScript
// Augusto Damasceno

let chart = null;
const e = Math.E;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeChart();
    attachEventListeners();
    updatePlot();
});

// Set base to predefined values
function setBase(value) {
    const baseInput = document.getElementById('baseInput');
    if (value === 'e') {
        baseInput.value = e.toFixed(5);
    } else {
        baseInput.value = value;
    }
    updatePlot();
}

// Attach event listeners to all inputs
function attachEventListeners() {
    const inputs = ['baseInput', 'amplitudeInput', 'xSignCheckbox', 'tau1Input', 'const1Input', 'tau2Input', 'const2Input', 'minDesiredValueInput', 'rangeXMinInput', 'rangeXMaxInput'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        const eventType = element.type === 'checkbox' ? 'change' : 'input';
        element.addEventListener(eventType, updatePlot);
    });
}

// Initialize Chart.js chart
function initializeChart() {
    const ctx = document.getElementById('exponentialChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'f(x)',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
            }, {
                label: 'Target Value',
                data: [],
                borderColor: 'rgba(255, 99, 132, 0.8)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            }, {
                label: 'Intercept',
                data: [],
                borderColor: 'rgba(255, 206, 86, 1)',
                backgroundColor: 'rgba(255, 206, 86, 1)',
                pointRadius: 8,
                pointHoverRadius: 10,
                showLine: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    mode: 'nearest',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgb(75, 192, 192)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            return 'Point on Graph';
                        },
                        label: function(context) {
                            return [
                                'x = ' + context.parsed.x.toFixed(4),
                                'y = f(x) = ' + context.parsed.y.toFixed(4)
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Input Range'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'f(x)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Calculate exponent based on tau and constants
function calculateExponent() {
    const tau1 = parseFloat(document.getElementById('tau1Input').value) || 1;
    const const1 = parseFloat(document.getElementById('const1Input').value) || 1;
    const tau2 = parseFloat(document.getElementById('tau2Input').value) || 1;
    const const2 = parseFloat(document.getElementById('const2Input').value) || 1;

    // Prevent division by zero
    if (tau2 * const2 === 0) {
        return 1;
    }

    return (tau1 * const1) / (tau2 * const2);
}

// Calculate function value
function calculateFunction(base, amplitude, exponent, inputValue, negativeX) {
    // f(x) = amplitude * base^(exponent * inputValue)
    // where exponent is our calculated ratio
    // Apply sign based on checkbox
    const signedInput = negativeX ? -inputValue : inputValue;
    return amplitude * Math.pow(base, exponent * signedInput);
}

// Update the plot
function updatePlot() {
    try {
        // Get input values
        const base = parseFloat(document.getElementById('baseInput').value) || e;
        const amplitude = parseFloat(document.getElementById('amplitudeInput').value) || 1;
        const negativeX = document.getElementById('xSignCheckbox').checked;
        const rangeXMin = parseFloat(document.getElementById('rangeXMinInput').value) || 0;
        const rangeXMax = parseFloat(document.getElementById('rangeXMaxInput').value) || 100;
        
        // Validate X range
        if (rangeXMin >= rangeXMax) {
            alert('X-Axis Min must be less than X-Axis Max');
            return;
        }
        
        // Calculate exponent
        const exponent = calculateExponent();
        
        // Update display
        updateDisplay(base, amplitude, exponent);
        
        // Generate data points
        const numPoints = 200;
        const rangeSpan = rangeXMax - rangeXMin;
        const step = rangeSpan / numPoints;
        const xValues = [];
        const yValues = [];
        
        for (let i = 0; i <= numPoints; i++) {
            const x = rangeXMin + (i * step);
            const y = calculateFunction(base, amplitude, exponent, x, negativeX);
            
            // Handle infinite or NaN values
            if (!isFinite(y) || isNaN(y)) {
                continue;
            }
            
            xValues.push(x);
            yValues.push(y);
        }
        
        // Create data points without clamping
        const filteredData = xValues.map((x, i) => {
            return { x: x, y: yValues[i] };
        });
        
        // Update chart
        chart.data.labels = xValues;
        chart.data.datasets[0].data = filteredData;
        
        // Get tau values for label
        const tau1 = parseFloat(document.getElementById('tau1Input').value) || 1;
        const const1 = parseFloat(document.getElementById('const1Input').value) || 1;
        const tau2 = parseFloat(document.getElementById('tau2Input').value) || 1;
        const const2 = parseFloat(document.getElementById('const2Input').value) || 1;
        const xSign = negativeX ? '-' : '';
        
        chart.data.datasets[0].label = `f(x) = ${amplitude.toFixed(2)} × ${base.toFixed(3)}^((${xSign}x × ${tau1.toFixed(2)} × ${const1.toFixed(2)}) / (${tau2.toFixed(2)} × ${const2.toFixed(2)}))`;
        
        // Add target value line (horizontal line)
        const minDesiredValue = parseFloat(document.getElementById('minDesiredValueInput').value) || 0.1;
        chart.data.datasets[1].data = [
            { x: rangeXMin, y: minDesiredValue },
            { x: rangeXMax, y: minDesiredValue }
        ];
        chart.data.datasets[1].label = `Target = ${minDesiredValue.toFixed(4)}`;
        
        // Find and mark intercept point
        chart.data.datasets[2].data = [];
        for (let i = 0; i < filteredData.length - 1; i++) {
            const y1 = filteredData[i].y;
            const y2 = filteredData[i + 1].y;
            
            // Check if target value is between these two points
            if ((y1 <= minDesiredValue && y2 >= minDesiredValue) || 
                (y1 >= minDesiredValue && y2 <= minDesiredValue)) {
                // Linear interpolation to find x where y = minDesiredValue
                const x1 = filteredData[i].x;
                const x2 = filteredData[i + 1].x;
                const interceptX = x1 + (x2 - x1) * (minDesiredValue - y1) / (y2 - y1);
                
                chart.data.datasets[2].data.push({ 
                    x: interceptX, 
                    y: minDesiredValue 
                });
                chart.data.datasets[2].label = `Intercept (x=${interceptX.toFixed(4)})`;
                break; // Only mark first intercept
            }
        }
        
        // Update X-axis limits to user-defined range
        chart.options.scales.x.min = rangeXMin;
        chart.options.scales.x.max = rangeXMax;
        // Y-axis will auto-scale based on data
        delete chart.options.scales.y.min;
        delete chart.options.scales.y.max;
        
        chart.update('none'); // Update without animation for smoother experience
        
    } catch (error) {
        console.error('Error updating plot:', error);
    }
}

// Update display values
function updateDisplay(base, amplitude, exponent) {
    const tau1 = parseFloat(document.getElementById('tau1Input').value) || 1;
    const const1 = parseFloat(document.getElementById('const1Input').value) || 1;
    const tau2 = parseFloat(document.getElementById('tau2Input').value) || 1;
    const const2 = parseFloat(document.getElementById('const2Input').value) || 1;
    
    // Update amplitude display
    document.getElementById('amplitudeDisplay').textContent = amplitude.toFixed(2);
    
    // Update x sign display
    const negativeX = document.getElementById('xSignCheckbox').checked;
    document.getElementById('xSignDisplay').textContent = negativeX ? '-' : '';
    
    // Update base display
    const baseDisplay = document.getElementById('baseDisplay');
    if (Math.abs(base - e) < 0.001) {
        baseDisplay.textContent = 'e';
    } else {
        baseDisplay.textContent = base.toFixed(3);
    }
    
    // Update parameter displays
    document.getElementById('tau1Display').textContent = tau1.toFixed(2);
    document.getElementById('const1Display').textContent = const1.toFixed(2);
    document.getElementById('tau2Display').textContent = tau2.toFixed(2);
    document.getElementById('const2Display').textContent = const2.toFixed(2);
    
    // Calculate suggested τ based on inferred steps and target value
    // Steps are inferred from X range: steps = X-Max - X-Min
    // For exponential: A * e^(x/τ) to reach targetValue in steps
    // targetValue = A * e^(steps/τ)
    // targetValue/A = e^(steps/τ)
    // ln(targetValue/A) = steps/τ
    // τ = steps / ln(targetValue/A)
    // For decay: τ = -steps / ln(targetValue/A) = steps / ln(A/targetValue)
    const rangeXMax = parseFloat(document.getElementById('rangeXMaxInput').value) || 100;
    const rangeXMin = parseFloat(document.getElementById('rangeXMinInput').value) || 0;
    const deltaXSteps = rangeXMax - rangeXMin; // Inferred from X range
    const minDesiredValue = parseFloat(document.getElementById('minDesiredValueInput').value) || 0.1;
    const tauHelperElement = document.getElementById('tauHelperDisplay');
    
    if (amplitude > 0 && minDesiredValue > 0 && minDesiredValue !== amplitude) {
        const ratio = amplitude / minDesiredValue; // Changed to A/target
        if (ratio > 0) {
            // τ = steps / ln(A/target)
            const suggestedTau = deltaXSteps / Math.log(ratio);
            tauHelperElement.textContent = suggestedTau.toFixed(4);
        } else {
            tauHelperElement.textContent = 'N/A';
        }
    } else {
        tauHelperElement.textContent = 'N/A';
    }
}

// Download chart function
function downloadChart(format) {
    const canvas = document.getElementById('exponentialChart');
    const link = document.createElement('a');
    const filename = `exponential-chart-${Date.now()}`;
    
    if (format === 'png') {
        link.href = canvas.toDataURL('image/png');
        link.download = filename + '.png';
    } else if (format === 'jpg') {
        // Create white background for JPEG
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const ctx = tempCanvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(canvas, 0, 0);
        link.href = tempCanvas.toDataURL('image/jpeg', 0.95);
        link.download = filename + '.jpg';
    } else if (format === 'svg') {
        // For SVG, we'll use canvas as PNG since Chart.js renders to canvas
        // True SVG export would require a different charting library
        alert('SVG export requires additional libraries. Downloading as PNG instead.');
        link.href = canvas.toDataURL('image/png');
        link.download = filename + '.png';
    }
    
    link.click();
}
