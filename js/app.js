/**
 * app.js — Main application logic for AI Soil Property Predictor
 */

(function () {
  'use strict';

  let lastResults = null;

  /* ===== Background Canvas Animation ===== */
  function initBackground() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles = [];

    function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * w; this.y = Math.random() * h;
        this.r = Math.random() * 2 + 0.5;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.alpha = Math.random() * 0.4 + 0.1;
      }
      update() {
        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 170, ${this.alpha})`;
        ctx.fill();
      }
    }

    for (let i = 0; i < 60; i++) particles.push(new Particle());

    function animate() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => { p.update(); p.draw(); });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(77, 124, 254, ${0.08 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    }
    animate();
  }

  /* ===== Slider Sync ===== */
  function syncSliders() {
    const pairs = [
      ['sptSlider', 'sptValue'], ['moistureSlider', 'moistureValue'],
      ['llSlider', 'llValue'], ['plSlider', 'plValue'],
      ['densitySlider', 'densityValue'], ['voidSlider', 'voidValue'],
      ['d10Slider', 'd10Value'], ['depthSlider', 'depthValue'],
      ['widthSlider', 'widthValue'], ['loadSlider', 'loadValue'],
    ];
    pairs.forEach(([sliderId, numberId]) => {
      const slider = document.getElementById(sliderId);
      const number = document.getElementById(numberId);
      if (!slider || !number) return;
      slider.addEventListener('input', () => { number.value = slider.value; onLoadChange(); });
      number.addEventListener('input', () => {
        let v = parseFloat(number.value);
        if (!isNaN(v)) { v = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), v)); slider.value = v; }
        onLoadChange();
      });
    });
  }

  function onLoadChange() {
    if (lastResults && document.getElementById('loadSlider')) {
      const maxLoad = parseFloat(document.getElementById('loadValue').value);
      SoilCharts.updateSettlement(lastResults, maxLoad);
    }
  }

  /* ===== Read Inputs ===== */
  function getInputs() {
    return [
      parseInt(document.getElementById('soilType').value),
      parseFloat(document.getElementById('sptValue').value),
      parseFloat(document.getElementById('moistureValue').value),
      parseFloat(document.getElementById('llValue').value),
      parseFloat(document.getElementById('plValue').value),
      parseFloat(document.getElementById('densityValue').value),
      parseFloat(document.getElementById('voidValue').value),
      parseFloat(document.getElementById('d10Value').value),
      parseFloat(document.getElementById('depthValue').value),
      parseFloat(document.getElementById('widthValue').value),
    ];
  }

  /* ===== Display Results ===== */
  function displayResults(results) {
    lastResults = results;
    document.getElementById('resultsSection').classList.remove('hidden');

    setTimeout(() => {
      document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // Values
    animateValue('valShear', results.shearStrength, 1, ' kPa');
    animateValue('valBearing', results.bearingCapacity, 1, ' kPa');
    document.getElementById('valPerm').textContent = results.permeability.toExponential(2);
    animateValue('valFriction', results.frictionAngle, 1, '°');
    animateValue('valCohesion', results.cohesion, 1, ' kPa');
    animateValue('valCc', results.compressionIndex, 3, '');

    // Progress bars
    animateBar('barShear', results.shearStrength / 300 * 100);
    animateBar('barBearing', results.bearingCapacity / 600 * 100);
    animateBar('barPerm', Math.min(100, Math.max(0, (Math.log10(results.permeability) + 10) / 8 * 100)));
    animateBar('barFriction', results.frictionAngle / 45 * 100);
    animateBar('barCohesion', results.cohesion / 200 * 100);
    animateBar('barCc', results.compressionIndex / 0.8 * 100);

    updateClassification(results);
    updateFoundationRecommendation(results);
    SoilCharts.update(results);

    // Settlement
    const maxLoad = parseFloat(document.getElementById('loadValue').value);
    SoilCharts.updateSettlement(results, maxLoad);

    // Analytics
    showAnalytics();

    // Simulation
    showSimulation(results);
  }

  function animateValue(elemId, target, decimals, suffix) {
    const elem = document.getElementById(elemId);
    const duration = 800, start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      elem.textContent = (target * eased).toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function animateBar(elemId, pct) {
    const bar = document.getElementById(elemId);
    pct = Math.min(100, Math.max(0, pct));
    setTimeout(() => { bar.style.width = pct + '%'; }, 200);
  }

  /* ===== Classification ===== */
  function updateClassification(results) {
    const soilType = parseInt(document.getElementById('soilType').value);
    const LL = parseFloat(document.getElementById('llValue').value);
    const PL = parseFloat(document.getElementById('plValue').value);
    const w = parseFloat(document.getElementById('moistureValue').value);
    const N = parseFloat(document.getElementById('sptValue').value);
    const PI = LL - PL;
    const LI = PI > 0 ? (w - PL) / PI : 0;

    const groups = ['Clay (C)', 'Silt (M)', 'Sand (S)', 'Gravel (G)'];
    document.getElementById('classGroup').textContent = groups[soilType] || '—';
    document.getElementById('classPI').textContent = PI.toFixed(1) + '%';
    document.getElementById('classLI').textContent = LI.toFixed(2);

    let activity = 'Normal';
    if (PI < 7) activity = 'Inactive';
    else if (PI > 25) activity = 'Active';
    document.getElementById('classActivity').textContent = activity;

    let consistency;
    if (N < 2) consistency = 'Very Soft';
    else if (N < 4) consistency = 'Soft';
    else if (N < 8) consistency = 'Medium';
    else if (N < 15) consistency = 'Stiff';
    else if (N < 30) consistency = 'Very Stiff';
    else consistency = 'Hard';
    document.getElementById('classConsistency').textContent = consistency;

    let relDensity;
    if (N < 4) relDensity = 'Very Loose';
    else if (N < 10) relDensity = 'Loose';
    else if (N < 30) relDensity = 'Medium Dense';
    else if (N < 50) relDensity = 'Dense';
    else relDensity = 'Very Dense';
    document.getElementById('classDensity').textContent = relDensity;
  }

  /* ===== Foundation Recommendation ===== */
  function updateFoundationRecommendation(results) {
    const su = results.shearStrength;
    const qa = results.bearingCapacity;
    const card = document.getElementById('recCard');
    const icon = document.getElementById('recIcon');
    const type = document.getElementById('recType');
    const desc = document.getElementById('recDesc');
    const meter = document.getElementById('strengthMeter');
    const marker = document.getElementById('strengthMarker');

    // Remove old classes
    card.classList.remove('strength-weak', 'strength-moderate', 'strength-strong');

    // Strength percentage (0-100)
    const strengthPct = Math.min(100, Math.max(0, (su / 250) * 100));
    meter.style.width = strengthPct + '%';
    marker.style.left = strengthPct + '%';

    let safetyFactor, maxDepth;

    if (su < 50) {
      // WEAK SOIL
      card.classList.add('strength-weak');
      icon.textContent = '🔩';
      type.textContent = '🔴 Deep Foundation (Pile)';
      desc.textContent = 'The soil has low shear strength and insufficient bearing capacity for shallow foundations. ' +
        'Pile foundations (driven or bored) are recommended to transfer loads to deeper, competent strata. ' +
        'Consider end-bearing piles if bedrock is accessible, or friction piles for deep soft deposits.';
      safetyFactor = (qa / 100).toFixed(1);
      maxDepth = '15–30 m (pile depth)';
    } else if (su < 150) {
      // MODERATE SOIL
      card.classList.add('strength-moderate');
      icon.textContent = '🏢';
      type.textContent = '🟡 Raft / Combined Foundation';
      desc.textContent = 'Moderate soil strength supports medium-load structures with raft or combined footings. ' +
        'A raft foundation distributes loads over the entire building footprint, reducing differential settlement. ' +
        'Combined footings are suitable when columns are closely spaced or near property boundaries.';
      safetyFactor = (qa / 80).toFixed(1);
      maxDepth = '2–5 m';
    } else {
      // STRONG SOIL
      card.classList.add('strength-strong');
      icon.textContent = '🏠';
      type.textContent = '🟢 Shallow Foundation';
      desc.textContent = 'Strong soil with high shear strength is ideal for isolated or strip footings. ' +
        'Shallow foundations are cost-effective and suitable for low to mid-rise structures. ' +
        'Ensure the foundation depth is below frost line and topsoil layers for optimal performance.';
      safetyFactor = (qa / 60).toFixed(1);
      maxDepth = '1–3 m';
    }

    document.getElementById('recShear').textContent = su.toFixed(1) + ' kPa';
    document.getElementById('recBearing').textContent = qa.toFixed(1) + ' kPa';
    document.getElementById('recSafety').textContent = safetyFactor;
    document.getElementById('recDepth').textContent = maxDepth;
  }

  /* ===== Analytics Dashboard ===== */
  function showAnalytics() {
    const metrics = SoilModel.computeMetrics();
    if (!metrics) return;

    document.getElementById('analyticsSection').classList.remove('hidden');

    // R² ring
    const r2Pct = metrics.r2 * 100;
    document.getElementById('metricR2Val').textContent = (metrics.r2).toFixed(3);
    const ring = document.getElementById('ringR2');
    if (ring) {
      const circumference = 2 * Math.PI * 52; // ~326.7
      ring.style.strokeDashoffset = circumference * (1 - metrics.r2);
    }

    // MAE, MSE, RMSE
    document.getElementById('metricMAEVal').textContent = metrics.mae.toFixed(2);
    document.getElementById('metricMSEVal').textContent = metrics.mse.toFixed(2);
    document.getElementById('metricRMSEVal').textContent = metrics.rmse.toFixed(2);

    // Charts
    SoilCharts.updateAnalytics(metrics);
  }

  /* ===== Simulation ===== */
  function showSimulation(results) {
    document.getElementById('simulationSection').classList.remove('hidden');
    SoilSimulation.init('simCanvas');
    SoilSimulation.setSoilParams(results);
    SoilSimulation.start();

    // Simulation load slider
    const simSlider = document.getElementById('simLoadSlider');
    const simLabel = document.getElementById('simLoadLabel');
    if (simSlider && !simSlider._bound) {
      simSlider._bound = true;
      simSlider.addEventListener('input', () => {
        const v = parseInt(simSlider.value);
        simLabel.textContent = v + '%';
        SoilSimulation.setLoad(v / 100);
      });
    }
  }

  /* ===== Predict Button ===== */
  function setupPredictButton() {
    document.getElementById('predictBtn').addEventListener('click', () => {
      const btn = document.getElementById('predictBtn');
      btn.classList.add('loading');
      btn.disabled = true;
      setTimeout(() => {
        try {
          const inputs = getInputs();
          const results = SoilModel.predict(inputs);
          displayResults(results);
        } catch (err) {
          console.error('Prediction error:', err);
          alert('Prediction failed. Please check your inputs.');
        }
        btn.classList.remove('loading');
        btn.disabled = false;
      }, 600);
    });
  }

  /* ===== Info Toggle ===== */
  function setupInfoToggle() {
    document.getElementById('infoToggle').addEventListener('click', function () {
      this.classList.toggle('open');
      document.getElementById('infoBody').classList.toggle('open');
    });
  }

  /* ===== Model Training ===== */
  async function trainModel() {
    const progressFill = document.getElementById('progressFill');
    const statusText = document.getElementById('loadingStatus');
    const epochText = document.getElementById('loadingEpoch');

    try {
      const finalLoss = await SoilModel.train((pct, msg, epoch, total) => {
        progressFill.style.width = pct + '%';
        statusText.textContent = msg;
        if (epoch !== undefined) epochText.textContent = `Epoch ${epoch} / ${total}`;
      });

      document.getElementById('statAccuracy').textContent = finalLoss;
      document.getElementById('loadingOverlay').classList.add('hidden');
      document.getElementById('predictBtn').disabled = false;
      document.getElementById('predictHint').classList.add('hidden');
    } catch (err) {
      console.error('Training failed:', err);
      document.getElementById('loadingStatus').textContent = 'Training failed. Please refresh.';
    }
  }

  /* ===== Init ===== */
  function init() {
    initBackground();
    syncSliders();
    setupPredictButton();
    setupInfoToggle();
    trainModel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
