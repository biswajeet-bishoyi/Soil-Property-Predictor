/**
 * simulation.js — Interactive Soil Cross-Section Canvas Simulation
 * Visualizes foundation loading, stress distribution, soil compression,
 * water table, and particle behavior in real-time.
 */

const SoilSimulation = (() => {
  let canvas, ctx, W, H;
  let animId = null;
  let active = false;

  // State
  let appliedLoad = 0;         // 0–1 normalized
  let targetLoad = 0;
  let foundationY = 0;
  let targetFoundationY = 0;
  let particles = [];
  let waterParticles = [];
  let stressBulbOpacity = 0;
  let time = 0;
  let soilParams = null;

  // Layout constants (relative to canvas)
  const SKY_H = 0.08;
  const FOUND_W = 0.18;
  const FOUND_H = 0.04;
  const FOUND_TOP = 0.12;
  const LAYER_STARTS = [0.16, 0.35, 0.55, 0.75, 0.88]; // topsoil, clay, sand, gravel, bedrock
  const WATER_TABLE = 0.48;

  // Colors
  const COLORS = {
    sky: '#0b1024',
    skyGrad: '#131b3a',
    grass: '#1a4a2e',
    topsoil: '#3d2b1f',
    clay: '#5c4033',
    sand: '#c2a366',
    gravel: '#7a7a7a',
    bedrock: '#4a4a5a',
    foundation: '#6b7b8d',
    foundationTop: '#8899aa',
    concrete: '#9aacbd',
    water: 'rgba(30, 120, 220, 0.25)',
    waterParticle: 'rgba(80, 180, 255, 0.6)',
    stressBulb: 'rgba(255, 80, 60, VAR)',
    load: '#ef4444',
    arrow: '#f97316',
    text: '#e8ecf4',
    textMuted: '#8892a8',
    grid: 'rgba(255,255,255,0.04)',
  };

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    generateParticles();
    generateWaterParticles();
  }

  function resize() {
    const container = canvas.parentElement;
    W = canvas.width = container.clientWidth;
    H = canvas.height = Math.min(520, Math.max(380, container.clientWidth * 0.55));
    generateParticles();
    generateWaterParticles();
  }

  function generateParticles() {
    particles = [];
    const count = Math.floor(W * H / 600);
    for (let i = 0; i < count; i++) {
      const y = (LAYER_STARTS[0] + Math.random() * (1 - LAYER_STARTS[0])) * H;
      particles.push({
        x: Math.random() * W,
        y: y,
        baseY: y,
        r: Math.random() * 2.5 + 1,
        layer: getLayerAtY(y / H),
        offsetPhase: Math.random() * Math.PI * 2,
        color: getParticleColor(getLayerAtY(y / H)),
      });
    }
  }

  function generateWaterParticles() {
    waterParticles = [];
    const count = Math.floor(W / 12);
    for (let i = 0; i < count; i++) {
      waterParticles.push({
        x: Math.random() * W,
        y: WATER_TABLE * H + Math.random() * (1 - WATER_TABLE) * H * 0.4,
        vx: (Math.random() - 0.3) * 0.5,
        vy: 0,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.2,
      });
    }
  }

  function getLayerAtY(yNorm) {
    if (yNorm < LAYER_STARTS[1]) return 0; // topsoil
    if (yNorm < LAYER_STARTS[2]) return 1; // clay
    if (yNorm < LAYER_STARTS[3]) return 2; // sand
    if (yNorm < LAYER_STARTS[4]) return 3; // gravel
    return 4; // bedrock
  }

  function getParticleColor(layer) {
    const colors = [
      ['#5a3d2b', '#6b4e3a', '#4a2d1b'],
      ['#7a5a43', '#8b6b54', '#6a4a33'],
      ['#d4b878', '#c4a868', '#e4c888'],
      ['#8a8a8a', '#9a9a9a', '#7a7a7a'],
      ['#5a5a6a', '#6a6a7a', '#4a4a5a'],
    ];
    const c = colors[layer];
    return c[Math.floor(Math.random() * c.length)];
  }

  function setLoad(normalizedLoad) {
    targetLoad = Math.max(0, Math.min(1, normalizedLoad));
  }

  function setSoilParams(params) {
    soilParams = params;
  }

  function start() {
    if (active) return;
    active = true;
    animate();
  }

  function stop() {
    active = false;
    if (animId) cancelAnimationFrame(animId);
  }

  /* ===== DRAWING ===== */

  function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, SKY_H * H);
    grad.addColorStop(0, COLORS.sky);
    grad.addColorStop(1, COLORS.skyGrad);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, FOUND_TOP * H);
  }

  function drawGrass() {
    const y = FOUND_TOP * H - 4;
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, y, W, 8);

    // Grass blades
    ctx.strokeStyle = '#2d6b42';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < W; x += 6) {
      const h = 4 + Math.sin(x * 0.3 + time * 2) * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(time + x * 0.1) * 2, y - h);
      ctx.stroke();
    }
  }

  function drawSoilLayers() {
    const layers = [
      { start: LAYER_STARTS[0], end: LAYER_STARTS[1], color: COLORS.topsoil, name: 'Topsoil' },
      { start: LAYER_STARTS[1], end: LAYER_STARTS[2], color: COLORS.clay, name: 'Clay' },
      { start: LAYER_STARTS[2], end: LAYER_STARTS[3], color: COLORS.sand, name: 'Sand' },
      { start: LAYER_STARTS[3], end: LAYER_STARTS[4], color: COLORS.gravel, name: 'Gravel' },
      { start: LAYER_STARTS[4], end: 1.0, color: COLORS.bedrock, name: 'Bedrock' },
    ];

    layers.forEach((layer, i) => {
      const y1 = layer.start * H;
      const y2 = layer.end * H;

      // Compression effect — layers above stress point compress more
      const compression = appliedLoad * (i < 3 ? (3 - i) * 2 : 0);

      const grad = ctx.createLinearGradient(0, y1, 0, y2);
      grad.addColorStop(0, layer.color);
      grad.addColorStop(1, adjustBrightness(layer.color, -15));
      ctx.fillStyle = grad;
      ctx.fillRect(0, y1 + compression, W, y2 - y1);

      // Layer boundary line
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(0, y1 + compression);
        ctx.lineTo(W, y1 + compression);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Layer label
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = `500 ${Math.max(10, W * 0.012)}px Inter, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(layer.name, W - 12, y1 + 18 + compression);
    });
  }

  function drawWaterTable() {
    const y = WATER_TABLE * H;

    // Water fill
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(0, y, W, H - y);

    // Water table line
    ctx.strokeStyle = 'rgba(30, 120, 220, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = 'rgba(80, 180, 255, 0.7)';
    ctx.font = `500 ${Math.max(10, W * 0.011)}px Inter, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('▼ Water Table', 12, y - 6);

    // Animated water particles
    waterParticles.forEach(p => {
      p.x += p.vx + (appliedLoad > 0.1 ? Math.sin(time * 3 + p.y * 0.05) * 0.3 * appliedLoad : 0);
      p.y += Math.sin(time * 2 + p.x * 0.02) * 0.15;
      if (p.x > W + 5) p.x = -5;
      if (p.x < -5) p.x = W + 5;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(80, 180, 255, ${p.alpha})`;
      ctx.fill();
    });
  }

  function drawFoundation() {
    const fw = FOUND_W * W;
    const fh = FOUND_H * H;
    const fx = (W - fw) / 2;
    const fy = FOUND_TOP * H - fh + foundationY;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(fx + 4, fy + 4, fw, fh);

    // Foundation body
    const grad = ctx.createLinearGradient(fx, fy, fx, fy + fh);
    grad.addColorStop(0, COLORS.foundationTop);
    grad.addColorStop(0.5, COLORS.foundation);
    grad.addColorStop(1, adjustBrightness(COLORS.foundation, -20));
    ctx.fillStyle = grad;
    ctx.fillRect(fx, fy, fw, fh);

    // Texture lines
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const lx = fx + fw * (0.2 + i * 0.2);
      ctx.beginPath();
      ctx.moveTo(lx, fy + 2);
      ctx.lineTo(lx, fy + fh - 2);
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.max(11, W * 0.013)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('FOUNDATION', fx + fw / 2, fy + fh / 2 + 4);

    // Load arrows
    if (appliedLoad > 0.01) {
      const arrowCount = Math.floor(3 + appliedLoad * 4);
      const spacing = fw / (arrowCount + 1);
      const arrowLen = 15 + appliedLoad * 25;

      for (let i = 1; i <= arrowCount; i++) {
        const ax = fx + spacing * i;
        const ay = fy - arrowLen;
        const pulse = Math.sin(time * 4 + i) * 2;

        ctx.strokeStyle = COLORS.arrow;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ax, ay + pulse);
        ctx.lineTo(ax, fy - 2);
        ctx.stroke();

        // Arrowhead
        ctx.fillStyle = COLORS.arrow;
        ctx.beginPath();
        ctx.moveTo(ax, fy - 2);
        ctx.lineTo(ax - 5, fy - 10);
        ctx.lineTo(ax + 5, fy - 10);
        ctx.closePath();
        ctx.fill();
      }

      // Load value
      ctx.fillStyle = COLORS.arrow;
      ctx.font = `700 ${Math.max(12, W * 0.014)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      const loadKpa = soilParams ? (appliedLoad * 300).toFixed(0) : (appliedLoad * 100).toFixed(0);
      ctx.fillText(`${loadKpa} kPa`, fx + fw / 2, fy - arrowLen - 8);
    }
  }

  function drawStressBulb() {
    if (appliedLoad < 0.02) return;

    const cx = W / 2;
    const cy = FOUND_TOP * H + foundationY;
    const fw = FOUND_W * W;

    // Boussinesq-style stress bulb (elliptical)
    const bulbW = fw * (0.8 + appliedLoad * 1.5);
    const bulbH = H * (0.15 + appliedLoad * 0.4);

    // Multiple contour levels
    const levels = [0.9, 0.7, 0.5, 0.3, 0.15];
    levels.forEach((scale, i) => {
      const w = bulbW * scale;
      const h = bulbH * scale;
      const alpha = (0.08 + appliedLoad * 0.12) * (1 - i * 0.15);
      const pulse = 1 + Math.sin(time * 2 + i * 0.5) * 0.02 * appliedLoad;

      ctx.beginPath();
      ctx.ellipse(cx, cy + h * 0.4, w * pulse, h * pulse, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, ${60 + i * 30}, ${40 + i * 20}, ${alpha})`;
      ctx.fill();
    });

    // Stress contour labels
    if (appliedLoad > 0.3) {
      ctx.fillStyle = 'rgba(255, 150, 100, 0.5)';
      ctx.font = `500 ${Math.max(9, W * 0.01)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      const labels = ['0.8q', '0.4q', '0.2q'];
      labels.forEach((label, i) => {
        const labelY = cy + bulbH * [0.2, 0.45, 0.7][i];
        ctx.fillText(label, cx + bulbW * 0.35 * [0.6, 0.45, 0.3][i], labelY);
      });
    }
  }

  function drawParticles() {
    const cx = W / 2;
    const cy = FOUND_TOP * H;

    particles.forEach(p => {
      // Displacement based on proximity to stress zone
      const dx = p.x - cx;
      const dy = p.baseY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.sqrt(W * W + H * H) * 0.5;
      const influence = Math.max(0, 1 - dist / (maxDist * 0.4));

      // Vertical compression
      const compressY = influence * appliedLoad * 8;
      // Lateral spread
      const spreadX = (dx / (Math.abs(dx) + 50)) * influence * appliedLoad * 3;
      // Vibration
      const vibX = Math.sin(time * 5 + p.offsetPhase) * appliedLoad * influence * 1.5;
      const vibY = Math.cos(time * 4 + p.offsetPhase) * appliedLoad * influence * 0.8;

      p.x = p.x + spreadX * 0.02;
      p.y = p.baseY + compressY + vibY;
      const drawX = p.x + vibX;

      // Wrap particles horizontally
      if (p.x > W + 10) p.x -= W + 20;
      if (p.x < -10) p.x += W + 20;

      ctx.beginPath();
      ctx.arc(drawX, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.5 + influence * appliedLoad * 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawDepthScale() {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.font = `400 ${Math.max(9, W * 0.01)}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';

    const depthMax = 15;
    const soilTop = FOUND_TOP * H;
    const soilH = H - soilTop;

    for (let d = 0; d <= depthMax; d += 3) {
      const y = soilTop + (d / depthMax) * soilH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(5, y);
      ctx.stroke();
      ctx.fillText(`${d}m`, 8, y + 3);
    }
  }

  function drawSettlementIndicator() {
    if (appliedLoad < 0.01) return;

    const fx = (W + FOUND_W * W) / 2 + 20;
    const fy1 = FOUND_TOP * H;
    const fy2 = fy1 + foundationY;
    const settlement = foundationY;

    if (settlement < 0.5) return;

    // Settlement line
    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(fx, fy1);
    ctx.lineTo(fx, fy2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow heads
    ctx.fillStyle = '#00d4aa';
    // Top arrow
    ctx.beginPath();
    ctx.moveTo(fx, fy1);
    ctx.lineTo(fx - 4, fy1 + 6);
    ctx.lineTo(fx + 4, fy1 + 6);
    ctx.closePath();
    ctx.fill();
    // Bottom arrow
    ctx.beginPath();
    ctx.moveTo(fx, fy2);
    ctx.lineTo(fx - 4, fy2 - 6);
    ctx.lineTo(fx + 4, fy2 - 6);
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.fillStyle = '#00d4aa';
    ctx.font = `700 ${Math.max(11, W * 0.013)}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`δ = ${settlement.toFixed(1)} mm`, fx + 8, (fy1 + fy2) / 2 + 4);
  }

  function drawInfoOverlay() {
    // Top-left info box
    const pad = 12;
    const bx = pad, by = pad;

    ctx.fillStyle = 'rgba(6, 8, 15, 0.7)';
    ctx.strokeStyle = 'rgba(77, 124, 254, 0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, bx, by, 180, soilParams ? 96 : 50, 8);

    ctx.font = `600 ${Math.max(10, W * 0.011)}px Inter, sans-serif`;
    ctx.fillStyle = '#e8ecf4';
    ctx.textAlign = 'left';
    ctx.fillText('🌍 Soil Cross-Section', bx + 10, by + 18);

    ctx.font = `400 ${Math.max(9, W * 0.01)}px Inter, sans-serif`;
    ctx.fillStyle = '#8892a8';
    ctx.fillText('Drag slider to apply load', bx + 10, by + 36);

    if (soilParams) {
      ctx.fillText(`Shear: ${soilParams.shearStrength.toFixed(0)} kPa`, bx + 10, by + 54);
      ctx.fillText(`Bearing: ${soilParams.bearingCapacity.toFixed(0)} kPa`, bx + 10, by + 70);
      ctx.fillText(`Perm: ${soilParams.permeability.toExponential(1)} m/s`, bx + 10, by + 86);
    }
  }

  /* ===== Helpers ===== */

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function adjustBrightness(hex, amount) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));
    return `rgb(${r},${g},${b})`;
  }

  /* ===== Animation Loop ===== */

  function animate() {
    if (!active) return;
    time += 0.016;

    // Smooth interpolation
    appliedLoad += (targetLoad - appliedLoad) * 0.05;

    // Settlement: foundation sinks based on load and soil properties
    const maxSettlement = soilParams
      ? Math.min(40, (appliedLoad * 300) / (soilParams.shearStrength * 2) * 15)
      : appliedLoad * 20;
    targetFoundationY = maxSettlement;
    foundationY += (targetFoundationY - foundationY) * 0.04;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Draw layers
    drawSky();
    drawSoilLayers();
    drawWaterTable();
    drawParticles();
    drawStressBulb();
    drawGrass();
    drawFoundation();
    drawDepthScale();
    drawSettlementIndicator();
    drawInfoOverlay();

    animId = requestAnimationFrame(animate);
  }

  return { init, start, stop, setLoad, setSoilParams, resize };
})();
