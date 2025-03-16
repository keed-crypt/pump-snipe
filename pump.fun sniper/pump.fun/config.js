// config.js
require('dotenv').config();
const { PublicKey } = require('@solana/web3.js');

/**
 * This file replicates config.py from the Chainstack tutorial.
 * We define all global pump.fun and Solana system addresses, 
 * as well as config values like RPC endpoints and slippage.
 */

// RPC endpoint
// By default, we'll pull from .env or fallback to a known mainnet endpoint
const SOLANA_RPC = process.env.SOLANA_RPC || 'wss://mainnet.helius-rpc.com/?api-key=906a801e-163b-4a2d-8561-8298bbf0fbda';

// The main pump.fun executable program from the tutorial:
const PUMPFUN_PROGRAM_ID = new PublicKey(
  process.env.PUMPFUN_PROGRAM_ID || '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'
);

// Example of the system program or other relevant system addresses:
const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

// We might also store default decimals for pump.fun tokens = 6
const PUMPFUN_TOKEN_DECIMALS = 6;

// Default time delays
const BUY_COOLDOWN_MS = parseInt(process.env.BUY_COOLDOWN_MS || '15000', 10); // 15s (like the tutorial)

// Slippage settings
const SLIPPAGE = parseFloat(process.env.SLIPPAGE || '0.01'); // 1%

// The user’s private key for the wallet that does buy/sell
// In the tutorial, they read a .json or .env for the key; do the same here:
const WALLET_KEY_PATH = process.env.WALLET_KEY_PATH || './my-keypair.json';

module.exports = {
  SOLANA_RPC,
  PUMPFUN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  PUMPFUN_TOKEN_DECIMALS,
  BUY_COOLDOWN_MS,
  SLIPPAGE,
  WALLET_KEY_PATH,
};
