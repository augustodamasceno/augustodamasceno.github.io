// Black-Scholes Options Pricing Calculator
// Augusto Damasceno

let chart = null;
let currentChartType = 'stock';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeChart();
    attachEventListeners();
    calculate();
    // Initialize Bootstrap tooltips
    $('[data-toggle="tooltip"]').tooltip({
        placement: 'top',
        trigger: 'hover'
    });
});

// Attach event listeners to all inputs
function attachEventListeners() {
    const inputs = ['stockPriceInput', 'strikePriceInput', 'timeInput', 'rateInput', 'volatilityInput'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', calculate);
    });
    document.getElementById('optionTypeSelect').addEventListener('change', calculate);
    document.getElementById('timeUnitSelect').addEventListener('change', calculate);
}

// Standard normal cumulative distribution function
function normalCDF(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
}

// Standard normal probability density function
function normalPDF(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Calculate d1 and d2 for Black-Scholes
function calculateD1D2(S, K, T, r, sigma) {
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    return { d1, d2 };
}

// Black-Scholes formula for European options
function blackScholes(S, K, T, r, sigma, optionType) {
    const { d1, d2 } = calculateD1D2(S, K, T, r, sigma);
    
    let price, delta, gamma, theta, vega, rho;
    
    if (optionType === 'call') {
        price = S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
        delta = normalCDF(d1);
        theta = (-S * normalPDF(d1) * sigma / (2 * Math.sqrt(T)) 
                 - r * K * Math.exp(-r * T) * normalCDF(d2)) / 365;
        rho = K * T * Math.exp(-r * T) * normalCDF(d2) / 100;
    } else {
        price = K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
        delta = normalCDF(d1) - 1;
        theta = (-S * normalPDF(d1) * sigma / (2 * Math.sqrt(T)) 
                 + r * K * Math.exp(-r * T) * normalCDF(-d2)) / 365;
        rho = -K * T * Math.exp(-r * T) * normalCDF(-d2) / 100;
    }
    
    // Gamma and Vega are the same for calls and puts
    gamma = normalPDF(d1) / (S * sigma * Math.sqrt(T));
    vega = S * normalPDF(d1) * Math.sqrt(T) / 100;
    
    return { price, delta, gamma, theta, vega, rho, d1, d2 };
}

// Calculate intrinsic and time value
function calculateIntrinsicValue(S, K, optionType) {
    if (optionType === 'call') {
        return Math.max(S - K, 0);
    } else {
        return Math.max(K - S, 0);
    }
}

// Main calculation function
function calculate() {
    try {
        // Get input values
        const S = parseFloat(document.getElementById('stockPriceInput').value) || 100;
        const K = parseFloat(document.getElementById('strikePriceInput').value) || 100;
        const timeInputValue = parseFloat(document.getElementById('timeInput').value) || 1;
        const timeUnit = document.getElementById('timeUnitSelect').value;
        
        // Convert time to years
        let T;
        if (timeUnit === 'days') {
            T = timeInputValue / 365;
            document.getElementById('timeDisplay').textContent = T.toFixed(4) + ' years';
        } else {
            T = timeInputValue;
            document.getElementById('timeDisplay').textContent = (T * 365).toFixed(1) + ' days';
        }
        
        const r = parseFloat(document.getElementById('rateInput').value) / 100 || 0.05;
        const sigma = parseFloat(document.getElementById('volatilityInput').value) / 100 || 0.2;
        const optionType = document.getElementById('optionTypeSelect').value;
        
        // Validate inputs
        if (S <= 0 || K <= 0 || T <= 0 || sigma <= 0) {
            return;
        }
        
        // Calculate Black-Scholes values
        const result = blackScholes(S, K, T, r, sigma, optionType);
        const intrinsic = calculateIntrinsicValue(S, K, optionType);
        const timeValue = result.price - intrinsic;
        
        // Update display
        document.getElementById('optionPrice').textContent = '$' + result.price.toFixed(2);
        document.getElementById('intrinsicValue').textContent = '$' + intrinsic.toFixed(2);
        document.getElementById('timeValue').textContent = '$' + timeValue.toFixed(2);
        
        // Update Greeks
        document.getElementById('deltaValue').textContent = result.delta.toFixed(4);
        document.getElementById('gammaValue').textContent = result.gamma.toFixed(4);
        document.getElementById('thetaValue').textContent = result.theta.toFixed(4);
        document.getElementById('vegaValue').textContent = result.vega.toFixed(4);
        document.getElementById('rhoValue').textContent = result.rho.toFixed(4);
        document.getElementById('d1Value').textContent = result.d1.toFixed(4);
        
        // Update chart
        updateChart(currentChartType);
        
    } catch (error) {
        console.error('Error calculating Black-Scholes:', error);
    }
}

// Initialize Chart.js chart
function initializeChart() {
    const ctx = document.getElementById('bsChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Call Price',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
            }, {
                label: 'Put Price',
                data: [],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
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
                tooltip: {
                    enabled: true,
                    mode: 'nearest',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Stock Price'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Option Price ($)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

// Change chart type
function changeChart(type) {
    currentChartType = type;
    updateChart(type);
}

// Update chart based on selected type
function updateChart(type) {
    // Get current input values
    const S = parseFloat(document.getElementById('stockPriceInput').value) || 100;
    const K = parseFloat(document.getElementById('strikePriceInput').value) || 100;
    const T = parseFloat(document.getElementById('timeInput').value) || 1;
    const r = parseFloat(document.getElementById('rateInput').value) / 100 || 0.05;
    const sigma = parseFloat(document.getElementById('volatilityInput').value) / 100 || 0.2;
    
    const numPoints = 100;
    const xValues = [];
    const callPrices = [];
    const putPrices = [];
    
    let xLabel = '';
    
    if (type === 'stock') {
        // Vary stock price
        const minS = K * 0.5;
        const maxS = K * 1.5;
        const step = (maxS - minS) / numPoints;
        
        for (let i = 0; i <= numPoints; i++) {
            const currentS = minS + i * step;
            xValues.push(currentS.toFixed(2));
            
            const callResult = blackScholes(currentS, K, T, r, sigma, 'call');
            const putResult = blackScholes(currentS, K, T, r, sigma, 'put');
            
            callPrices.push(callResult.price);
            putPrices.push(putResult.price);
        }
        xLabel = 'Stock Price ($)';
        
    } else if (type === 'time') {
        // Vary time to expiration
        const maxT = T * 2;
        const step = maxT / numPoints;
        
        for (let i = 1; i <= numPoints; i++) {
            const currentT = i * step;
            xValues.push((currentT * 365).toFixed(0));
            
            const callResult = blackScholes(S, K, currentT, r, sigma, 'call');
            const putResult = blackScholes(S, K, currentT, r, sigma, 'put');
            
            callPrices.push(callResult.price);
            putPrices.push(putResult.price);
        }
        xLabel = 'Time to Expiration (days)';
        
    } else if (type === 'volatility') {
        // Vary volatility
        const minVol = 0.05;
        const maxVol = Math.min(sigma * 3, 1);
        const step = (maxVol - minVol) / numPoints;
        
        for (let i = 0; i <= numPoints; i++) {
            const currentVol = minVol + i * step;
            xValues.push((currentVol * 100).toFixed(1));
            
            const callResult = blackScholes(S, K, T, r, currentVol, 'call');
            const putResult = blackScholes(S, K, T, r, currentVol, 'put');
            
            callPrices.push(callResult.price);
            putPrices.push(putResult.price);
        }
        xLabel = 'Volatility (%)';
    }
    
    // Update chart
    chart.data.labels = xValues;
    chart.data.datasets[0].data = callPrices;
    chart.data.datasets[1].data = putPrices;
    chart.options.scales.x.title.text = xLabel;
    
    chart.update('none');
}
