# Ruflo Swarm — Agent Registry
*Last updated: 2026-04-25*

## Master Coordinator

| Agent | Rola | Status |
|-------|------|--------|
| **PCBiuro** | HYBRID: Queen ↔ Coordinator ↔ Manager | 🟢 ACTIVE |

**PCBiuro scope:** 4 projekty × 4 sub-roje + cross-project coordination

---

## AI Sub-Agents (MCP Tools)

PCBiuro może delegować zadania do zewnętrznych modeli AI przez MCP.

| Agent | Model | Narzędzia MCP | Kiedy używać |
|-------|-------|---------------|--------------|
| **Gemini** | `gemini-2.0-flash` | `gemini_generate`, `gemini_analyze_code`, `gemini_compare`, `gemini_translate` | Drugie zdanie, analiza kodu, tłumaczenia, porównanie opcji |

### Konfiguracja Gemini MCP

Serwer MCP: `mcp-gemini/server.js` — uruchamiany przez Claude Code via `.claude/settings.json`.

Wymagana zmienna środowiskowa:
```
GEMINI_API_KEY=<twój klucz z https://aistudio.google.com/apikey>
```

Dostępne narzędzia:
- **`gemini_generate`** — ogólne generowanie tekstu (drafty, burza mózgów, podsumowania)
- **`gemini_analyze_code`** — analiza kodu (review / security / performance / refactor / explain)
- **`gemini_compare`** — porównanie dwóch opcji z rekomendacją
- **`gemini_translate`** — tłumaczenie z zachowaniem formatowania Markdown

---

## Rój #1 — CalSyncPro
**Repo:** [mariusz-C-ICAS/calsyncpro](https://github.com/mariusz-C-ICAS/calsyncpro)
**Labels:**  | **Stack:** Azure Functions (TypeScript) + Next.js 15 + Cosmos DB

## Rój #2 — NoFiCo
**Repo:** [mariusz-C-ICAS/nofico](https://github.com/mariusz-C-ICAS/nofico)
**Labels:**  | **Stack:** TBD (specs w Dokumentacja/)

## Rój #3 — C-ICAS.coaching
**Repo:** mariusz-C-ICAS/c-icas-coaching *(w budowie)*
**Labels:**  | **Stack:** TBD

## Rój #4 — www.C-ICAS.gg
**Repo:** [mariusz-C-ICAS/www.C-ICAS.gg](https://github.com/mariusz-C-ICAS/www.C-ICAS.gg)
**Labels:**  | **Stack:** TBD

---

## Eskalacja
\