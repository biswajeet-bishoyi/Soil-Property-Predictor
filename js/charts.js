/**
 * charts.js — Chart.js visualizations for soil prediction results
 */

const SoilCharts = (() => {
  let radarChart = null;
  let barChart = null;
  let scatterChart = null;
  let lossChart = null;
  let settlementChart = null;

  const C = {
    teal: 'rgba(0, 212, 170, 1)',
    tealFaded: 'rgba(0, 212, 170, 0.15)',
    blue: 'rgba(77, 124, 254, 1)',
    blueFaded: 'rgba(77, 124, 254, 0.15)',
    purple: 'rgba(168, 85, 247, 1)',
    orange: 'rgba(249, 115, 22, 1)',
    red: 'rgba(239, 68, 68, 1)',
    green: 'rgba(34, 197, 94, 1)',
    grid: 'rgba(255, 255, 255, 0.06)',
    textMuted: 'rgba(136, 146, 168, 0.8)',
  };

  const tooltipStyle = {
    backgroundColor: 'rgba(12, 16, 32, 0.9)',
    titleColor: '#e8ecf4',
    bodyColor: '#8892a8',
    borderColor: 'rgba(77, 124, 254, 0.3)',
    borderWidth: 1, cornerRadius: 8, padding: 12
  };

  const radarMaxes = { shear: 300, bearing: 600, friction: 45, cohesion: 200, cc: 0.8 };

  function safeDestroy(chart) { if (chart) chart.destroy(); return null; }

  function createRadarChart(canvasId, results) {
    radarChart = safeDestroy(radarChart);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    const permNorm = Math.min(100, Math.max(0, (Math.log10(results.permeability) + 10) / 8 * 100));
    const data = [
      (results.shearStrength / radarMaxes.shear) * 100,
      (results.bearingCapacity / radarMaxes.bearing) * 100,
      permNorm,
      (results.frictionAngle / radarMaxes.friction) * 100,
      (results.cohesion / radarMaxes.cohesion) * 100,
      (results.compressionIndex / radarMaxes.cc) * 100
    ].map(v => Math.min(100, Math.max(0, v)));

    radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Shear\nStrength', 'Bearing\nCapacity', 'Permeability', 'Friction\nAngle', 'Cohesion', 'Compression\nIndex'],
        datasets: [{
          label: 'Predicted Properties',
          data: data,
          backgroundColor: C.tealFaded,
          borderColor: C.teal,
          borderWidth: 2,
          pointBackgroundColor: C.teal,
          pointBorderColor: '#fff',
          pointBorderWidth: 1, pointRadius: 4, pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false }, tooltip: tooltipStyle },
        scales: {
          r: {
            beginAtZero: true, max: 100,
            ticks: { stepSize: 25, color: C.textMuted, backdropColor: 'transparent', font: { size: 10 } },
            grid: { color: C.grid }, angleLines: { color: C.grid },
            pointLabels: { color: '#e8ecf4', font: { size: 11, weight: '500' } }
          }
        }
      }
    });
  }

  function createBarChart(canvasId, results) {
    barChart = safeDestroy(barChart);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    const labels = ['Shear (kPa)', 'Bearing (kPa)', 'Friction (°)', 'Cohesion (kPa)', 'Cc'];
    const predicted = [results.shearStrength, results.bearingCapacity, results.frictionAngle, results.cohesion, results.compressionIndex * 100];
    const typicalMid = [150, 300, 30, 80, 0.3 * 100];

    barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Predicted', data: predicted,
            backgroundColor: [C.teal.replace('1)', '0.7)'), C.blue.replace('1)', '0.7)'), C.purple.replace('1)', '0.7)'), C.orange.replace('1)', '0.7)'), 'rgba(236,72,153,0.7)'],
            borderColor: [C.teal, C.blue, C.purple, C.orange, 'rgba(236,72,153,1)'],
            borderWidth: 1, borderRadius: 6, borderSkipped: false
          },
          {
            label: 'Typical Midpoint', data: typicalMid,
            backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)',
            borderWidth: 1, borderRadius: 6, borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { labels: { color: '#e8ecf4', font: { size: 11 }, boxWidth: 12, padding: 16 } }, tooltip: tooltipStyle },
        scales: {
          x: { ticks: { color: C.textMuted, font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: C.textMuted, font: { size: 10 } }, grid: { color: C.grid }, beginAtZero: true }
        }
      }
    });
  }

  /* --- Actual vs Predicted Scatter --- */
  function createScatterChart(canvasId, actualShear, predShear) {
    scatterChart = safeDestroy(scatterChart);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    const scatterData = actualShear.map((a, i) => ({ x: a, y: predShear[i] }));
    const maxVal = Math.max(...actualShear, ...predShear) * 1.1;

    scatterChart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Actual vs Predicted',
            data: scatterData,
            backgroundColor: C.teal.replace('1)', '0.5)'),
            borderColor: C.teal,
            borderWidth: 1, pointRadius: 3.5, pointHoverRadius: 6
          },
          {
            label: 'Perfect Prediction',
            data: [{ x: 0, y: 0 }, { x: maxVal, y: maxVal }],
            type: 'line',
            borderColor: C.red.replace('1)', '0.5)'),
            borderWidth: 2, borderDash: [6, 4],
            pointRadius: 0, fill: false
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: {
          legend: { labels: { color: '#e8ecf4', font: { size: 11 }, boxWidth: 12, padding: 16 } },
          tooltip: { ...tooltipStyle, callbacks: { label: (ctx) => `Actual: ${ctx.parsed.x.toFixed(1)}, Pred: ${ctx.parsed.y.toFixed(1)}` } }
        },
        scales: {
          x: { title: { display: true, text: 'Actual Shear Strength (kPa)', color: C.textMuted, font: { size: 11 } }, ticks: { color: C.textMuted }, grid: { color: C.grid }, min: 0 },
          y: { title: { display: true, text: 'Predicted Shear Strength (kPa)', color: C.textMuted, font: { size: 11 } }, ticks: { color: C.textMuted }, grid: { color: C.grid }, min: 0 }
        }
      }
    });
  }

  /* --- Training Loss Curve --- */
  function createLossChart(canvasId, trainLoss, valLoss) {
    lossChart = safeDestroy(lossChart);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    const labels = trainLoss.map((_, i) => i + 1);

    lossChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Training Loss', data: trainLoss,
            borderColor: C.teal, backgroundColor: C.tealFaded,
            borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3
          },
          {
            label: 'Validation Loss', data: valLoss,
            borderColor: C.orange, backgroundColor: 'rgba(249,115,22,0.08)',
            borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { labels: { color: '#e8ecf4', font: { size: 11 }, boxWidth: 12, padding: 16 } }, tooltip: tooltipStyle },
        scales: {
          x: { title: { display: true, text: 'Epoch', color: C.textMuted, font: { size: 11 } }, ticks: { color: C.textMuted, maxTicksLimit: 10 }, grid: { color: C.grid } },
          y: { title: { display: true, text: 'Loss (MSE)', color: C.textMuted, font: { size: 11 } }, ticks: { color: C.textMuted }, grid: { color: C.grid }, beginAtZero: true }
        }
      }
    });
  }

  /* --- Settlement Simulation --- */
  function createSettlementChart(canvasId, results, maxLoad) {
    settlementChart = safeDestroy(settlementChart);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    // Compute settlement using elastic settlement formula: S = q*B*(1-v²)/(E*Ip)
    // Simplified: use Cc, e, depth, bearing capacity for settlement estimate
    const Cc = results.compressionIndex;
    const e0 = parseFloat(document.getElementById('voidValue')?.value || 0.65);
    const H = parseFloat(document.getElementById('depthValue')?.value || 5);
    const sigma0 = parseFloat(document.getElementById('densityValue')?.value || 17) * H;

    const steps = 20;
    const loads = [];
    const settlements = [];
    const elasticSettlements = [];

    for (let i = 0; i <= steps; i++) {
      const q = (maxLoad / steps) * i;
      loads.push(q);

      // Consolidation settlement: S = Cc * H / (1+e0) * log10((sigma0 + q) / sigma0)
      const Sc = Cc * (H * 1000) / (1 + e0) * Math.log10((sigma0 + q) / sigma0);

      // Elastic/immediate settlement: Se = q * B / (Es) where Es ~ 500*su
      const Es = 500 * results.shearStrength;
      const B = parseFloat(document.getElementById('widthValue')?.value || 2);
      const Se = (q * B * 1000) / Es * 0.8; // mm

      settlements.push(Sc + Se);
      elasticSettlements.push(Se);
    }

    settlementChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: loads.map(l => l.toFixed(0)),
        datasets: [
          {
            label: 'Total Settlement (mm)', data: settlements,
            borderColor: C.teal, backgroundColor: C.tealFaded,
            borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: C.teal,
            fill: true, tension: 0.4
          },
          {
            label: 'Immediate Settlement (mm)', data: elasticSettlements,
            borderColor: C.purple, backgroundColor: 'rgba(168,85,247,0.08)',
            borderWidth: 2, pointRadius: 2, borderDash: [5, 3],
            fill: true, tension: 0.4
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: {
          legend: { labels: { color: '#e8ecf4', font: { size: 11 }, boxWidth: 12, padding: 16 } },
          tooltip: { ...tooltipStyle, callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} mm` } }
        },
        scales: {
          x: { title: { display: true, text: 'Applied Load (kPa)', color: C.textMuted, font: { size: 11 } }, ticks: { color: C.textMuted, maxTicksLimit: 10 }, grid: { color: C.grid } },
          y: { title: { display: true, text: 'Settlement (mm)', color: C.textMuted, font: { size: 11 } }, ticks: { color: C.textMuted }, grid: { color: C.grid }, beginAtZero: true, reverse: true }
        }
      }
    });
  }

  function update(results) {
    createRadarChart('radarChart', results);
    createBarChart('barChart', results);
  }

  function updateAnalytics(metrics) {
    createScatterChart('scatterChart', metrics.actualShear, metrics.predShear);
    createLossChart('lossChart', metrics.trainingLoss, metrics.valLoss);
  }

  function updateSettlement(results, maxLoad) {
    createSettlementChart('settlementChart', results, maxLoad);
  }

  return { update, updateAnalytics, updateSettlement };
})();
