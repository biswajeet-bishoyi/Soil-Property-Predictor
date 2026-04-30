/**
 * model.js — TensorFlow.js Neural Network for Soil Property Prediction
 * Generates synthetic training data from empirical geotechnical correlations,
 * builds and trains a neural network, and exposes predict() + analytics.
 */

const SoilModel = (() => {
  // Normalization bounds
  const INPUT_MINS  = [0, 1, 1, 10, 5, 10, 0.2, 0.001, 0.5, 0.5];
  const INPUT_MAXS  = [3, 60, 80, 100, 60, 22, 2.0, 5.0, 30, 10];
  const OUTPUT_MINS = [5, 20, -10, 0, 0, 0.0];
  const OUTPUT_MAXS = [350, 700, -1, 48, 250, 0.9];

  let model = null;
  let trainingLossHistory = [];
  let valLossHistory = [];
  let validationData = null; // Store for analytics

  /* --- Helpers --- */
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function gaussNoise(mean, std) {
    const u1 = Math.random(), u2 = Math.random();
    return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  function normalize(val, min, max) { return (val - min) / (max - min || 1); }
  function denormalize(val, min, max) { return val * (max - min) + min; }

  /* --- Empirical Correlations --- */
  function computeTargets(soilType, N, w, LL, PL, gamma_d, e, D10, depth, B) {
    const PI = LL - PL;
    const isCohesive = soilType <= 1;

    let phi;
    if (!isCohesive) {
      phi = 27.1 + 0.3 * N - 0.00054 * N * N;
      phi += gaussNoise(0, 1.5);
    } else {
      phi = clamp(5 + 0.1 * N + (PI > 20 ? 0 : 8), 0, 30);
      phi += gaussNoise(0, 1);
    }
    phi = clamp(phi, 0, 48);

    let su;
    if (isCohesive) {
      su = 6.5 * N + gaussNoise(0, 5);
      su *= (1 - 0.005 * (w - 20));
    } else {
      const sigma_v = gamma_d * depth;
      su = sigma_v * Math.tan(phi * Math.PI / 180);
      su += gaussNoise(0, 8);
    }
    su = clamp(su, 5, 350);

    let c;
    if (isCohesive) {
      c = su / (2 * Math.sqrt(1 + 0.01 * phi));
      c += gaussNoise(0, 3);
    } else {
      c = clamp(gaussNoise(2, 2), 0, 15);
    }
    c = clamp(c, 0, 250);

    const Kd = clamp(1 + 0.33 * (depth / B), 1, 1.33);
    let qa;
    if (!isCohesive) {
      qa = (N / 2.5) * Kd * 10;
      if (w > 40) qa *= 0.67;
      qa += gaussNoise(0, 12);
    } else {
      qa = 2 * su * Kd + gamma_d * depth * 0.5;
      qa += gaussNoise(0, 10);
    }
    qa = clamp(qa, 20, 700);

    let logK;
    if (!isCohesive) {
      const k = 0.01 * D10 * D10;
      logK = Math.log10(clamp(k * 0.01, 1e-10, 0.01));
      logK += gaussNoise(0, 0.3);
    } else {
      logK = -9 + 2 * e - 0.02 * PI;
      logK += gaussNoise(0, 0.4);
    }
    logK = clamp(logK, -10, -1);

    let Cc;
    if (isCohesive) {
      Cc = 0.009 * (LL - 10);
      Cc += gaussNoise(0, 0.02);
    } else {
      Cc = 0.005 * (LL - 10) * (1 + e);
      Cc += gaussNoise(0, 0.01);
    }
    Cc = clamp(Cc, 0.01, 0.9);

    return [su, qa, logK, phi, c, Cc];
  }

  /* --- Generate Synthetic Dataset --- */
  function generateData(n = 2000) {
    const inputs = [], outputs = [], rawOutputs = [];
    for (let i = 0; i < n; i++) {
      const soilType = Math.floor(rand(0, 4));
      const N = rand(1, 60);
      const w = rand(2, 75);
      const LL = rand(12, 95);
      const PL = rand(5, Math.min(LL - 2, 58));
      const gamma_d = rand(11, 21);
      const e = rand(0.25, 1.8);
      const D10 = rand(0.002, 4.5);
      const depth = rand(0.5, 28);
      const B = rand(0.5, 9);

      const inp = [soilType, N, w, LL, PL, gamma_d, e, D10, depth, B];
      const out = computeTargets(...inp);

      rawOutputs.push(out);
      inputs.push(inp.map((v, j) => normalize(v, INPUT_MINS[j], INPUT_MAXS[j])));
      outputs.push(out.map((v, j) => normalize(v, OUTPUT_MINS[j], OUTPUT_MAXS[j])));
    }
    return { inputs, outputs, rawOutputs };
  }

  /* --- Build Model --- */
  function buildModel() {
    const m = tf.sequential();
    m.add(tf.layers.dense({ inputShape: [10], units: 64, activation: 'relu', kernelInitializer: 'heNormal' }));
    m.add(tf.layers.dropout({ rate: 0.1 }));
    m.add(tf.layers.dense({ units: 32, activation: 'relu', kernelInitializer: 'heNormal' }));
    m.add(tf.layers.dense({ units: 6, activation: 'sigmoid' }));
    m.compile({ optimizer: tf.train.adam(0.005), loss: 'meanSquaredError' });
    return m;
  }

  /* --- Train --- */
  async function train(onProgress) {
    if (onProgress) onProgress(0, 'Generating synthetic soil data...');

    const { inputs, outputs, rawOutputs } = generateData(2000);

    // Split 85/15 for train/validation
    const splitIdx = Math.floor(inputs.length * 0.85);
    const trainInputs = inputs.slice(0, splitIdx);
    const trainOutputs = outputs.slice(0, splitIdx);
    const valInputsRaw = inputs.slice(splitIdx);
    const valOutputsRaw = outputs.slice(splitIdx);
    const valRawOutputs = rawOutputs.slice(splitIdx);

    const xs = tf.tensor2d(trainInputs);
    const ys = tf.tensor2d(trainOutputs);
    const valXs = tf.tensor2d(valInputsRaw);
    const valYs = tf.tensor2d(valOutputsRaw);

    if (onProgress) onProgress(5, 'Building neural network...');
    model = buildModel();

    trainingLossHistory = [];
    valLossHistory = [];
    const totalEpochs = 100;
    let lastLoss = 0;

    await model.fit(xs, ys, {
      epochs: totalEpochs,
      batchSize: 64,
      validationData: [valXs, valYs],
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          lastLoss = logs.loss.toFixed(5);
          trainingLossHistory.push(logs.loss);
          valLossHistory.push(logs.val_loss);
          const pct = 5 + ((epoch + 1) / totalEpochs) * 95;
          if (onProgress) onProgress(pct, `Training... Loss: ${lastLoss}`, epoch + 1, totalEpochs);
        }
      }
    });

    // Store validation data for analytics
    validationData = {
      inputs: valInputsRaw,
      actualRaw: valRawOutputs,
    };

    xs.dispose(); ys.dispose(); valXs.dispose(); valYs.dispose();
    return lastLoss;
  }

  /* --- Predict --- */
  function predict(rawInputs) {
    if (!model) throw new Error('Model not trained yet');
    const normalized = rawInputs.map((v, i) => normalize(v, INPUT_MINS[i], INPUT_MAXS[i]));
    const inputTensor = tf.tensor2d([normalized]);
    const outputTensor = model.predict(inputTensor);
    const outputNorm = outputTensor.dataSync();
    inputTensor.dispose(); outputTensor.dispose();

    const results = Array.from(outputNorm).map((v, i) => denormalize(v, OUTPUT_MINS[i], OUTPUT_MAXS[i]));
    return {
      shearStrength: Math.max(0, results[0]),
      bearingCapacity: Math.max(0, results[1]),
      permeability: Math.pow(10, results[2]),
      frictionAngle: clamp(results[3], 0, 48),
      cohesion: Math.max(0, results[4]),
      compressionIndex: clamp(results[5], 0.01, 0.9)
    };
  }

  /* --- Analytics: Compute R², MAE, MSE on validation set --- */
  function computeMetrics() {
    if (!model || !validationData) return null;

    const { inputs, actualRaw } = validationData;
    const inputTensor = tf.tensor2d(inputs);
    const predTensor = model.predict(inputTensor);
    const predNorm = predTensor.arraySync();
    inputTensor.dispose(); predTensor.dispose();

    // Denormalize predictions
    const predicted = predNorm.map(row =>
      row.map((v, i) => denormalize(v, OUTPUT_MINS[i], OUTPUT_MAXS[i]))
    );

    // Focus on shear strength (index 0) for scatter plot
    const actualShear = actualRaw.map(r => r[0]);
    const predShear = predicted.map(r => r[0]);

    // MAE, MSE, R² for shear strength
    const n = actualShear.length;
    let sumAE = 0, sumSE = 0, sumActual = 0;
    for (let i = 0; i < n; i++) {
      sumAE += Math.abs(actualShear[i] - predShear[i]);
      sumSE += (actualShear[i] - predShear[i]) ** 2;
      sumActual += actualShear[i];
    }
    const mae = sumAE / n;
    const mse = sumSE / n;
    const rmse = Math.sqrt(mse);
    const meanActual = sumActual / n;

    let ssTot = 0;
    for (let i = 0; i < n; i++) ssTot += (actualShear[i] - meanActual) ** 2;
    const r2 = 1 - (sumSE / ssTot);

    return {
      r2: clamp(r2, 0, 1),
      mae, mse, rmse,
      actualShear, predShear,
      trainingLoss: trainingLossHistory,
      valLoss: valLossHistory
    };
  }

  return { train, predict, computeMetrics };
})();
