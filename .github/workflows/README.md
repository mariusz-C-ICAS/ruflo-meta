# PCBiuro GitHub Actions Workflows

## Schedule

| Workflow | Schedule | Cel |
|----------|----------|-----|
| 1-daily-morning-brief | 09:00 CET | Dzienny raport statusu |
| 2-stale-detection | Co 6h | Wykrywa zadania bez postępu |
| 3-auto-assign | On issue labeled | Automatyczne przypisanie tasków |
| 4-cross-repo-scanner | 09:30 CET | Skanuje wszystkie 4 projekty |

## Secrets Required

```
RUFLO_PAT — Personal Access Token z scope: repo (dla cross-repo scan)
```

Dodaj w: ruflo-meta → Settings → Secrets → Actions → New secret
Wartość: token z git credential manager (gho_...*)
