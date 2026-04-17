# Ruflo Swarm — Operations Manual
*Version: 1.0.0 | Updated: 2026-04-17*

## Architecture

```
PCBiuro (Queen/Coordinator/Manager)
  ├─ Rój #1: CalSyncPro     → github.com/mariusz-C-ICAS/calsyncpro
  ├─ Rój #2: NoFiCo          → TBD
  ├─ Rój #3: C-ICAS.coaching → github.com/mariusz-C-ICAS/www.C-ICAS.gg
  ├─ Rój #4: Future          → TBD
  └─ Meta: Cross-project     → github.com/mariusz-C-ICAS/ruflo-meta (this repo)
```

## Task Queue (GitHub Issues)

### Issue Format

**Title:** `[PROJECT] [TYPE] Short description`

**Labels required:**
- `project:X` — which project
- `priority:X` — critical / high / normal / low
- `status:X` — blocked / ready / in-progress / review / done
- `rojo:X` — which sub-swarm (1-4)
- `agent-type:X` — what kind of agent needed
- `type:X` — feature / bug / chore / docs / security

### Status Flow

```
status:ready
  → (agent picks up)
status:in-progress
  → (agent finishes)
status:review
  → (PCBiuro or reviewer validates)
status:done → (issue closed)
```

## PCBiuro Daily Duties

### Morning Brief (Queen mode)
1. Scan ALL open issues across all repos
2. Filter `status:blocked` + `priority:critical`
3. Escalate / reassign / unblock
4. Post daily standup in Discussions

### Task Distribution (Manager mode)
1. Find issues: `status:ready` without assignee
2. Match: `rojo:X` + `agent-type:Y`
3. Assign + label `status:in-progress`

### Progress Monitoring (Coordinator mode)
1. Check `status:in-progress` issues
2. Read agent comments
3. If stalled > 2h → escalate

### Completion Verification (Queen mode)
1. Review `status:review` issues
2. Verify acceptance criteria via comments
3. Label `status:done` + close issue

## Label Reference

| Label | Meaning |
|-------|---------|
| `priority:critical` | 🔴 Drop everything |
| `priority:high` | 🟡 Today |
| `priority:normal` | 🔵 This sprint |
| `priority:low` | ⚪ Backlog |
| `status:blocked` | 🚫 Needs unblocking |
| `status:ready` | ✅ Agent can start |
| `status:in-progress` | 🔄 Agent working |
| `status:review` | 👁️ Needs validation |
| `status:done` | ✔️ Complete |

## Repositories

| Repo | Project | Sub-swarm |
|------|---------|-----------|
| mariusz-C-ICAS/calsyncpro | CalSyncPro | Rój #1 |
| mariusz-C-ICAS/nofico | NoFiCo | Rój #2 |
| mariusz-C-ICAS/www.C-ICAS.gg | C-ICAS.coaching | Rój #3 |
| mariusz-C-ICAS/ruflo-meta | Cross-project | All |

## Escalation

```
Issue blocked
  ↓ PCBiuro diagnoses (max 5min)
  ├─ Technical block → PCBiuro solves
  ├─ Resource block → Reassign agent
  └─ Business decision → Create Discussion @mariusz-C-ICAS
```

## Golden Rules

1. GitHub Issues = Source of Truth (not tasks.md)
2. Every state change = label update + comment
3. PCBiuro checks all repos every morning
4. Blocked > 2h = escalate immediately
5. Done = issue closed (not just labeled)
