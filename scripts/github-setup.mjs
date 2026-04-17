/**
 * Ruflo Swarm — GitHub Infrastructure Setup
 * Phase 1: Labels, ruflo-meta repo, Agent Registry, Swarm Operations doc
 *
 * Usage: node scripts/github-setup.mjs
 */

import https from 'https';

const TOKEN = 'process.env.RUFLO_PAT';
const OWNER = 'mariusz-C-ICAS';

// ─── GitHub API helpers ───────────────────────────────────────────────────────

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'User-Agent': 'ruflo-swarm-setup',
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
  delete: (path) => apiRequest('DELETE', path),
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function log(emoji, msg) { console.log(`${emoji}  ${msg}`); }

// ─── Label Definitions ────────────────────────────────────────────────────────

const LABELS = [
  // Priority
  { name: 'priority:critical', color: 'd73a4a', description: '🔴 Natychmiastowa akcja wymagana' },
  { name: 'priority:high',     color: 'e4e669', description: '🟡 Wysoki priorytet' },
  { name: 'priority:normal',   color: '0075ca', description: '🔵 Normalny priorytet' },
  { name: 'priority:low',      color: 'cfd3d7', description: '⚪ Niski priorytet' },

  // Status
  { name: 'status:blocked',     color: 'b60205', description: '🚫 Zablokowane - wymaga uwagi' },
  { name: 'status:ready',       color: '0e8a16', description: '✅ Gotowe do realizacji' },
  { name: 'status:in-progress', color: '1d76db', description: '🔄 W trakcie realizacji' },
  { name: 'status:done',        color: '5319e7', description: '✔️ Zakończone' },
  { name: 'status:review',      color: 'fbca04', description: '👁️ Do przeglądu' },

  // Project
  { name: 'project:calsyncpro',  color: '0052cc', description: 'Projekt CalSyncPro' },
  { name: 'project:nofico',      color: '006b75', description: 'Projekt NoFiCo' },
  { name: 'project:coaching',    color: 'e4e669', description: 'Projekt C-ICAS.coaching' },
  { name: 'project:meta',        color: 'bfd4f2', description: 'Ruflo meta / cross-project' },

  // Rój assignment
  { name: 'rojo:1', color: 'f9d0c4', description: 'Rój #1 — CalSyncPro' },
  { name: 'rojo:2', color: 'c2e0c6', description: 'Rój #2 — NoFiCo' },
  { name: 'rojo:3', color: 'bfd4f2', description: 'Rój #3 — C-ICAS.coaching' },
  { name: 'rojo:4', color: 'fef2c0', description: 'Rój #4 — Future' },

  // Agent type
  { name: 'agent-type:coder',       color: '0075ca', description: '💻 Agent: Coder' },
  { name: 'agent-type:tester',      color: '0e8a16', description: '🧪 Agent: Tester' },
  { name: 'agent-type:reviewer',    color: 'e4e669', description: '👁️ Agent: Reviewer' },
  { name: 'agent-type:researcher',  color: 'f9d0c4', description: '🔍 Agent: Researcher' },
  { name: 'agent-type:coordinator', color: 'd4c5f9', description: '🎯 Agent: Coordinator/PCBiuro' },

  // Type
  { name: 'type:feature',  color: '84b6eb', description: '✨ Nowa funkcja' },
  { name: 'type:bug',      color: 'd73a4a', description: '🐛 Błąd' },
  { name: 'type:chore',    color: 'cfd3d7', description: '🔧 Zadanie techniczne' },
  { name: 'type:docs',     color: '0075ca', description: '📚 Dokumentacja' },
  { name: 'type:security', color: 'b60205', description: '🔒 Bezpieczeństwo' },
];

// ─── Phase 1a: Create Labels ──────────────────────────────────────────────────

async function setupLabels(repo) {
  log('🏷️', `Setting up labels on ${repo}...`);

  // Get existing labels
  const { body: existing } = await api.get(`/repos/${repo}/labels?per_page=100`);
  const existingNames = new Set(Array.isArray(existing) ? existing.map(l => l.name) : []);

  let created = 0, updated = 0, skipped = 0;

  for (const label of LABELS) {
    if (existingNames.has(label.name)) {
      // Update existing
      const { status } = await api.patch(`/repos/${repo}/labels/${encodeURIComponent(label.name)}`, {
        color: label.color, description: label.description
      });
      if (status === 200) updated++;
    } else {
      // Create new
      const { status, body } = await api.post(`/repos/${repo}/labels`, label);
      if (status === 201) created++;
      else if (status === 422) skipped++; // already exists
      else log('⚠️', `Label ${label.name}: status ${status} - ${JSON.stringify(body).slice(0,100)}`);
    }
    await sleep(100); // rate limit protection
  }

  log('✅', `${repo}: ${created} created, ${updated} updated, ${skipped} skipped`);
}

// ─── Phase 1b: Create ruflo-meta repo ─────────────────────────────────────────

async function createRufloMetaRepo() {
  log('📦', 'Creating ruflo-meta repository...');

  const { status, body } = await api.post('/user/repos', {
    name: 'ruflo-meta',
    description: '🤖 Ruflo Swarm — Cross-project coordination hub. PCBiuro master orchestrator.',
    private: false,
    auto_init: true,
    has_issues: true,
    has_discussions: true,
    has_projects: false,
    has_wiki: false,
  });

  if (status === 201) {
    log('✅', `Created ruflo-meta: ${body.html_url}`);
    return body;
  } else if (status === 422 && body.errors?.[0]?.message?.includes('already exists')) {
    log('ℹ️', 'ruflo-meta already exists, fetching...');
    const { body: existing } = await api.get(`/repos/${OWNER}/ruflo-meta`);
    return existing;
  } else {
    throw new Error(`Failed to create ruflo-meta: ${status} ${JSON.stringify(body)}`);
  }
}

// ─── Phase 1c: Create file in repo via API ────────────────────────────────────

async function createOrUpdateFile(repo, path, content, message) {
  const encoded = Buffer.from(content).toString('base64');

  // Check if file exists
  const { status: getStatus, body: existing } = await api.get(`/repos/${repo}/contents/${path}`);

  if (getStatus === 200 && existing.sha) {
    // Update
    const { status } = await api.put(`/repos/${repo}/contents/${path}`, {
      message, content: encoded, sha: existing.sha
    });
    log(status === 200 ? '📝' : '⚠️', `Updated ${path} (${status})`);
  } else {
    // Create
    const { status } = await api.put(`/repos/${repo}/contents/${path}`, {
      message, content: encoded
    });
    log(status === 201 ? '📄' : '⚠️', `Created ${path} (${status})`);
  }
}

// ─── Content: AGENTS_REGISTRY.md ─────────────────────────────────────────────

const AGENTS_REGISTRY = `# Ruflo Swarm — Agent Registry
*Last updated: ${new Date().toISOString().split('T')[0]}*

## Master Coordinator

| Agent | ID | Role | Status |
|-------|-----|------|--------|
| **PCBiuro** | agent-pcbiuro | HYBRID: Queen ↔ Coordinator ↔ Manager | 🟢 ACTIVE |

**PCBiuro capabilities:**
- Task orchestration across 4 sub-roje
- Cross-project sync and escalation
- Daily standup & heartbeat monitoring
- Autonomous task distribution (no human needed)
- GitHub Issues as task queue (read/write/label)

---

## Rój #1 — CalSyncPro

**Repo:** [mariusz-C-ICAS/calsyncpro](https://github.com/mariusz-C-ICAS/calsyncpro)
**Label:** \`rojo:1\` | \`project:calsyncpro\`

| Agent | Type | Status |
|-------|------|--------|
| coder-1 | agent-type:coder | 🔵 STANDBY |
| tester-1 | agent-type:tester | 🔵 STANDBY |
| reviewer-1 | agent-type:reviewer | 🔵 STANDBY |
| researcher-1 | agent-type:researcher | 🔵 STANDBY |

---

## Rój #2 — NoFiCo

**Repo:** mariusz-C-ICAS/nofico *(do utworzenia)*
**Label:** \`rojo:2\` | \`project:nofico\`

| Agent | Type | Status |
|-------|------|--------|
| coder-2 | agent-type:coder | 🔵 STANDBY |
| tester-2 | agent-type:tester | 🔵 STANDBY |
| reviewer-2 | agent-type:reviewer | 🔵 STANDBY |
| researcher-2 | agent-type:researcher | 🔵 STANDBY |

---

## Rój #3 — C-ICAS.coaching

**Repo:** mariusz-C-ICAS/www.C-ICAS.gg
**Label:** \`rojo:3\` | \`project:coaching\`

| Agent | Type | Status |
|-------|------|--------|
| coder-3 | agent-type:coder | 🔵 STANDBY |
| tester-3 | agent-type:tester | 🔵 STANDBY |
| reviewer-3 | agent-type:reviewer | 🔵 STANDBY |
| researcher-3 | agent-type:researcher | 🔵 STANDBY |

---

## Rój #4 — Future Project

**Repo:** TBD
**Label:** \`rojo:4\` | \`project:meta\`

| Agent | Type | Status |
|-------|------|--------|
| coder-4 | agent-type:coder | 🔵 STANDBY |
| tester-4 | agent-type:tester | 🔵 STANDBY |

---

## Escalation Path

\`\`\`
Task blocked > 2h
  ↓
PCBiuro diagnoses (Coordinator mode)
  ↓
  ├─ Solvable → PCBiuro fixes + updates issue
  ├─ Reassignable → Backup agent assigned
  └─ Requires human → GitHub Discussion + @mariusz-C-ICAS
\`\`\`

## Agent Communication Protocol

1. Agent reads task from GitHub Issue (labeled \`rojo:X\` + \`status:ready\`)
2. Agent adds comment: \`[AGENT-NAME] Starting work\`
3. Agent updates label: \`status:in-progress\`
4. Agent works...
5. Agent adds comment: \`[AGENT-NAME] Done — [summary]\`
6. Agent updates label: \`status:review\` or \`status:done\`
7. PCBiuro validates and closes issue
`;

// ─── Content: RUFLO_SWARM_OPERATIONS.md ──────────────────────────────────────

const SWARM_OPS = `# Ruflo Swarm — Operations Manual
*Version: 1.0.0 | Updated: ${new Date().toISOString().split('T')[0]}*

## Architecture

\`\`\`
PCBiuro (Queen/Coordinator/Manager)
  ├─ Rój #1: CalSyncPro     → github.com/mariusz-C-ICAS/calsyncpro
  ├─ Rój #2: NoFiCo          → TBD
  ├─ Rój #3: C-ICAS.coaching → github.com/mariusz-C-ICAS/www.C-ICAS.gg
  ├─ Rój #4: Future          → TBD
  └─ Meta: Cross-project     → github.com/mariusz-C-ICAS/ruflo-meta (this repo)
\`\`\`

## Task Queue (GitHub Issues)

### Issue Format

**Title:** \`[PROJECT] [TYPE] Short description\`

**Labels required:**
- \`project:X\` — which project
- \`priority:X\` — critical / high / normal / low
- \`status:X\` — blocked / ready / in-progress / review / done
- \`rojo:X\` — which sub-swarm (1-4)
- \`agent-type:X\` — what kind of agent needed
- \`type:X\` — feature / bug / chore / docs / security

### Status Flow

\`\`\`
status:ready
  → (agent picks up)
status:in-progress
  → (agent finishes)
status:review
  → (PCBiuro or reviewer validates)
status:done → (issue closed)
\`\`\`

## PCBiuro Daily Duties

### Morning Brief (Queen mode)
1. Scan ALL open issues across all repos
2. Filter \`status:blocked\` + \`priority:critical\`
3. Escalate / reassign / unblock
4. Post daily standup in Discussions

### Task Distribution (Manager mode)
1. Find issues: \`status:ready\` without assignee
2. Match: \`rojo:X\` + \`agent-type:Y\`
3. Assign + label \`status:in-progress\`

### Progress Monitoring (Coordinator mode)
1. Check \`status:in-progress\` issues
2. Read agent comments
3. If stalled > 2h → escalate

### Completion Verification (Queen mode)
1. Review \`status:review\` issues
2. Verify acceptance criteria via comments
3. Label \`status:done\` + close issue

## Label Reference

| Label | Meaning |
|-------|---------|
| \`priority:critical\` | 🔴 Drop everything |
| \`priority:high\` | 🟡 Today |
| \`priority:normal\` | 🔵 This sprint |
| \`priority:low\` | ⚪ Backlog |
| \`status:blocked\` | 🚫 Needs unblocking |
| \`status:ready\` | ✅ Agent can start |
| \`status:in-progress\` | 🔄 Agent working |
| \`status:review\` | 👁️ Needs validation |
| \`status:done\` | ✔️ Complete |

## Repositories

| Repo | Project | Sub-swarm |
|------|---------|-----------|
| mariusz-C-ICAS/calsyncpro | CalSyncPro | Rój #1 |
| mariusz-C-ICAS/nofico | NoFiCo | Rój #2 |
| mariusz-C-ICAS/www.C-ICAS.gg | C-ICAS.coaching | Rój #3 |
| mariusz-C-ICAS/ruflo-meta | Cross-project | All |

## Escalation

\`\`\`
Issue blocked
  ↓ PCBiuro diagnoses (max 5min)
  ├─ Technical block → PCBiuro solves
  ├─ Resource block → Reassign agent
  └─ Business decision → Create Discussion @mariusz-C-ICAS
\`\`\`

## Golden Rules

1. GitHub Issues = Source of Truth (not tasks.md)
2. Every state change = label update + comment
3. PCBiuro checks all repos every morning
4. Blocked > 2h = escalate immediately
5. Done = issue closed (not just labeled)
`;

// ─── Content: Issue Template ──────────────────────────────────────────────────

const ISSUE_TEMPLATE = `---
name: Ruflo Task
about: Create a task for a Ruflo agent
title: '[PROJECT] [TYPE] Short description'
labels: 'status:ready, priority:normal'
assignees: ''
---

## Opis zadania
*Co dokładnie należy zrobić?*

## Kryteria akceptacji
- [ ] Kryterium 1
- [ ] Kryterium 2
- [ ] Kryterium 3

## Kontekst
*Dlaczego to zadanie jest ważne? Jakie pliki są dotknięte?*

## Assigned Agents
- **Lead:** [agent-type]
- **Support:** [optional]

## Linki
- Powiązane issue: #
- PR: #

---
*Rój: rojo:X | Projekt: project:X | Typ: type:X*
`;

// ─── Content: README for ruflo-meta ──────────────────────────────────────────

const META_README = `# Ruflo Meta — Swarm Coordination Hub

> Centralne repozytorium koordynacyjne dla systemu Ruflo Swarm (4 projekty).

## 🤖 PCBiuro — Master Orchestrator

PCBiuro to hybrydowy agent zarządzający, który przełącza role kontekstowo:
- **Queen** — decyzje strategiczne, eskalacje
- **Coordinator** — neutralna koordynacja między rojami
- **Manager** — dystrybucja zadań, monitoring postępu

## 📋 Task Queue

Każde GitHub Issue to zadanie dla agenta:
- Labels definiują projekt, priorytet, status i przypisanie do roju
- Comments = komunikacja między agentami
- PCBiuro = automatyczny orchestrator (bez interwencji człowieka)

## 🗂️ Struktura

| Plik | Cel |
|------|-----|
| [docs/AGENTS_REGISTRY.md](docs/AGENTS_REGISTRY.md) | Lista agentów i ich zdolności |
| [docs/RUFLO_SWARM_OPERATIONS.md](docs/RUFLO_SWARM_OPERATIONS.md) | Manual operacyjny |
| [.github/ISSUE_TEMPLATE/task.md](.github/ISSUE_TEMPLATE/task.md) | Template dla tasków |

## 🏗️ Sub-Roje

| # | Projekt | Repo |
|---|---------|------|
| 1 | CalSyncPro | [mariusz-C-ICAS/calsyncpro](https://github.com/mariusz-C-ICAS/calsyncpro) |
| 2 | NoFiCo | TBD |
| 3 | C-ICAS.coaching | [mariusz-C-ICAS/www.C-ICAS.gg](https://github.com/mariusz-C-ICAS/www.C-ICAS.gg) |
| 4 | Future | TBD |

## 🚀 Quick Start

\`\`\`
New task → Open Issue here or in project repo
PCBiuro → Reads, assigns agent, monitors
Agent → Works, comments progress
PCBiuro → Verifies, closes issue
\`\`\`
`;

// ─── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 Ruflo Swarm — GitHub Infrastructure Setup');
  console.log('='.repeat(50));
  console.log(`Owner: ${OWNER} | Date: ${new Date().toISOString()}\n`);

  // 1. Create ruflo-meta repo
  const metaRepo = await createRufloMetaRepo();
  await sleep(2000); // wait for GitHub to initialize repo

  // 2. Create labels on existing repos
  const repos = [
    `${OWNER}/calsyncpro`,
    `${OWNER}/ruflo-meta`,
    `${OWNER}/www.C-ICAS.gg`,
  ];

  for (const repo of repos) {
    await setupLabels(repo);
    await sleep(500);
  }

  // 3. Create docs in ruflo-meta
  log('\n📚', 'Creating documentation in ruflo-meta...');
  await sleep(1000);

  await createOrUpdateFile(`${OWNER}/ruflo-meta`, 'README.md', META_README,
    'docs: Add Ruflo Meta README — swarm coordination hub');
  await sleep(500);

  await createOrUpdateFile(`${OWNER}/ruflo-meta`, 'docs/AGENTS_REGISTRY.md', AGENTS_REGISTRY,
    'docs: Add Agent Registry — all sub-roje agents and PCBiuro');
  await sleep(500);

  await createOrUpdateFile(`${OWNER}/ruflo-meta`, 'docs/RUFLO_SWARM_OPERATIONS.md', SWARM_OPS,
    'docs: Add Swarm Operations Manual — PCBiuro workflow and protocols');
  await sleep(500);

  await createOrUpdateFile(`${OWNER}/ruflo-meta`, '.github/ISSUE_TEMPLATE/task.md', ISSUE_TEMPLATE,
    'chore: Add Issue Template for Ruflo task queue');

  // 4. Create first real issue in ruflo-meta as coordination test
  log('\n🎯', 'Creating first coordination issue in ruflo-meta...');
  const { status: issueStatus, body: issue } = await api.post(`/repos/${OWNER}/ruflo-meta/issues`, {
    title: '[META] [chore] Setup NoFiCo and C-ICAS.coaching GitHub repos',
    body: `## Opis zadania
Skonfiguruj GitHub repos dla projektów NoFiCo i C-ICAS.coaching w ramach Ruflo swarm.

## Kryteria akceptacji
- [ ] Repo \`mariusz-C-ICAS/nofico\` istnieje na GitHub
- [ ] Repo \`mariusz-C-ICAS/c-icas-coaching\` istnieje na GitHub
- [ ] Labele Ruflo dodane do obu repozytoriów
- [ ] Lokalne foldery NoFiCo i www.C-ICAS.coaching podłączone do GitHub remote

## Kontekst
Rój Ruflo działa na 4 projektach. Tylko CalSyncPro ma GitHub repo.
NoFiCo i C-ICAS.coaching wymagają setup.

## Assigned Agents
- **Lead:** PCBiuro (agent-type:coordinator)

---
*Rój: rojo:4 | Projekt: project:meta | Typ: type:chore*`,
    labels: ['status:ready', 'priority:high', 'project:meta', 'type:chore', 'agent-type:coordinator'],
  });

  if (issueStatus === 201) {
    log('✅', `Created coordination issue #${issue.number}: ${issue.html_url}`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ PHASE 1 COMPLETE — Ruflo Swarm Infrastructure Ready');
  console.log('='.repeat(50));
  console.log(`\n📦 ruflo-meta: https://github.com/${OWNER}/ruflo-meta`);
  console.log(`🏷️  Labels: ${LABELS.length} labels × ${repos.length} repos`);
  console.log(`📚 Docs: README, AGENTS_REGISTRY, SWARM_OPERATIONS, ISSUE_TEMPLATE`);
  console.log(`🎯 First issue created in ruflo-meta`);
  console.log('\nNext: Phase 2 — Create NoFiCo + coaching repos, setup Discussions\n');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
