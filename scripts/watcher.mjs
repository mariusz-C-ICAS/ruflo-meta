/**
 * Ruflo Swarm — Machine Watcher
 * Uruchom na każdej maszynie: node scripts/watcher.mjs
 *
 * Automatycznie:
 * - Sprawdza GitHub Issues co 5 minut
 * - Pobiera taski przypisane do tej maszyny (machine:X label)
 * - Komentuje na issue "Machine X picked up task"
 * - Aktualizuje status na in-progress
 * - Wyświetla listę gotowych tasków z innych maszyn (dla koordynacji)
 */

import https from 'https';
import { hostname } from 'os';

// ─── Config ────────────────────────────────────────────────────────────────────
const TOKEN = process.env.RUFLO_PAT;
const OWNER = 'mariusz-C-ICAS';

// Detect machine name or use env override
const RAW_HOSTNAME = process.env.RUFLO_MACHINE || hostname().toLowerCase().replace(/[^a-z0-9]/g, '');

// Map hostname → machine label
const MACHINE_MAP = {
  'x1extreme': 'machine:x1extreme',
  'x1':        'machine:x1',
  'surfacelena':'machine:surfacelena',
  'x1y':       'machine:x1y',
};

// Project repos to watch
const REPOS = [
  { repo: 'calsyncpro',     name: 'CalSyncPro',     machine: 'x1extreme', rojo: 1 },
  { repo: 'nofico',         name: 'NoFiCo',          machine: 'x1',        rojo: 2 },
  { repo: 'c-icas-coaching',name: 'C-ICAS.coaching', machine: 'surfacelena',rojo: 3 },
  { repo: 'www.C-ICAS.gg',  name: 'www.C-ICAS.gg',  machine: 'x1y',       rojo: 4 },
  { repo: 'ruflo-meta',     name: 'ruflo-meta',      machine: 'any',       rojo: 0 },
];

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ─── API helpers ───────────────────────────────────────────────────────────────
function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    if (!TOKEN) {
      reject(new Error('RUFLO_PAT env var not set! Run: set RUFLO_PAT=gho_...'));
      return;
    }
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.github.com', path, method,
      headers: {
        'Authorization': `token ${TOKEN}`, 'User-Agent': 'ruflo-watcher',
        'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(opts, r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => { try { resolve({ status: r.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: r.statusCode, body: d }); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const api = {
  get: (p) => apiRequest('GET', p),
  post: (p, b) => apiRequest('POST', p, b),
  patch: (p, b) => apiRequest('PATCH', p, b),
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function ts() { return new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' }); }

// ─── Detect this machine ────────────────────────────────────────────────────────
function detectMachine() {
  // Try exact match first
  for (const [key, label] of Object.entries(MACHINE_MAP)) {
    if (RAW_HOSTNAME.includes(key)) return { id: key, label };
  }
  // Fallback: ask user to set RUFLO_MACHINE
  return { id: 'unknown', label: 'machine:any' };
}

// ─── Main poll cycle ────────────────────────────────────────────────────────────
async function pollCycle(machine) {
  console.log(`\n[${ts()}] 🔄 Polling GitHub Issues...`);

  let myTasksTotal = 0;
  let allReadyTotal = 0;

  for (const project of REPOS) {
    const repo = `${OWNER}/${project.repo}`;
    try {
      // Get open issues with status:ready
      const { body: issues } = await api.get(
        `/repos/${repo}/issues?state=open&labels=status:ready&per_page=50`
      );
      if (!Array.isArray(issues)) continue;

      const myTasks = issues.filter(i =>
        i.labels.some(l => l.name === machine.label || l.name === 'machine:any')
      );
      const otherTasks = issues.filter(i =>
        !i.labels.some(l => l.name === machine.label || l.name === 'machine:any')
      );

      allReadyTotal += issues.length;

      if (myTasks.length > 0) {
        console.log(`\n  📋 [${project.name}] ${myTasks.length} task(s) for ${machine.id}:`);
        for (const issue of myTasks) {
          console.log(`     🎯 #${issue.number}: ${issue.title}`);
          myTasksTotal++;

          // Auto-pick up: comment + update status
          await pickUpTask(repo, issue, machine);
          await sleep(200);
        }
      }

      if (otherTasks.length > 0 && project.repo === 'ruflo-meta') {
        console.log(`  📌 [${project.name}] ${otherTasks.length} ready task(s) for other machines`);
      }

    } catch (e) {
      console.error(`  ⚠️  Error checking ${project.repo}: ${e.message}`);
    }
    await sleep(300);
  }

  if (myTasksTotal === 0) {
    console.log(`  ✅ No new tasks for ${machine.id}. (${allReadyTotal} total ready across all repos)`);
  }
}

// ─── Pick up a task ─────────────────────────────────────────────────────────────
async function pickUpTask(repo, issue, machine) {
  const issueNum = issue.number;

  // Comment that machine picked up the task
  await api.post(`/repos/${repo}/issues/${issueNum}/comments`, {
    body: `## 🤖 ${machine.id.toUpperCase()} — Task Picked Up

**Maszyna:** \`${machine.id}\`
**Czas:** ${ts()}
**Status:** Rozpoczynam pracę

### Plan działania:
Agent na maszynie \`${machine.id}\` przejął ten task.
Postęp będzie raportowany w komentarzach.

---
*Ruflo Watcher v1.0 | auto-pickup*`
  });

  // Update labels: remove status:ready, add status:in-progress
  const currentLabels = issue.labels.map(l => l.name).filter(l => l !== 'status:ready');
  currentLabels.push('status:in-progress');

  await api.patch(`/repos/${repo}/issues/${issueNum}`, {
    labels: currentLabels
  });

  console.log(`     ✅ Picked up #${issueNum} — labeled status:in-progress`);
}

// ─── Status summary ─────────────────────────────────────────────────────────────
async function showStatus(machine) {
  console.log(`\n📊 My In-Progress Tasks (${machine.id}):`);
  for (const project of REPOS) {
    const repo = `${OWNER}/${project.repo}`;
    try {
      const { body: issues } = await api.get(
        `/repos/${repo}/issues?state=open&labels=status:in-progress&per_page=20`
      );
      if (!Array.isArray(issues)) continue;
      const mine = issues.filter(i => i.labels.some(l => l.name === machine.label));
      if (mine.length > 0) {
        console.log(`  [${project.name}]:`);
        mine.forEach(i => console.log(`    🔄 #${i.number}: ${i.title}`));
      }
    } catch { /* ignore */ }
    await sleep(100);
  }
}

// ─── Entry point ────────────────────────────────────────────────────────────────
async function main() {
  const machine = detectMachine();

  console.log('┌─────────────────────────────────────────────┐');
  console.log('│  🤖 Ruflo Swarm — Machine Watcher v1.0      │');
  console.log('├─────────────────────────────────────────────┤');
  console.log(`│  Machine:  ${machine.id.padEnd(33)}│`);
  console.log(`│  Label:    ${machine.label.padEnd(33)}│`);
  console.log(`│  Poll:     every 5 minutes                  │`);
  console.log(`│  Repos:    ${REPOS.length} repos × all issues              │`);
  console.log('└─────────────────────────────────────────────┘');
  console.log('');

  if (!TOKEN) {
    console.error('❌ RUFLO_PAT not set!');
    console.error('   Run:  set RUFLO_PAT=<your-github-token>  (Windows CMD)');
    console.error('   Or:   $env:RUFLO_PAT="..."               (PowerShell)');
    process.exit(1);
  }

  if (machine.id === 'unknown') {
    console.warn(`⚠️  Machine not recognized from hostname: "${RAW_HOSTNAME}"`);
    console.warn(`   Set env var:  set RUFLO_MACHINE=x1extreme  (or x1, surfacelena, x1y)`);
    console.warn(`   Watching machine:any tasks only\n`);
  }

  // Initial status
  await showStatus(machine);

  // First poll immediately
  await pollCycle(machine);

  // Then poll every 5 minutes
  console.log(`\n⏰ Next poll in 5 minutes... (Ctrl+C to stop)\n`);
  setInterval(async () => {
    await pollCycle(machine);
    console.log(`\n⏰ Next poll in 5 minutes...\n`);
  }, POLL_INTERVAL_MS);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
