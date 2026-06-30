#!/usr/bin/env node
/**
 * scripts/generate-pin-hash.js
 *
 * Generates a bcrypt hash for an admin PIN.
 * Run locally — never run this on the server.
 *
 * Usage:
 *   node scripts/generate-pin-hash.js
 *   → prompts for a PIN
 *   → prints the bcrypt hash
 *   → also prints a ready-to-paste ADMIN_PIN_HASH= line for .env
 *
 * Or non-interactive:
 *   echo "1234" | node scripts/generate-pin-hash.js
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

async function main() {
  let pin = process.argv[2];

  if (!pin) {
    // Read from stdin if piped
    if (!process.stdin.isTTY) {
      pin = await new Promise((resolve) => {
        let data = '';
        process.stdin.on('data', (chunk) => data += chunk);
        process.stdin.on('end', () => resolve(data.trim()));
      });
    }
  }

  if (!pin) {
    pin = await ask('Enter admin PIN (4-8 chars): ');
  }

  if (!pin || pin.length < 4 || pin.length > 8) {
    console.error('❌ PIN must be 4-8 characters');
    process.exit(1);
  }

  const hash = bcrypt.hashSync(pin, 10);

  console.log('');
  console.log('✅ Generated bcrypt hash for your PIN');
  console.log('');
  console.log('Add this line to your .env file on the server:');
  console.log('');
  console.log(`ADMIN_PIN_HASH=${hash}`);
  console.log('');
  console.log('Or, run the backend once and set the PIN via the /admin UI instead.');
}

main();
