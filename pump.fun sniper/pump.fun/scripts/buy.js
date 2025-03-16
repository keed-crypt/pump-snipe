// scripts/buy.js
const fs = require('fs');
const path = require('path');
const { Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const { httpConnection } = require('../utils/connection');
const { decodeBondingCurve } = require('../utils/decodeBondingCurve');
const { PUMPFUN_PROGRAM_ID, WALLET_KEY_PATH, BUY_COOLDOWN_MS } = require('../config');
const { calculateDiscriminators } = require('../utils/anchorDiscriminator');

// Because __dirname => pump.fun sniper/scripts
const pumpFunIdlPath = path.join(__dirname, '..', 'idl', 'pump_fun_idl.json');

const discriminators = calculateDiscriminators(pumpFunIdlPath);
const buyDiscHex = discriminators.buy; // e.g. '30c9b0ff341c78d2'

// Load your wallet
function loadWallet() {
  const rawData = fs.readFileSync(WALLET_KEY_PATH, 'utf8');
  const secretKey = Uint8Array.from(JSON.parse(rawData));
  return Keypair.fromSecretKey(secretKey);
}

// The main function that does the buy steps
async function buyToken(mint, bondingCurve, associatedBondingCurve) {
  console.log(`[BUY] Start buy flow for mint: ${mint}`);

  const user = loadWallet();
  const mintPubkey = new PublicKey(mint);
  const bondingCurvePubkey = new PublicKey(bondingCurve);
  const associatedBondingCurvePubkey = new PublicKey(associatedBondingCurve);

  // 1) Create an associated token account (like the tutorial’s create ATA step).
  //    Or check if it exists first. For brevity, we always create:
  //    In practice, you’d do a getOrCreateAssociatedTokenAccount using the SPL library.

  // This code is just schematic; you'd do real ATA creation calls with SPL Token:
  // e.g. `await createAssociatedTokenAccountInstruction(...)`
  console.log(`[BUY] Creating associated token account for ${mint}...`);
  // ... omitted for brevity

  // 2) Fetch the token price from the bondingCurve
  const accountInfo = await httpConnection.getAccountInfo(bondingCurvePubkey);
  if (!accountInfo) {
    console.error('[BUY] Could not fetch bondingCurve account info.');
    return;
  }
  const { priceLamports } = decodeBondingCurve(accountInfo.data);
  console.log(`[BUY] Current token price in lamports: ${priceLamports}`);

  // 3) Construct the buy instruction 
  //    The tutorial uses the 8-byte "buy" discriminator, then additional Anchor-encoded data.
  const buyData = Buffer.alloc(8); // first 8 bytes = buyDiscHex
  Buffer.from(buyDiscHex, 'hex').copy(buyData, 0, 0, 8);

  // The rest of the data for the anchor instruction would follow if needed. 
  // In the tutorial, they carefully encode it.

  const buyIx = {
    keys: [
      // The tutorial’s anchor layout for keys on the buy instruction:
      { pubkey: user.publicKey, isSigner: true, isWritable: true },
      { pubkey: mintPubkey, isSigner: false, isWritable: true },
      { pubkey: bondingCurvePubkey, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurvePubkey, isSigner: false, isWritable: true },
      // plus SPL token program, system program, etc.
    ],
    programId: PUMPFUN_PROGRAM_ID,
    data: buyData,
  };

  // 4) Send the transaction
  const tx = new Transaction().add(buyIx);
  try {
    const sig = await sendAndConfirmTransaction(httpConnection, tx, [user]);
    console.log(`[BUY] Token bought successfully! Tx Sig: ${sig}`);
    logTradeEvent(mint, 'BUY', sig);
  } catch (err) {
    console.error('[BUY] Error on transaction:', err);
    return;
  }

  // 5) Wait the cooldown before next action
  console.log(`[BUY] Cooldown ${BUY_COOLDOWN_MS} ms...`);
  await new Promise((res) => setTimeout(res, BUY_COOLDOWN_MS));
}

// Log to trades.log
function logTradeEvent(mint, type, signature) {
  const filePath = path.join(__dirname, '../..', 'trades', 'trades.log');
  const line = `[${new Date().toISOString()}] ${type} ${mint} => ${signature}\n`;
  fs.appendFileSync(filePath, line);
}

module.exports = {
  buyToken,
};
