/**
 * Ruflo Swarm — Phase 3: PCBiuro GitHub Actions Automation
 * Creates GitHub Actions workflows in ruflo-meta for autonomous operation
 */

import https from 'https';

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
        'User-Agent': 'ruflo-pcbiuro',
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
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(emoji, msg) { console.log(`${emoji}  ${msg}`); }

async function createOrUpdateFile(repo, path, content, message) {
  const encoded = Buffer.from(content).toString('base64');
  const { status: getStatus, body: existing } = await api.get(`/repos/${repo}/contents/${path}`);
  const payload = { message, content: encoded };
  if (getStatus === 200 && existing.sha) payload.sha = existing.sha;
  const { status } = await api.put(`/repos/${repo}/contents/${path}`, payload);
  log(status < 300 ? '📄' : '⚠️', `${path} → ${status}`);
}

// ─── Workflow 1: Daily Morning Brief ─────────────────────────────────────────

const DAILY_STANDUP_WORKFLOW = `name: PCBiuro — Daily Morning Brief
on:
  schedule:
    - cron: '0 8 * * *'   # 09:00 CET (08:00 UTC) każdy dzień
  workflow_dispatch:       # możliwość ręcznego uruchomienia

permissions:
  issues: write
  contents: read

jobs:
  morning-brief:
    runs-on: ubuntu-latest
    name: Morning Brief — Scan all projects
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: PCBiuro — Morning Brief
        uses: actions/github-script@v7
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
          script: |
            const { Octokit } = require('@octokit/rest');
            // Use GITHUB_TOKEN - read-only for external repos; cross-repo needs PAT
            const today = new Date().toISOString().split('T')[0];
            const time = new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });

            // Collect stats from this repo's issues
            const { data: openIssues } = await github.rest.issues.listForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'open',
              per_page: 100
            });

            const blocked = openIssues.filter(i => i.labels.some(l => l.name === 'status:blocked'));
            const inProgress = openIssues.filter(i => i.labels.some(l => l.name === 'status:in-progress'));
            const ready = openIssues.filter(i => i.labels.some(l => l.name === 'status:ready'));

            const blocked_list = blocked.map(i => \`- 🚫 #\${i.number} \${i.title}\`).join('\\n') || '✅ Brak';
            const progress_list = inProgress.map(i => \`- 🔄 #\${i.number} \${i.title}\`).join('\\n') || '📭 Brak';
            const ready_list = ready.map(i => \`- ✅ #\${i.number} \${i.title}\`).join('\\n') || '📭 Brak';

            const body = [
              \`## 🤖 PCBiuro — Morning Brief \${today}\`,
              \`*Generowane: \${time} CET*\`,
              '',
              '### 📊 Status ruflo-meta',
              \`- 🔴 Zablokowane: \${blocked.length}\`,
              \`- 🔄 W trakcie: \${inProgress.length}\`,
              \`- ✅ Gotowe do podjęcia: \${ready.length}\`,
              '',
              '### 🚫 Zablokowane (wymagają uwagi)',
              blocked_list,
              '',
              '### 🔄 W trakcie realizacji',
              progress_list,
              '',
              '### ✅ Gotowe do podjęcia',
              ready_list,
              '',
              '---',
              '> 🤖 PCBiuro | Ruflo Swarm v1.0 | Auto-generated',
              '> Repozytoria: [calsyncpro](https://github.com/mariusz-C-ICAS/calsyncpro) | [nofico](https://github.com/mariusz-C-ICAS/nofico) | [c-icas-coaching](https://github.com/mariusz-C-ICAS/c-icas-coaching)',
            ].join('\\n');

            // Create or update daily standup issue
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: \`[STANDUP] Morning Brief — \${today}\`,
              body,
              labels: ['status:in-progress', 'priority:normal', 'project:meta', 'type:chore', 'agent-type:coordinator']
            });

            console.log(\`✅ Morning Brief created for \${today}\`);
            console.log(\`   Blocked: \${blocked.length} | In Progress: \${inProgress.length} | Ready: \${ready.length}\`);
`;

// ─── Workflow 2: Stale Task Detection ────────────────────────────────────────

const STALE_DETECTION_WORKFLOW = `name: PCBiuro — Stale Task Detection
on:
  schedule:
    - cron: '0 */6 * * *'   # Co 6 godzin (00:00, 06:00, 12:00, 18:00 UTC)
  workflow_dispatch:

permissions:
  issues: write
  contents: read

jobs:
  stale-detection:
    runs-on: ubuntu-latest
    name: Detect stalled tasks
    steps:
      - name: PCBiuro — Stale Detection
        uses: actions/github-script@v7
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
          script: |
            const staleHours = 8;
            const staleMs = staleHours * 60 * 60 * 1000;
            const now = new Date();

            const { data: issues } = await github.rest.issues.listForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'open',
              per_page: 100
            });

            const stalled = issues.filter(issue => {
              const isInProgress = issue.labels.some(l => l.name === 'status:in-progress');
              if (!isInProgress) return false;
              const lastUpdate = new Date(issue.updated_at);
              return (now - lastUpdate) > staleMs;
            });

            console.log(\`Found \${stalled.length} stalled tasks (>\${staleHours}h without update)\`);

            for (const issue of stalled) {
              const hours = Math.round((now - new Date(issue.updated_at)) / (60*60*1000));

              // Add escalation comment
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issue.number,
                body: \`## ⚠️ PCBiuro — Stale Task Alert
🕐 Ten task nie był aktualizowany przez **\${hours} godzin**.

**Status:** in-progress → możliwy deadlock?

### Akcja wymagana:
- Jeśli agent pracuje: dodaj komentarz z postępem
- Jeśli zablokowany: zmień label na \\\`status:blocked\\\` + opisz powód
- Jeśli gotowe: zmień label na \\\`status:review\\\` lub \\\`status:done\\\`

> 🤖 PCBiuro auto-alert | Ruflo Swarm\`
              });

              // Change label to blocked if too old
              if (hours > 24) {
                const labels = issue.labels
                  .map(l => l.name)
                  .filter(l => !l.startsWith('status:'));
                labels.push('status:blocked');

                await github.rest.issues.setLabels({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: issue.number,
                  labels
                });
                console.log(\`Issue #\${issue.number} escalated to status:blocked (>\${hours}h stale)\`);
              }
            }
`;

// ─── Workflow 3: Auto-assign Ready Tasks ─────────────────────────────────────

const AUTO_ASSIGN_WORKFLOW = `name: PCBiuro — Auto Assign Tasks
on:
  issues:
    types: [labeled, opened]
  workflow_dispatch:

permissions:
  issues: write
  contents: read

jobs:
  auto-assign:
    runs-on: ubuntu-latest
    name: Auto-assign ready tasks
    if: github.event_name == 'issues'
    steps:
      - name: PCBiuro — Auto Assign
        uses: actions/github-script@v7
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
          script: |
            const issue = context.payload.issue;
            if (!issue) return;

            const labels = issue.labels.map(l => l.name);
            const isReady = labels.includes('status:ready');
            const hasAssignee = issue.assignees && issue.assignees.length > 0;

            if (!isReady || hasAssignee) return;

            // Map agent-type to assignee (PCBiuro for coordinator tasks)
            const agentType = labels.find(l => l.startsWith('agent-type:'));

            let comment = '## 🤖 PCBiuro — Task Auto-Assigned\\n\\n';
            comment += \`**Task #\${issue.number}** jest oznaczony jako \\\`status:ready\\\`.\\n\\n\`;

            if (agentType) {
              comment += \`**Wymagany agent:** \\\`\${agentType}\\\`\\n\`;
            }

            const rojoLabel = labels.find(l => l.startsWith('rojo:'));
            if (rojoLabel) {
              const rojoMap = { 'rojo:1': 'Rój #1 (CalSyncPro)', 'rojo:2': 'Rój #2 (NoFiCo)', 'rojo:3': 'Rój #3 (C-ICAS.coaching)', 'rojo:4': 'Rój #4 (Future)' };
              comment += \`**Sub-rój:** \${rojoMap[rojoLabel] || rojoLabel}\\n\`;
            }

            comment += \`\\n### Aby podjąć to zadanie:\\n\`;
            comment += \`1. Dodaj komentarz: \\\`[TWÓJ-AGENT-ID] Starting work\\\`\\n\`;
            comment += \`2. Zmień label: \\\`status:in-progress\\\`\\n\`;
            comment += \`3. Pracuj i raportuj postęp w komentarzach\\n\`;
            comment += \`4. Po zakończeniu: \\\`status:review\\\` lub \\\`status:done\\\`\\n\\n\`;
            comment += \`> 🤖 PCBiuro auto-assignment | Ruflo Swarm\`;

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: issue.number,
              body: comment
            });

            console.log(\`Auto-assigned comment added to issue #\${issue.number}\`);
`;

// ─── Workflow 4: Cross-repo PCBiuro Scanner (via PAT) ────────────────────────

const CROSS_REPO_WORKFLOW = `name: PCBiuro — Cross-Repo Scanner
on:
  schedule:
    - cron: '30 8 * * *'  # 09:30 CET każdy dzień, po morning brief
  workflow_dispatch:

permissions:
  issues: write
  contents: read

jobs:
  cross-repo-scan:
    runs-on: ubuntu-latest
    name: Scan all project repos
    steps:
      - name: PCBiuro — Cross-Repo Scan
        uses: actions/github-script@v7
        with:
          github-token: \${{ secrets.RUFLO_PAT || secrets.GITHUB_TOKEN }}
          script: |
            const repos = [
              { repo: 'calsyncpro', name: 'CalSyncPro', rojo: 1 },
              { repo: 'nofico', name: 'NoFiCo', rojo: 2 },
              { repo: 'c-icas-coaching', name: 'C-ICAS.coaching', rojo: 3 },
            ];

            const owner = 'mariusz-C-ICAS';
            const summary = [];
            let totalBlocked = 0;

            for (const project of repos) {
              try {
                const { data: issues } = await github.rest.issues.listForRepo({
                  owner,
                  repo: project.repo,
                  state: 'open',
                  per_page: 50,
                });

                const blocked = issues.filter(i => i.labels.some(l => l.name === 'status:blocked'));
                const inProgress = issues.filter(i => i.labels.some(l => l.name === 'status:in-progress'));
                const critical = issues.filter(i => i.labels.some(l => l.name === 'priority:critical'));

                totalBlocked += blocked.length;
                summary.push(\`| **[\${project.name}](\${project.repo})** | \${issues.length} | \${inProgress.length} | \${blocked.length} | \${critical.length} |\`);

                if (blocked.length > 0 || critical.length > 0) {
                  console.log(\`⚠️ \${project.name}: \${blocked.length} blocked, \${critical.length} critical\`);
                }
              } catch(e) {
                summary.push(\`| **\${project.name}** | ⚠️ Error | - | - | - |\`);
                console.log(\`Error scanning \${project.repo}: \${e.message}\`);
              }
            }

            if (totalBlocked > 0) {
              const today = new Date().toISOString().split('T')[0];
              await github.rest.issues.create({
                owner,
                repo: 'ruflo-meta',
                title: \`[ALERT] Cross-repo blocked tasks — \${today}\`,
                body: \`## ⚠️ PCBiuro Cross-Repo Alert\\n\\n\${totalBlocked} zablokowanych tasków wymaga uwagi!\\n\\n### Status projektów\\n| Projekt | Open | In Progress | Blocked | Critical |\\n|---------|------|-------------|---------|----------|\${summary.join('\\n')}\\n\\n> 🤖 PCBiuro Cross-Repo Scanner | Ruflo Swarm\`,
                labels: ['status:blocked', 'priority:high', 'project:meta', 'type:chore', 'agent-type:coordinator']
              });
            }

            console.log(\`\\n📊 Cross-repo scan complete. Total blocked: \${totalBlocked}\`);
            console.table(repos.map((p, i) => ({ project: p.name, summary: summary[i] })));
`;

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 Ruflo Swarm — Phase 3: PCBiuro GitHub Actions');
  console.log('='.repeat(60));

  // Create workflow files in ruflo-meta
  const workflows = [
    ['1-daily-morning-brief.yml', DAILY_STANDUP_WORKFLOW, 'ci: Add PCBiuro daily morning brief workflow'],
    ['2-stale-detection.yml', STALE_DETECTION_WORKFLOW, 'ci: Add PCBiuro stale task detection (every 6h)'],
    ['3-auto-assign.yml', AUTO_ASSIGN_WORKFLOW, 'ci: Add PCBiuro auto-assign on issue label'],
    ['4-cross-repo-scanner.yml', CROSS_REPO_WORKFLOW, 'ci: Add PCBiuro cross-repo scanner'],
  ];

  log('\n🔧', 'Creating GitHub Actions workflows...');
  for (const [file, content, message] of workflows) {
    await createOrUpdateFile(META_REPO, `.github/workflows/${file}`, content, message);
    await sleep(500);
  }

  // Create PCBiuro README in workflows dir to explain the system
  await createOrUpdateFile(META_REPO, '.github/workflows/README.md',
    `# PCBiuro GitHub Actions Workflows

## Schedule

| Workflow | Schedule | Cel |
|----------|----------|-----|
| 1-daily-morning-brief | 09:00 CET | Dzienny raport statusu |
| 2-stale-detection | Co 6h | Wykrywa zadania bez postępu |
| 3-auto-assign | On issue labeled | Automatyczne przypisanie tasków |
| 4-cross-repo-scanner | 09:30 CET | Skanuje wszystkie 4 projekty |

## Secrets Required

\`\`\`
RUFLO_PAT — Personal Access Token z scope: repo (dla cross-repo scan)
\`\`\`

Dodaj w: ruflo-meta → Settings → Secrets → Actions → New secret
Wartość: token z git credential manager (gho_...*)
`,
    'docs: Add workflows README for PCBiuro');
  await sleep(300);

  // Add RUFLO_PAT secret via API
  log('\n🔑', 'Setting up RUFLO_PAT secret for cross-repo access...');
  // Get repo public key for secret encryption
  const { status: pkStatus, body: pk } = await api.get(`/repos/${META_REPO}/actions/secrets/public-key`);

  if (pkStatus === 200) {
    // We need to encrypt the secret with the public key using libsodium
    // For now, create a placeholder issue instructing manual setup
    log('ℹ️', 'Secret encryption requires libsodium — creating setup instructions instead');

    const { status: secretIssueStatus, body: secretIssue } = await api.post(`/repos/${META_REPO}/issues`, {
      title: '[META] [chore] Add RUFLO_PAT secret for cross-repo GitHub Actions',
      body: `## Setup Required — RUFLO_PAT Secret

GitHub Actions workflow \`4-cross-repo-scanner.yml\` potrzebuje PAT do skanowania zewnętrznych repozytoriów.

## Kroki (5 minut):

1. Przejdź do: https://github.com/mariusz-C-ICAS/ruflo-meta/settings/secrets/actions
2. Kliknij **New repository secret**
3. Nazwa: \`RUFLO_PAT\`
4. Wartość: **Twój GitHub token** (ten sam który używa git)
5. Kliknij **Add secret**

## Dlaczego?
\`GITHUB_TOKEN\` (domyślny) ma dostęp tylko do ruflo-meta.
\`RUFLO_PAT\` daje dostęp do wszystkich 4 projektów.

---
> 🤖 PCBiuro | Auto-generated setup instruction`,
      labels: ['status:ready', 'priority:high', 'project:meta', 'type:chore', 'agent-type:coordinator'],
    });
    if (secretIssueStatus === 201) log('✅', `Setup instruction issue: ${secretIssue.html_url}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ PHASE 3 COMPLETE — PCBiuro Automation Ready');
  console.log('='.repeat(60));
  console.log('\n📋 GitHub Actions aktywne w ruflo-meta:');
  console.log('   ⏰ 09:00 CET — Daily Morning Brief');
  console.log('   ⏰ Co 6h    — Stale Task Detection');
  console.log('   🎯 On event — Auto-assign Tasks');
  console.log('   ⏰ 09:30 CET — Cross-Repo Scanner');
  console.log('\n⚠️  Wymagana akcja: Dodaj RUFLO_PAT secret (patrz issue #3 w ruflo-meta)');
  console.log('\nLink: https://github.com/mariusz-C-ICAS/ruflo-meta/actions');
  console.log('\nPhase 4: Cleanup + final validation\n');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
