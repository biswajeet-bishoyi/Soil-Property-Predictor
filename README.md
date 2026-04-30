# 🌍 AI-Based Soil Property Predictor

An AI-powered web application that predicts soil engineering properties using a **TensorFlow.js neural network** trained on established geotechnical empirical correlations. Built entirely in the browser — no backend required.

![Built with](https://img.shields.io/badge/Built%20with-TensorFlow.js-FF6F00?logo=tensorflow&logoColor=white)
![Chart.js](https://img.shields.io/badge/Charts-Chart.js-FF6384?logo=chartdotjs&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 🧠 AI Prediction Engine
- Neural network with 2 hidden layers (64 + 32 neurons) trained in-browser
- 2,000 synthetic training samples from geotechnical empirical correlations
- Predicts 6 soil properties from 10 input parameters

### 📊 Predicted Properties
| Property | Unit | Formula Basis |
|----------|------|---------------|
| Shear Strength | kPa | Terzaghi & Peck |
| Bearing Capacity | kPa | Meyerhof / Bowles |
| Permeability | m/s | Hazen's Formula |
| Friction Angle | ° | Wolff (1989) |
| Cohesion | kPa | Mohr-Coulomb |
| Compression Index | Cc | Terzaghi & Peck |

### 🏗️ Foundation Recommendation System
- **Strong Soil (>150 kPa)** → Shallow Foundation (isolated/strip footings)
- **Moderate Soil (50–150 kPa)** → Raft / Combined Foundation
- **Weak Soil (<50 kPa)** → Deep Foundation (Pile)
- Visual strength meter with color-coded recommendations

### 📈 Data Analytics Dashboard
- **R² Score** — prediction accuracy with animated ring gauge
- **MAE, MSE, RMSE** — error metrics
- **Actual vs Predicted** scatter chart with perfect prediction line
- **Training Loss Curve** — training + validation loss over epochs

### 🌍 Interactive Soil Simulation
- Real-time canvas animation of soil cross-section
- Animated **Boussinesq stress bulb** under foundation
- Soil particle compression and lateral displacement
- Water table with flowing particles
- Foundation settlement indicator (δ in mm)
- Interactive load slider (0–100%)

### 📉 Settlement Simulation
- Load-settlement curve with consolidation + immediate settlement
- Adjustable max load parameter
- Based on compression index and elastic modulus

## 🚀 Getting Started

### Option 1: Open directly
Simply open `index.html` in any modern browser. No server required!

### Option 2: Local server
```bash
npx http-server . -p 8080
```
Then visit `http://localhost:8080`

## 🛠️ Tech Stack
- **HTML5** + **Vanilla CSS** + **JavaScript (ES6+)**
- **TensorFlow.js** — Neural network training and inference
- **Chart.js** — Data visualizations (radar, bar, scatter, line)
- **Google Fonts** — Inter + JetBrains Mono

## 📁 Project Structure
```
soil-predictor/
├── index.html          # Main page
├── css/
│   └── style.css       # Dark theme, glassmorphism, animations
├── js/
│   ├── model.js        # TensorFlow.js model + synthetic data
│   ├── charts.js       # Chart.js visualizations
│   ├── simulation.js   # Canvas-based soil simulation
│   └── app.js          # Main app logic
└── README.md
```

## ⚠️ Disclaimer
This tool uses a neural network trained on synthetic data derived from established geotechnical empirical correlations. It is intended for **educational and preliminary assessment purposes only**. Results should not be used for final engineering design without proper site investigation and laboratory testing.

## 📝 License
MIT License — feel free to use, modify, and distribute.
