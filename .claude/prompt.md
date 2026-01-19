# Ralph Agent Instructions

Du bist ein autonomer Coding-Agent der an einem Feature arbeitet. Jede Session ist ein frischer Context - du hast keinen Zugriff auf vorherige Gespräche.

## Deine Wissensquellen

1. **PRD (unten)** - Die User Stories mit `passes: true/false`
2. **Progress Log (unten)** - Learnings aus vorherigen Iterationen
3. **Git History** - `git log --oneline -20` für Kontext
4. **Codebase** - Lies relevante Dateien bevor du änderst

## Workflow pro Iteration

### 1. Orientierung (30 Sekunden)
```bash
git status
git log --oneline -5
```
Lies die PRD und den Progress Log unten.

### 2. Story auswählen
Finde die User Story mit der höchsten Priorität wo `passes: false`.

### 3. Implementieren
- Lies existierenden Code bevor du änderst
- Halte dich an bestehende Patterns
- Eine Story pro Iteration - nicht mehr!

### 4. Qualitätschecks ausführen
```bash
php artisan test --filter=RelevantTest
npm run build
vendor/bin/pint --dirty
```

### 5. Bei Erfolg: Story als erledigt markieren
Setze in `.claude/prd.json` für diese Story `"passes": true`.

### 6. Progress dokumentieren (WICHTIG!)
Append zu `.claude/progress.txt` (NIE überschreiben!):

```markdown
---
## Iteration [Datum Zeit]
**Story:** US-XXX - Titel
**Status:** ✅ Erledigt / ❌ Fehlgeschlagen

### Was wurde gemacht
- Änderung 1
- Änderung 2

### Geänderte Dateien
- `path/to/file.php`
- `path/to/component.tsx`

### Learnings / Gotchas
- Wichtige Erkenntnis für zukünftige Iterationen
- Pattern das funktioniert hat

### Nächste Schritte (wenn nicht fertig)
- Was noch zu tun ist
```

### 7. Commit (wenn Tests grün)
```bash
git add -A
git commit -m "feat(deck): US-XXX - Story Titel"
```

## Completion Signal

Wenn ALLE Stories `passes: true` haben:
1. Prüfe nochmal mit `php artisan test`
2. Wenn alles grün: Schreibe `<promise>COMPLETE</promise>` in deine Antwort

## Regeln

- **Eine Story pro Iteration** - Nicht versuchen alles auf einmal zu machen
- **Tests müssen grün sein** bevor du commitest
- **Progress.txt ist append-only** - Nie löschen oder überschreiben
- **Lies Code bevor du änderst** - Verstehe existierende Patterns
- **Bei Fehlern**: Dokumentiere im Progress was schief ging, nächste Iteration fixt es

## Codebase Konventionen (TCG Tracker)

- Laravel 12 mit Inertia.js + React
- TypeScript für Frontend
- Pest für Tests
- Tailwind CSS v4
- Wayfinder für typisierte Routes

## Quality Checks

```bash
# PHP
php artisan test --filter=DeckTest
vendor/bin/pint --dirty

# Frontend
npm run build
npm run lint
```

## Beispiel: Story abschließen

```bash
# 1. Tests laufen lassen
php artisan test --filter=DeckTest
# ✅ Tests passing

# 2. prd.json updaten
# In der Datei: "passes": false → "passes": true

# 3. Progress dokumentieren
# Append zu progress.txt

# 4. Commit
git add -A
git commit -m "feat(deck): US-001 - Deck Model erstellt"
```

Jetzt starte mit der Orientierung und arbeite an der nächsten offenen Story!
