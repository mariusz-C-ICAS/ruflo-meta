/**
 * Ruflo Swarm — Phase 2: Missing Repos + Discussions + Local Git Setup
 * Creates: nofico repo, c-icas-coaching repo, links local dirs, creates heartbeat discussion
 */

import https from 'https';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

const TOKEN = 'process.env.RUFLO_PAT';
const OWNER = 'mariusz-C-ICAS';

const BASE_DIR = 'C:\\Users\\MariuszCzaja\\OneDrive - C-ICAS Sp. z O.O\\Documents\\Ruflo\\Projekty';

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'User-Agent': 'ruflo-swarm-phase2',
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

const api = {
  get: (path) => apiRequest('GET', path),
  post: (path, body) => apiRequest('POST', path, body),
  put: (path, body) => apiRequest('PUT', path, body),
  patch: (path, body) => apiRequest('PATCH', path, body),
  graphql: (query, variables = {}) => {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ query, variables });
      const opts = {
        hostname: 'api.github.com',
        path: '/graphql',
        method: 'POST',
        headers: {
          'Authorization': `bearer ${TOKEN}`,
          'User-Agent': 'ruflo-swarm-phase2',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };
      const req = https.request(opts, r => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => {
          try { resolve(JSON.parse(d)); }
          catch { resolve({ raw: d }); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(emoji, msg) { console.log(`${emoji}  ${msg}`); }

const LABELS_27 = [
  { name: 'priority:critical', color: 'd73a4a', description: '🔴 Natychmiastowa akcja wymagana' },
  { name: 'priority:high',     color: 'e4e669', description: '🟡 Wysoki priorytet' },
  { name: 'priority:normal',   color: '0075ca', description: '🔵 Normalny priorytet' },
  { name: 'priority:low',      color: 'cfd3d7', description: '⚪ Niski priorytet' },
  { name: 'status:blocked',     color: 'b60205', description: '🚫 Zablokowane' },
  { name: 'status:ready',       color: '0e8a16', description: '✅ Gotowe' },
  { name: 'status:in-progress', color: '1d76db', description: '🔄 W trakcie' },
  { name: 'status:done',        color: '5319e7', description: '✔️ Zakończone' },
  { name: 'status:review',      color: 'fbca04', description: '👁️ Do przeglądu' },
  { name: 'project:calsyncpro',  color: '0052cc', description: 'Projekt CalSyncPro' },
  { name: 'project:nofico',      color: '006b75', description: 'Projekt NoFiCo' },
  { name: 'project:coaching',    color: 'e4e669', description: 'Projekt C-ICAS.coaching' },
  { name: 'project:meta',        color: 'bfd4f2', description: 'Ruflo meta' },
  { name: 'rojo:1', color: 'f9d0c4', description: 'Rój #1 — CalSyncPro' },
  { name: 'rojo:2', color: 'c2e0c6', description: 'Rój #2 — NoFiCo' },
  { name: 'rojo:3', color: 'bfd4f2', description: 'Rój #3 — C-ICAS.coaching' },
  { name: 'rojo:4', color: 'fef2c0', description: 'Rój #4 — Future' },
  { name: 'agent-type:coder',       color: '0075ca', description: '💻 Agent: Coder' },
  { name: 'agent-type:tester',      color: '0e8a16', description: '🧪 Agent: Tester' },
  { name: 'agent-type:reviewer',    color: 'e4e669', description: '👁️ Agent: Reviewer' },
  { name: 'agent-type:researcher',  color: 'f9d0c4', description: '🔍 Agent: Researcher' },
  { name: 'agent-type:coordinator', color: 'd4c5f9', description: '🎯 Agent: Coordinator' },
  { name: 'type:feature',  color: '84b6eb', description: '✨ Nowa funkcja' },
  { name: 'type:bug',      color: 'd73a4a', description: '🐛 Błąd' },
  { name: 'type:chore',    color: 'cfd3d7', description: '🔧 Zadanie techniczne' },
  { name: 'type:docs',     color: '0075ca', description: '📚 Dokumentacja' },
  { name: 'type:security', color: 'b60205', description: '🔒 Bezpieczeństwo' },
];

async function setupLabels(repo) {
  const { body: existing } = await api.get(`/repos/${repo}/labels?per_page=100`);
  const existingNames = new Set(Array.isArray(existing) ? existing.map(l => l.name) : []);
  let created = 0;
  for (const label of LABELS_27) {
    if (!existingNames.has(label.name)) {
      await api.post(`/repos/${repo}/labels`, label);
      created++;
    }
    await sleep(80);
  }
  log('🏷️', `${repo}: ${created} labels added`);
}

async function createOrUpdateFile(repo, path, content, message) {
  const encoded = Buffer.from(content).toString('base64');
  const { status: getStatus, body: existing } = await api.get(`/repos/${repo}/contents/${path}`);
  const payload = { message, content: encoded };
  if (getStatus === 200 && existing.sha) payload.sha = existing.sha;
  const { status } = await api.put(`/repos/${repo}/contents/${path}`, payload);
  log(status < 300 ? '📄' : '⚠️', `${path} → ${status}`);
}

async function createRepo(name, description, readme) {
  const { status, body } = await api.post('/user/repos', {
    name, description,
    private: false,
    auto_init: true,
    has_issues: true,
    has_discussions: true,
  });
  if (status === 201) {
    log('✅', `Created ${name}: ${body.html_url}`);
    return body;
  } else if (status === 422) {
    log('ℹ️', `${name} already exists`);
    const { body: r } = await api.get(`/repos/${OWNER}/${name}`);
    return r;
  } else {
    throw new Error(`Failed ${name}: ${status} ${JSON.stringify(body).slice(0,200)}`);
  }
}

function gitInit(localPath, remoteUrl) {
  try {
    const gitDir = `${localPath}\\.git`;
    if (existsSync(gitDir.replace(/\\/g, '/'))) {
      // Already a git repo - check remote
      try {
        const remote = execSync(`git -C "${localPath}" remote get-url origin 2>&1`).toString().trim();
        if (remote === remoteUrl) {
          log('ℹ️', `${localPath}: remote already set`);
          return;
        }
        execSync(`git -C "${localPath}" remote set-url origin ${remoteUrl}`);
        log('🔗', `Updated remote for ${localPath}`);
      } catch {
        execSync(`git -C "${localPath}" remote add origin ${remoteUrl}`);
        log('🔗', `Added remote for ${localPath}`);
      }
    } else {
      execSync(`git -C "${localPath}" init && git -C "${localPath}" remote add origin ${remoteUrl}`);
      log('🔗', `Initialized git in ${localPath}`);
    }
  } catch (e) {
    log('⚠️', `git setup for ${localPath}: ${e.message.slice(0,100)}`);
  }
}

// ─── Heartbeat Discussion content ─────────────────────────────────────────────

const HEARTBEAT_BODY = `## 🤖 Ruflo Swarm Heartbeat — ${new Date().toISOString().split('T')[0]}

Codzienny status wszystkich agentów. Każdy agent potwierdza aktywność.

---

### PCBiuro (Master Coordinator)
- **Status:** 🟢 ACTIVE
- **Mode:** Coordinator
- **Tasks in progress:** See [open issues](https://github.com/mariusz-C-ICAS/ruflo-meta/issues?q=is%3Aopen+label%3Astatus%3Ain-progress)
- **Last check:** ${new Date().toLocaleString('pl-PL', {timeZone: 'Europe/Warsaw'})}
- **Next check:** Tomorrow 09:00 CET

---

### Instructions for agents:
Reply to this discussion with:
\`\`\`
[AGENT-NAME] [ROJO-#] Status: ACTIVE/IDLE/BLOCKED
Current: issue #X
Last update: [timestamp]
\`\`\`
`;

// ─── Create test task for each project ───────────────────────────────────────

async function createSampleIssue(repo, projectLabel, rojoLabel, title, body) {
  const { status, body: issue } = await api.post(`/repos/${repo}/issues`, {
    title,
    body,
    labels: ['status:ready', 'priority:normal', projectLabel, rojoLabel, 'type:chore', 'agent-type:coder'],
  });
  if (status === 201) log('🎯', `Issue created: ${issue.html_url}`);
  return status === 201;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 Ruflo Swarm — Phase 2: Repos + Discussions + Git Links');
  console.log('='.repeat(60));

  // 1. Create missing repos
  log('\n📦', 'Creating missing GitHub repos...');
  const noficoPkg = await createRepo(
    'nofico',
    '💰 NoFiCo — Notification & Financial Controller | Ruflo Swarm Rój #2',
    null
  );
  await sleep(2000);

  const coachingPkg = await createRepo(
    'c-icas-coaching',
    '🎯 C-ICAS.coaching — Coaching platform | Ruflo Swarm Rój #3',
    null
  );
  await sleep(2000);

  // 2. Add labels to new repos
  log('\n🏷️', 'Setting up labels on new repos...');
  await setupLabels(`${OWNER}/nofico`);
  await sleep(500);
  await setupLabels(`${OWNER}/c-icas-coaching`);
  await sleep(500);

  // 3. Create READMEs for new repos
  log('\n📚', 'Adding README files...');

  await createOrUpdateFile(`${OWNER}/nofico`, 'README.md',
    `# NoFiCo — Notification & Financial Controller

> Projekt zarządzany przez Ruflo Swarm | Rój #2

## Status
🔵 Inicjalizacja | Ruflo Swarm aktywny

## Ruflo Integration
- **Rój:** #2 (nofico)
- **Labels:** \`rojo:2\` | \`project:nofico\`
- **Master:** [PCBiuro @ ruflo-meta](https://github.com/mariusz-C-ICAS/ruflo-meta)
`,
    'chore: Initialize NoFiCo repo for Ruflo Swarm');
  await sleep(500);

  await createOrUpdateFile(`${OWNER}/c-icas-coaching`, 'README.md',
    `# C-ICAS.coaching — Coaching Platform

> Projekt zarządzany przez Ruflo Swarm | Rój #3

## Status
🔵 Inicjalizacja | Ruflo Swarm aktywny

## Ruflo Integration
- **Rój:** #3 (coaching)
- **Labels:** \`rojo:3\` | \`project:coaching\`
- **Master:** [PCBiuro @ ruflo-meta](https://github.com/mariusz-C-ICAS/ruflo-meta)
`,
    'chore: Initialize C-ICAS.coaching repo for Ruflo Swarm');
  await sleep(500);

  // 4. Link local dirs to GitHub via git
  log('\n🔗', 'Linking local dirs to GitHub...');
  const links = [
    { local: `${BASE_DIR}\\NoFiCo`, remote: `https://github.com/${OWNER}/nofico.git` },
    { local: `${BASE_DIR}\\www.C-ICAS.coaching`, remote: `https://github.com/${OWNER}/c-icas-coaching.git` },
  ];
  for (const { local, remote } of links) {
    if (existsSync(local.replace(/\\/g, '/'))) {
      gitInit(local, remote);
    } else {
      log('⚠️', `Local dir not found: ${local}`);
    }
  }

  // 5. Create sample task issues
  log('\n🎯', 'Creating sample tasks per project...');
  await createSampleIssue(
    `${OWNER}/calsyncpro`, 'project:calsyncpro', 'rojo:1',
    '[CALSYNCPRO] [chore] Verify production deployment status',
    `## Opis\nSprawdź status wdrożenia CalSyncPro na Azure Functions + Netlify.\n\n## Kryteria\n- [ ] Azure Functions działają\n- [ ] Netlify frontend dostępny\n- [ ] OAuth flow działa`
  );
  await sleep(300);

  await createSampleIssue(
    `${OWNER}/nofico`, 'project:nofico', 'rojo:2',
    '[NOFICO] [chore] Initial project setup and architecture review',
    `## Opis\nPrzejrzyj istniejący kod NoFiCo i zaproponuj architekturę.\n\n## Kryteria\n- [ ] Struktura katalogów udokumentowana\n- [ ] Tech stack zidentyfikowany\n- [ ] Backlog zadań stworzony`
  );
  await sleep(300);

  await createSampleIssue(
    `${OWNER}/c-icas-coaching`, 'project:coaching', 'rojo:3',
    '[COACHING] [chore] Initial project setup and architecture review',
    `## Opis\nPrzejrzyj istniejący kod C-ICAS.coaching i zaproponuj architekturę.\n\n## Kryteria\n- [ ] Struktura katalogów udokumentowana\n- [ ] Tech stack zidentyfikowany\n- [ ] Backlog zadań stworzony`
  );

  // 6. Try to enable Discussions on repos (via GraphQL if needed)
  log('\n💬', 'Enabling Discussions on repos...');
  // Already enabled via has_discussions:true during creation

  // Create Heartbeat discussion in ruflo-meta via API
  // GitHub Discussions require GraphQL API — let's create a special issue instead
  // as Discussions API requires specific categoryId which needs a GraphQL call
  log('💬', 'Creating daily heartbeat issue in ruflo-meta...');
  const today = new Date().toISOString().split('T')[0];
  const { status: hbStatus, body: hbIssue } = await api.post(`/repos/${OWNER}/ruflo-meta/issues`, {
    title: `[HEARTBEAT] Daily standup — ${today}`,
    body: HEARTBEAT_BODY,
    labels: ['status:in-progress', 'priority:normal', 'project:meta', 'type:chore', 'agent-type:coordinator'],
  });
  if (hbStatus === 201) log('✅', `Heartbeat issue: ${hbIssue.html_url}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ PHASE 2 COMPLETE');
  console.log('='.repeat(60));
  console.log('\nRepos aktywne:');
  console.log(`  📦 https://github.com/${OWNER}/calsyncpro`);
  console.log(`  📦 https://github.com/${OWNER}/ruflo-meta`);
  console.log(`  📦 https://github.com/${OWNER}/nofico`);
  console.log(`  📦 https://github.com/${OWNER}/c-icas-coaching`);
  console.log(`  📦 https://github.com/${OWNER}/www.C-ICAS.gg`);
  console.log('\nNext: Phase 3 — PCBiuro automation script (daily schedule)\n');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
