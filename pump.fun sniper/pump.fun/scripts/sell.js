// scripts/sell.js
const fs = require('fs');
const path = require('path');
const { Keypair, PublicKey, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const { httpConnection } = require('../utils/connection');
const { decodeBondingCurve } = require('../utils/decodeBondingCurve');
const { PUMPFUN_PROGRAM_ID, WALLET_KEY_PATH } = require('../config');
const { calculateDiscriminators } = require('../utils/anchorDiscriminator');

const pumpFunIdlPath = path.join(__dirname, '..', 'idl', 'pump_fun_idl.json');
const discriminators = calculateDiscriminators(pumpFunIdlPath);
const sellDiscHex = discriminators.sell; // e.g. '6a867b3f1c2e70b9'

function loadWallet() {
  const rawData = fs.readFileSync(WALLET_KEY_PATH, 'utf8');
  const secretKey = Uint8Array.from(JSON.parse(rawData));
  return Keypair.fromSecretKey(secretKey);
}

async function sellToken(mint, bondingCurve, associatedBondingCurve) {
  console.log(`[SELL] Start sell flow for mint: ${mint}`);

  const user = loadWallet();
  const mintPubkey = new PublicKey(mint);
  const bondingCurvePubkey = new PublicKey(bondingCurve);
  const associatedBondingCurvePubkey = new PublicKey(associatedBondingCurve);

  // 1) Fetch price from bondingCurve
  const accountInfo = await httpConnection.getAccountInfo(bondingCurvePubkey);
  if (!accountInfo) {
    console.error('[SELL] Could not fetch bondingCurve account info.');
    return;
  }
  const { priceLamports } = decodeBondingCurve(accountInfo.data);
  console.log(`[SELL] Current token price in lamports: ${priceLamports}`);

  // 2) Construct the sell instruction
  const sellData = Buffer.alloc(8);
  Buffer.from(sellDiscHex, 'hex').copy(sellData, 0, 0, 8);

  const sellIx = {
    keys: [
      { pubkey: user.publicKey, isSigner: true, isWritable: true },
      { pubkey: mintPubkey, isSigner: false, isWritable: true },
      { pubkey: bondingCurvePubkey, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurvePubkey, isSigner: false, isWritable: true },
      // etc. depending on anchor layout
    ],
    programId: PUMPFUN_PROGRAM_ID,
    data: sellData,
  };

  // 3) Send the transaction
  const tx = new Transaction().add(sellIx);
  try {
    const sig = await sendAndConfirmTransaction(httpConnection, tx, [user]);
    console.log(`[SELL] Token sold successfully! Tx Sig: ${sig}`);
    logTradeEvent(mint, 'SELL', sig);
  } catch (err) {
    console.error('[SELL] Error on transaction:', err);
  }
}

function logTradeEvent(mint, type, signature) {
  const filePath = path.join(__dirname, '../..', 'trades', 'trades.log');
  const line = `[${new Date().toISOString()}] ${type} ${mint} => ${signature}\n`;
  fs.appendFileSync(filePath, line);
}

module.exports = {
  sellToken,
};
