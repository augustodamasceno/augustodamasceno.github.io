// Interest Calculator Application

class InterestCalculator {
  constructor() {
    this.charts = {};
    this.initializeEventListeners();
    this.calculate();
  }

  initializeEventListeners() {
    const inputs = document.querySelectorAll('.ic-input');
    inputs.forEach(input => {
      input.addEventListener('change', () => this.calculate());
      input.addEventListener('input', () => this.calculate());
    });

    document.getElementById('depositGrowthSelect').addEventListener('change', (e) => {
      const container = document.getElementById('growthRateContainer');
      if (e.target.value !== 'none') {
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
      this.calculate();
    });

    document.getElementById('autoCalculateSelect').addEventListener('change', (e) => {
      const container = document.getElementById('targetAmountContainer');
      if (e.target.value !== 'none') {
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
      this.calculate();
    });
  }

  getInputValues() {
    return {
      initialAmount: parseFloat(document.getElementById('initialAmountInput').value) || 0,
      interestRate: parseFloat(document.getElementById('interestRateInput').value) || 0,
      periods: parseInt(document.getElementById('periodsInput').value) || 1,
      depositAmount: parseFloat(document.getElementById('depositAmountInput').value) || 0,
      depositGrowth: document.getElementById('depositGrowthSelect').value,
      growthRate: parseFloat(document.getElementById('growthRateInput').value) || 0,
      autoCalculate: document.getElementById('autoCalculateSelect').value,
      targetAmount: parseFloat(document.getElementById('targetAmountInput').value) || 0
    };
  }

  calculateDepositAmount(period, baseAmount, growthType, growthRate) {
    if (growthType === 'none') {
      return baseAmount;
    }

    if (growthType === 'linear') {
      return baseAmount * (1 + (growthRate / 100) * (period - 1));
    }

    if (growthType === 'exponential') {
      return baseAmount * Math.pow(1 + growthRate / 100, period - 1);
    }

    return baseAmount;
  }

  simulateCalculation(values) {
    const periods = [];
    let balance = values.initialAmount;
    let totalDeposits = 0;

    for (let period = 1; period <= values.periods; period++) {
      const deposit = this.calculateDepositAmount(
        period,
        values.depositAmount,
        values.depositGrowth,
        values.growthRate
      );

      const beginningBalance = balance;
      let interestEarned = 0;

      interestEarned = beginningBalance * (values.interestRate / 100);
      balance = beginningBalance + interestEarned + deposit;

      totalDeposits += deposit;

      periods.push({
        period,
        deposit,
        beginningBalance,
        interestEarned,
        endingBalance: balance
      });
    }

    const finalAmount = balance;
    const totalInterestEarned = finalAmount - values.initialAmount - totalDeposits;

    return {
      periods,
      finalAmount,
      totalInterestEarned,
      totalDeposits
    };
  }

  calculateAutoValue(values, result) {
    const { autoCalculate, targetAmount } = values;

    if (autoCalculate === 'none') {
      return null;
    }

    if (autoCalculate === 'initialAmount') {
      return this.solveForInitialAmount(values, result, targetAmount);
    }

    if (autoCalculate === 'interestRate') {
      return this.solveForInterestRate(values, result, targetAmount);
    }

    if (autoCalculate === 'periods') {
      return this.solveForPeriods(values, result, targetAmount);
    }

    if (autoCalculate === 'depositAmount') {
      return this.solveForDepositAmount(values, result, targetAmount);
    }

    return null;
  }

  solveForInitialAmount(values, result, target) {
    let low = 0, high = target * 2;
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      const testValues = { ...values, initialAmount: mid };
      const testResult = this.simulateCalculation(testValues);
      if (testResult.finalAmount < target) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return (low + high) / 2;
  }

  solveForInterestRate(values, result, target) {
    let low = 0, high = 100;
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      const testValues = { ...values, interestRate: mid };
      const testResult = this.simulateCalculation(testValues);
      if (testResult.finalAmount < target) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return (low + high) / 2;
  }

  solveForPeriods(values, result, target) {
    let periods = 1;
    while (periods <= 10000) {
      const testValues = { ...values, periods };
      const testResult = this.simulateCalculation(testValues);
      if (testResult.finalAmount >= target) {
        return periods;
      }
      periods++;
    }
    return periods;
  }

  solveForDepositAmount(values, result, target) {
    let low = 0, high = target;
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      const testValues = { ...values, depositAmount: mid };
      const testResult = this.simulateCalculation(testValues);
      if (testResult.finalAmount < target) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return (low + high) / 2;
  }

  calculate() {
    const values = this.getInputValues();
    const result = this.simulateCalculation(values);

    // Update results display
    document.getElementById('finalAmount').textContent = this.formatCurrency(result.finalAmount);
    document.getElementById('interestEarned').textContent = this.formatCurrency(result.totalInterestEarned);
    document.getElementById('totalDeposits').textContent = this.formatCurrency(result.totalDeposits);

    // Handle auto-calculation
    const autoValue = this.calculateAutoValue(values, result);
    this.updateAutoCalculationDisplay(values.autoCalculate, autoValue);

    // Update table
    this.updateTable(result.periods);

    // Update charts
    this.updateCharts(result.periods, values.depositGrowth);
  }

  updateAutoCalculationDisplay(autoCalcType, autoValue) {
    const container = document.getElementById('autoCalcResultContainer');

    if (autoCalcType === 'none' || autoValue === null) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    const resultElement = document.getElementById('autoCalcResult');
    const labelElement = document.getElementById('autoCalcLabel');
    const unitElement = document.getElementById('autoCalcUnit');

    switch (autoCalcType) {
      case 'initialAmount':
        labelElement.textContent = 'Required Initial Amount';
        resultElement.textContent = this.formatCurrency(autoValue);
        unitElement.textContent = 'To reach target';
        break;
      case 'interestRate':
        labelElement.textContent = 'Required Interest Rate';
        resultElement.textContent = autoValue.toFixed(2);
        unitElement.textContent = '% per period';
        break;
      case 'periods':
        labelElement.textContent = 'Required Periods';
        resultElement.textContent = Math.ceil(autoValue).toString();
        unitElement.textContent = 'periods needed';
        break;
      case 'depositAmount':
        labelElement.textContent = 'Required Deposit Amount';
        resultElement.textContent = this.formatCurrency(autoValue);
        unitElement.textContent = 'per period';
        break;
    }
  }

  updateTable(periods) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    periods.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.period}</td>
        <td>${this.formatCurrency(row.deposit)}</td>
        <td>${this.formatCurrency(row.beginningBalance)}</td>
        <td>${this.formatCurrency(row.interestEarned)}</td>
        <td><strong>${this.formatCurrency(row.endingBalance)}</strong></td>
      `;
      tbody.appendChild(tr);
    });
  }

  updateCharts(periods, depositGrowth) {
    this.updateTotalAmountChart(periods);
    
    if (depositGrowth !== 'none') {
      this.updateDepositGrowthChart(periods);
      document.getElementById('depositGrowthChartContainer').style.display = 'block';
    } else {
      document.getElementById('depositGrowthChartContainer').style.display = 'none';
    }
  }

  updateTotalAmountChart(periods) {
    const ctx = document.getElementById('totalAmountChart').getContext('2d');
    
    const labels = periods.map(p => `Period ${p.period}`);
    const endingBalances = periods.map(p => p.endingBalance);

    if (this.charts.totalAmount) {
      this.charts.totalAmount.destroy();
    }

    this.charts.totalAmount = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total Amount',
          data: endingBalances,
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#007bff',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => this.formatCurrency(value)
            }
          }
        }
      }
    });
  }

  updateDepositGrowthChart(periods) {
    const ctx = document.getElementById('depositGrowthChart').getContext('2d');
    
    const labels = periods.map(p => `Period ${p.period}`);
    const deposits = periods.map(p => p.deposit);

    if (this.charts.depositGrowth) {
      this.charts.depositGrowth.destroy();
    }

    this.charts.depositGrowth = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Periodic Deposit Amount',
          data: deposits,
          backgroundColor: '#28a745',
          borderColor: '#1e7e34',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => this.formatCurrency(value)
            }
          }
        }
      }
    });
  }

  formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }
}

// Initialize calculator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new InterestCalculator();
});
