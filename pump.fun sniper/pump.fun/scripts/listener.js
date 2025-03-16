// scripts/listener.js
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { PublicKey } = require('@solana/web3.js');
const { getWebSocketEndpoint, httpConnection } = require('../utils/connection');
const { calculateDiscriminators } = require('../utils/anchorDiscriminator');

// Pump.fun mainnet program ID
const PUMPFUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');

// We'll store minted tokens in trades/minted-tokens/<mint>.txt
const mintedTokensDir = path.join(__dirname, '../..', 'trades', 'minted-tokens');
if (!fs.existsSync(mintedTokensDir)) {
  fs.mkdirSync(mintedTokensDir, { recursive: true });
}

// Load IDL so we can get the 8-byte "create" discriminator
const pumpFunIdlPath = path.join(__dirname, '..', 'idl', 'pump_fun_idl.json');
const discriminators = calculateDiscriminators(pumpFunIdlPath);
const createDiscHex = discriminators.create; // e.g. '2f5b48dc9c25c644'

let ws = null;

/**
 * startListener()
 * ---------------
 * Subscribes to logs for the pump.fun program via logsSubscribe.
 */
function startListener() {
  const endpoint = getWebSocketEndpoint();
  ws = new WebSocket(endpoint);

  ws.on('open', () => {
    console.log('[LISTENER] WebSocket connected to:', endpoint);

    // Subscribe to logs for the pump.fun program
    const subscriptionPayload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'logsSubscribe',
      params: [
        {
          mentions: [PUMPFUN_PROGRAM_ID.toBase58()],
        },
        {
          commitment: 'confirmed', // or processed/finalized
        },
      ],
    };
    ws.send(JSON.stringify(subscriptionPayload));
  });

  ws.on('message', async (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.method === 'logsNotification') {
        const logsInfo = parsed.params.result;
        await handleLogsNotification(logsInfo);
      }
    } catch (err) {
      console.error('[LISTENER] Failed to parse WS message:', err);
    }
  });

  ws.on('error', (err) => {
    console.error('[LISTENER] WebSocket error:', err);
  });

  ws.on('close', () => {
    console.log('[LISTENER] WebSocket closed. Reconnecting in 5s...');
    setTimeout(startListener, 5000);
  });
}

/**
 * handleLogsNotification
 * ----------------------
 * For each log referencing pump.fun, we fetch the transaction
 * and parse out the "create" instruction. If found, we log the minted token.
 */
async function handleLogsNotification(logsInfo) {
  try {
    const { signature } = logsInfo;
    if (!signature) return;

    // Fetch the transaction
    const txResponse = await httpConnection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    if (!txResponse || !txResponse.transaction) return;

    const { transaction } = txResponse;
    const message = transaction.message;
    if (!message.instructions || message.instructions.length === 0) return;

    // Check each instruction for the 8-byte create disc
    for (const instruction of message.instructions) {
      const programId = message.accountKeys[instruction.programIdIndex];
      if (!programId) continue;

      if (programId.toBase58() === PUMPFUN_PROGRAM_ID.toBase58()) {
        const dataBase58 = instruction.data || '';
        const dataBuffer = Buffer.from(dataBase58, 'base58');
        const discHex = dataBuffer.subarray(0, 8).toString('hex');

        if (discHex === createDiscHex) {
          // Found a "create" instruction => extract minted token data
          const mintedTokenData = extractMintedTokenData(txResponse, instruction, message);
          if (mintedTokenData) {
            logMintedToken(mintedTokenData);
          }
        }
      }
    }
  } catch (err) {
    console.error('[LISTENER] Error handling logsNotification:', err);
  }
}

/**
 * extractMintedTokenData
 * ----------------------
 * According to the pump.fun IDL, the "create" instruction has:
 *   0 => mint
 *   1 => mintAuthority
 *   2 => bondingCurve
 *   3 => associatedBondingCurve
 */
function extractMintedTokenData(txResponse, instruction, message) {
  const keys = instruction.accounts.map((acctIdx) => message.accountKeys[acctIdx].toBase58());

  // Updated to match the IDL:
  // The minted token is keys[0], bondingCurve at keys[2], associatedBondingCurve at keys[3].
  const mint = keys[0];
  const bondingCurve = keys[2];
  const associatedBondingCurve = keys[3];

  if (!mint || !bondingCurve || !associatedBondingCurve) {
    return null;
  }

  return {
    mint,
    bondingCurve,
    associatedBondingCurve,
    signature: txResponse.transaction.signatures[0] || '',
    createdAt: new Date().toISOString(),
  };
}

/**
 * logMintedToken
 * --------------
 * Writes minted token data to trades/minted-tokens/<mint>.txt
 */
function logMintedToken(data) {
  const filePath = path.join(mintedTokensDir, `${data.mint}.txt`);
  const content = [
    `Mint: ${data.mint}`,
    `BondingCurve: ${data.bondingCurve}`,
    `AssociatedBondingCurve: ${data.associatedBondingCurve}`,
    `Signature: ${data.signature}`,
    `Created: ${data.createdAt}`,
  ].join('\n');

  fs.writeFileSync(filePath, content);
  console.log(`[LISTENER] New minted token detected -> ${filePath}`);
}

module.exports = {
  startListener,
};
