// utils/connection.js
const { Connection } = require('@solana/web3.js');
const { SOLANA_RPC } = require('../config');

// Create a standard `Connection` object, used for getAccountInfo, getTransaction, etc.
const httpConnection = new Connection(SOLANA_RPC.replace('wss://', 'https://'), 'confirmed');

// We also keep the raw WebSocket endpoint for blockSubscribe if needed:
const WEBSOCKET_ENDPOINT = SOLANA_RPC.startsWith('wss')
  ? SOLANA_RPC
  : SOLANA_RPC.replace('https://', 'wss://');

// In the tutorial, they directly used raw websockets. 
// We'll keep this around if we want to do raw subscription data:
const getWebSocketEndpoint = () => {
  return WEBSOCKET_ENDPOINT;
};

module.exports = {
  httpConnection,
  getWebSocketEndpoint,
};
