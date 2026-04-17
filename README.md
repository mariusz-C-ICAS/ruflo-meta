# Ruflo Meta — Swarm Coordination Hub

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

```
New task → Open Issue here or in project repo
PCBiuro → Reads, assigns agent, monitors
Agent → Works, comments progress
PCBiuro → Verifies, closes issue
```
