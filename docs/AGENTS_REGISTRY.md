# Ruflo Swarm — Agent Registry
*Last updated: 2026-04-17*

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
**Label:** `rojo:1` | `project:calsyncpro`

| Agent | Type | Status |
|-------|------|--------|
| coder-1 | agent-type:coder | 🔵 STANDBY |
| tester-1 | agent-type:tester | 🔵 STANDBY |
| reviewer-1 | agent-type:reviewer | 🔵 STANDBY |
| researcher-1 | agent-type:researcher | 🔵 STANDBY |

---

## Rój #2 — NoFiCo

**Repo:** mariusz-C-ICAS/nofico *(do utworzenia)*
**Label:** `rojo:2` | `project:nofico`

| Agent | Type | Status |
|-------|------|--------|
| coder-2 | agent-type:coder | 🔵 STANDBY |
| tester-2 | agent-type:tester | 🔵 STANDBY |
| reviewer-2 | agent-type:reviewer | 🔵 STANDBY |
| researcher-2 | agent-type:researcher | 🔵 STANDBY |

---

## Rój #3 — C-ICAS.coaching

**Repo:** mariusz-C-ICAS/www.C-ICAS.gg
**Label:** `rojo:3` | `project:coaching`

| Agent | Type | Status |
|-------|------|--------|
| coder-3 | agent-type:coder | 🔵 STANDBY |
| tester-3 | agent-type:tester | 🔵 STANDBY |
| reviewer-3 | agent-type:reviewer | 🔵 STANDBY |
| researcher-3 | agent-type:researcher | 🔵 STANDBY |

---

## Rój #4 — Future Project

**Repo:** TBD
**Label:** `rojo:4` | `project:meta`

| Agent | Type | Status |
|-------|------|--------|
| coder-4 | agent-type:coder | 🔵 STANDBY |
| tester-4 | agent-type:tester | 🔵 STANDBY |

---

## Escalation Path

```
Task blocked > 2h
  ↓
PCBiuro diagnoses (Coordinator mode)
  ↓
  ├─ Solvable → PCBiuro fixes + updates issue
  ├─ Reassignable → Backup agent assigned
  └─ Requires human → GitHub Discussion + @mariusz-C-ICAS
```

## Agent Communication Protocol

1. Agent reads task from GitHub Issue (labeled `rojo:X` + `status:ready`)
2. Agent adds comment: `[AGENT-NAME] Starting work`
3. Agent updates label: `status:in-progress`
4. Agent works...
5. Agent adds comment: `[AGENT-NAME] Done — [summary]`
6. Agent updates label: `status:review` or `status:done`
7. PCBiuro validates and closes issue
