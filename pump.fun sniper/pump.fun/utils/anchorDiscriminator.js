// utils/anchorDiscriminator.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * This replicates the "calculate_discriminator.py" logic from the tutorial.
 * For each instruction in the IDL, we compute an 8-byte discriminator
 * by hashing "global:<instruction_name>" with SHA256, then taking the first 8 bytes.
 */

function calculateDiscriminators(idlPath) {
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
  const result = {};

  if (!idl.instructions || !Array.isArray(idl.instructions)) {
    throw new Error('No instructions array found in the IDL.');
  }

  for (const ix of idl.instructions) {
    const name = ix.name;
    const seed = `global:${name}`;
    const hash = crypto.createHash('sha256').update(seed).digest();
    const disc = hash.subarray(0, 8);
    result[name] = disc.toString('hex');
  }
  return result;
}

// Example usage (like the tutorial’s CLI approach)
// node anchorDiscriminator.js
if (require.main === module) {
  const pumpFunIdlPath = path.join(__dirname, '..', 'idl', 'pump_fun_idl.json');
  console.log('Computing pump.fun IDL discriminators...\n');
  const discriminators = calculateDiscriminators(idlPath);
  console.log(discriminators);
}

module.exports = {
  calculateDiscriminators,
};
