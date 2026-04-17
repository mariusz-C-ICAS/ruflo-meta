/**
 * Create final summary issue in ruflo-meta
 */
import https from 'https';

const TOKEN = 'process.env.RUFLO_PAT';
const today = new Date().toISOString().split('T')[0];

function apiPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'api.github.com', path, method: 'POST',
      headers: {
        'Authorization': `token ${TOKEN}`, 'User-Agent': 'ruflo',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(opts, r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => { try { resolve({ s: r.statusCode, b: JSON.parse(d) }); } catch { resolve({ s: r.statusCode, b: d }); } });
    });
    req.on('error', reject); req.write(data); req.end();
  });
}

const summaryBody = `# ✅ Ruflo Swarm — Pełny Setup Zakończony

**Data:** ${today}
**Wykonane przez:** PCBiuro (Master Coordinator — Autonomiczny)

---

## Zrealizowane fazy

### Phase 1 — GitHub Labels (27 labelów × 3 repos)
- ✅ \`mariusz-C-ICAS/calsyncpro\` — 27 labels (priority, status, project, rojo, agent-type, type)
- ✅ \`mariusz-C-ICAS/ruflo-meta\` — 27 labels
- ✅ \`mariusz-C-ICAS/www.C-ICAS.gg\` — 27 labels
- ✅ Docs: AGENTS_REGISTRY.md, RUFLO_SWARM_OPERATIONS.md, ISSUE_TEMPLATE

### Phase 2 — Brakujące repos + Git
- ✅ \`mariusz-C-ICAS/nofico\` — utworzony, 27 labels
- ✅ \`mariusz-C-ICAS/c-icas-coaching\` — utworzony, 27 labels
- ✅ Lokalne foldery NoFiCo, www.C-ICAS.coaching — podłączone do GitHub remote
- ✅ Sample task issues w każdym projekcie (status:ready)

### Phase 3 — PCBiuro GitHub Actions (4 workflows)
- ✅ \`1-daily-morning-brief.yml\` — codziennie 09:00 CET
- ✅ \`2-stale-detection.yml\` — co 6h (00:00, 06:00, 12:00, 18:00 UTC)
- ✅ \`3-auto-assign.yml\` — automatycznie przy etykietowaniu issues
- ✅ \`4-cross-repo-scanner.yml\` — codziennie 09:30 CET (cross-project)
- ✅ \`RUFLO_PAT\` secret — dostęp do wszystkich 4 projektów

---

## Aktywna architektura

\`\`\`
PCBiuro — Master Coordinator (mariusz-C-ICAS/ruflo-meta)
  │
  ├─ Rój #1 — CalSyncPro    → /calsyncpro
  ├─ Rój #2 — NoFiCo        → /nofico
  ├─ Rój #3 — C-ICAS.coach  → /c-icas-coaching
  └─ Rój #4 — Future        → TBD
\`\`\`

## GitHub Issues = Task Queue (zastępuje tasks.md)

| Akcja | Jak |
|-------|-----|
| Nowy task | Otwórz Issue w odpowiednim repo |
| Przypisz agenta | Dodaj label \`rojo:X\` + \`agent-type:Y\` |
| Status ready | Label \`status:ready\` |
| Agent zaczyna | Comment + label \`status:in-progress\` |
| Zakończone | Label \`status:done\` + close |

## Automatyzacja PCBiuro (zero interwencji)

- **Codziennie 09:00** — Morning Brief z podsumowaniem tasków
- **Co 6h** — Wykrywa taski bez postępu, eskaluje po 24h
- **Real-time** — Auto-assign instrukcje przy każdym nowym tasku
- **Codziennie 09:30** — Skanuje wszystkie 4 projekty jednocześnie

---

> 🤖 PCBiuro | Ruflo Swarm v1.0 | FULLY AUTONOMOUS | ${today}`;

const { s, b } = await apiPost('/repos/mariusz-C-ICAS/ruflo-meta/issues', {
  title: `[META] ✅ Ruflo Swarm Setup Complete — All phases done (${today})`,
  body: summaryBody,
  labels: ['status:done', 'priority:normal', 'project:meta', 'type:docs', 'agent-type:coordinator'],
});

if (s === 201) {
  console.log('✅ Summary issue:', b.html_url);
  console.log('\n🎉 RUFLO SWARM FULLY OPERATIONAL!');
  console.log('  📦 ruflo-meta: https://github.com/mariusz-C-ICAS/ruflo-meta');
  console.log('  📋 Issues:     https://github.com/mariusz-C-ICAS/ruflo-meta/issues');
  console.log('  ⚙️  Actions:   https://github.com/mariusz-C-ICAS/ruflo-meta/actions');
} else {
  console.error('Error:', s, JSON.stringify(b).slice(0, 200));
}
