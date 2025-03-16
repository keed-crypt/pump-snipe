// scripts/trade.js
require('dotenv').config(); // so we can read process.env.SIMULATE
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

// Import the existing modules
const { startListener } = require('./Listener');
const { buyToken } = require('./buy');
const { sellToken } = require('./sell');
const { logSimulatedBuy } = require('../utils/csvLogger');

const mintedTokensDir = path.join(__dirname, '../..', 'trades', 'minted-tokens');

// OPTIONAL: If you prefer CLI flags, parse them:
const args = minimist(process.argv.slice(2), {
  boolean: ['simulate', 'marry', 'yolo'],
});

// 1) Merge CLI flag and .env setting
const SIMULATE = args.simulate || (process.env.SIMULATE === 'true');
const yolo = !!args.yolo;
const marry = !!args.marry;

// You might have other flags like --match or --bro
const matchStr = args.match ? String(args.match).toLowerCase() : null;
const bro = args.bro || null;

function main() {
  console.log('[TRADE] Starting bot. SIMULATE:', SIMULATE);

  // Start listener
  startListener();

  // Watch minted-tokens directory
  fs.watch(mintedTokensDir, (eventType, filename) => {
    if (eventType === 'rename' && filename.endsWith('.txt')) {
      const filePath = path.join(mintedTokensDir, filename);
      setTimeout(() => handleNewMintFile(filePath), 1000); 
      // slight delay to ensure file is fully written
    }
  });
}

async function handleNewMintFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  // Parse the minted token data from the .txt
  const content = fs.readFileSync(filePath, 'utf8').trim();
  const lines = content.split('\n');
  const data = {};
  lines.forEach((line) => {
    const [k, v] = line.split(':').map((x) => x.trim());
    if (k && v) data[k] = v;
  });

  // e.g. data = { Mint: X, BondingCurve: Y, AssociatedBondingCurve: Z, Payer: P, ... }
  const { Mint, BondingCurve, AssociatedBondingCurve, Payer } = data;

  // APPLY FILTERS (unchanged): matchStr, bro, etc.
  if (bro && Payer && bro !== Payer) {
    console.log('[TRADE] Skipping token, because payer does not match --bro address.');
    return;
  }
  // if (matchStr) { ... your existing name/symbol check ... }

  // 2) If SIMULATE is on, log to CSV instead of real buy
  if (SIMULATE) {
    console.log(`[TRADE] SIMULATE MODE: Logging minted token instead of buying => ${Mint}`);
    logSimulatedBuy({
      mint: Mint,
      bondingCurve: BondingCurve,
      associatedBondingCurve: AssociatedBondingCurve,
    });
    return;
  }

  // Otherwise do a REAL buy
  try {
    await buyToken(Mint, BondingCurve, AssociatedBondingCurve);
  } catch (err) {
    console.error('[TRADE] Buy failed:', err);
    return;
  }

  // If not marry, do a delayed sell
  if (!marry) {
    setTimeout(async () => {
      try {
        console.log(`[TRADE] Selling token => ${Mint}`);
        await sellToken(Mint, BondingCurve, AssociatedBondingCurve);
      } catch (err) {
        console.error('[TRADE] Sell error:', err);
      }
    }, 20000);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
};
