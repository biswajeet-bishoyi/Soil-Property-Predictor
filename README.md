# 🌍 AI Soil Property Predictor — In-Browser Geotechnical Neural Network Engine

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-Deep%20Learning-FF6F00?logo=tensorflow&logoColor=white)](https://www.tensorflow.org/js)
[![Chart.js](https://img.shields.io/badge/Chart.js-Interactive-FF6384?logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

**An AI-powered client-side web application that predicts engineering soil properties using a TensorFlow.js neural network trained on geotechnical empirical correlations.**

[Report Bug](https://github.com/biswajeet-bishoyi/Soil-Property-Predictor/issues) • [Request Feature](https://github.com/biswajeet-bishoyi/Soil-Property-Predictor/issues)

</div>

---

## 🌟 Overview

The **AI Soil Property Predictor** runs deep learning inference directly inside the client's web browser with zero backend requirements. It trains and executes a multi-layer neural network on geotechnical empirical formulations, estimating critical mechanical, hydraulic, and structural design parameters from basic soil index inputs.

---

## 🚀 Key Features

- **⚡ Client-Side Neural Network**: Built with TensorFlow.js featuring a deep architecture (64 + 32 hidden dense layers with ReLU activation) running hardware-accelerated WebGL operations in the browser.
- **📊 2,000+ Pre-Calibrated Synthetic Samples**: Synthesized from established geotechnical empirical correlations across sand, silt, and clay strata.
- **📈 Comprehensive Parameter Outputs**:
  - **Shear Strength (kPa)**: Based on Terzaghi & Peck formulations.
  - **Ultimate Bearing Capacity (kPa)**: Meyerhof / Bowles general bearing theory.
  - **Permeability ($k$ in m/s)**: Hazen's effective diameter formula ($k = c \cdot D_{10}^2$).
  - **Effective Friction Angle ($\phi'$)**: Wolff (1989) SPT correlation.
  - **Cohesion ($c'$ in kPa)**: Mohr-Coulomb failure criteria.
  - **Compression Index ($C_c$)**: Terzaghi & Peck empirical liquid limit relation ($C_c = 0.009 (LL - 10)$).
- **📉 Interactive Visual Analytics**: Real-time Chart.js radar charts and parameter correlation curves.

---

## 🛠️ Quick Start

This project is completely client-side:

```bash
# Clone the repository
git clone https://github.com/biswajeet-bishoyi/Soil-Property-Predictor.git
cd Soil-Property-Predictor

# Open in browser directly or serve via any static file server
npx serve .
# Or open index.html in Chrome, Edge, or Firefox
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
Developed by <a href="https://github.com/biswajeet-bishoyi">Biswajeet Bishoyi</a>
</div>
