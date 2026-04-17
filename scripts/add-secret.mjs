/**
 * Add RUFLO_PAT secret to ruflo-meta GitHub repo
 * Uses libsodium to encrypt per GitHub spec
 */

import https from 'https';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const TOKEN = 'process.env.RUFLO_PAT';
const OWNER = 'mariusz-C-ICAS';
const META_REPO = `${OWNER}/ruflo-meta`;

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'User-Agent': 'ruflo-secret-setup',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(opts, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { resolve({ status: r.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: r.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function addSecret(repo, secretName, secretValue) {
  // 1. Get public key
  const { status: pkStatus, body: pk } = await apiRequest('GET', `/repos/${repo}/actions/secrets/public-key`);
  if (pkStatus !== 200) throw new Error(`Failed to get public key: ${pkStatus} ${JSON.stringify(pk)}`);

  console.log(`📎 Public key ID: ${pk.key_id}`);

  // 2. Encrypt using libsodium
  const sodium = require('libsodium-wrappers');
  await sodium.ready;

  const binKey = sodium.from_base64(pk.key, sodium.base64_variants.ORIGINAL);
  const binSecret = sodium.from_string(secretValue);
  const encrypted = sodium.crypto_box_seal(binSecret, binKey);
  const encryptedB64 = sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL);

  // 3. Store secret
  const { status, body } = await apiRequest('PUT', `/repos/${repo}/actions/secrets/${secretName}`, {
    encrypted_value: encryptedB64,
    key_id: pk.key_id,
  });

  if (status === 201 || status === 204) {
    console.log(`✅ Secret "${secretName}" added to ${repo} (${status})`);
    return true;
  } else {
    throw new Error(`Failed to add secret: ${status} ${JSON.stringify(body)}`);
  }
}

// Also add to nofico and c-icas-coaching for their own workflows
async function main() {
  console.log('🔑 Adding RUFLO_PAT secret to Ruflo repos...\n');

  const repos = [
    `${OWNER}/ruflo-meta`,
    `${OWNER}/calsyncpro`,
  ];

  for (const repo of repos) {
    try {
      await addSecret(repo, 'RUFLO_PAT', TOKEN);
    } catch(e) {
      console.error(`⚠️  ${repo}: ${e.message}`);
    }
  }

  console.log('\n✅ Secrets configured!');
  console.log('GitHub Actions cross-repo scanner now has full access.\n');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
