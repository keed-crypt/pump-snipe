// utils/csvLogger.js
const fs = require('fs');
const path = require('path');

const simulationCsv = path.join(__dirname, '../..', 'trades', 'simulated_buys.csv');

function logSimulatedBuy(data) {
  // If file doesn't exist, write a header
  if (!fs.existsSync(simulationCsv)) {
    fs.writeFileSync(simulationCsv, 'timestamp,mint,bondingCurve,associatedBondingCurve\n');
  }
  const now = new Date().toISOString();
  const line = `${now},${data.mint},${data.bondingCurve},${data.associatedBondingCurve}\n`;
  fs.appendFileSync(simulationCsv, line);
}

module.exports = {
  logSimulatedBuy,
};
