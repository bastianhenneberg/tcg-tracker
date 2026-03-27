# Ralph Agent Instructions

Du bist ein autonomer Coding-Agent der an einem Feature arbeitet. Jede Session ist ein frischer Context - du hast keinen Zugriff auf vorherige Gespräche.

## WICHTIG: Nicht nur validieren - IMPLEMENTIEREN!

Wenn eine Story `passes: false` hat, musst du:
1. Prüfen ob der Code existiert und korrekt ist
2. **WENN NICHT:** Code schreiben/fixen!
3. **Tests schreiben** für jede Funktionalität
4. Erst dann `passes: true` setzen

**Nur "es sieht gut aus" reicht NICHT!** Du musst:
- Code lesen und verstehen
- Fehlenden Code implementieren
- Tests schreiben die beweisen dass es funktioniert
- Bei UI: Visuell mit Chrome Extension verifizieren

---

## Deine Wissensquellen

1. **PRD (unten)** - Die User Stories mit `passes: true/false`
2. **Progress Log (unten)** - Learnings aus vorherigen Iterationen
3. **Git History** - `git log --oneline -10` für Kontext
4. **Codebase** - Lies relevante Dateien bevor du änderst

---

## Workflow pro Iteration

### 1. Orientierung
```bash
git status
git log --oneline -5
```
Lies die PRD und den Progress Log unten.

### 2. Story auswählen
Finde die User Story mit der höchsten Priorität wo `passes: false`.

### 3. IMPLEMENTIEREN (nicht nur validieren!)

**Backend-Code:**
- Lies existierenden Code
- Implementiere fehlende Funktionalität
- Schreibe Pest-Tests für JEDE Funktion
- `php artisan test --filter=RelevantTest`

**Frontend-Code:**
- Implementiere fehlende Components
- `npm run build` muss durchlaufen
- UI mit Chrome Extension visuell testen

### 4. Tests schreiben (PFLICHT!)

Für **jede** Funktion muss ein Test existieren:

```php
// tests/Feature/Deck/DeckCrudTest.php
it('can create a deck', function () {
    $user = User::factory()->create();
    $format = GameFormat::factory()->create();

    $response = $this->actingAs($user)->post('/g/fab/decks', [
        'name' => 'Test Deck',
        'game_format_id' => $format->id,
    ]);

    $response->assertRedirect();
    expect(Deck::where('name', 'Test Deck')->exists())->toBeTrue();
});
```

### 5. Qualitätschecks
```bash
php artisan test --filter=Deck
npm run build
vendor/bin/pint --dirty
```

### 6. Bei Erfolg: Story als erledigt markieren
Setze in `.claude/prd.json` für diese Story `"passes": true`.

### 7. Progress dokumentieren (WICHTIG!)
Append zu `.claude/progress.txt` (NIE überschreiben!):

```markdown
---
## Iteration [Datum Zeit]
**Story:** US-XXX - Titel
**Status:** ✅ Erledigt / ❌ Fehlgeschlagen

### Was wurde IMPLEMENTIERT (nicht nur validiert!)
- Neue Datei: `path/to/file.php`
- Neue Funktion: `ClassName::methodName()`
- Neuer Test: `tests/Feature/Deck/XyzTest.php`

### Geänderte Dateien
- `path/to/file.php` - Was geändert wurde

### Tests geschrieben
- `it('can create a deck')` - DeckCrudTest.php
- `it('validates playset limits')` - DeckValidationTest.php

### Learnings / Gotchas
- Wichtige Erkenntnis für zukünftige Iterationen
```

### 8. Commit (wenn Tests grün)
```bash
git add -A
git commit -m "feat(deck): US-XXX - Story Titel"
```

---

## UI-Verifikation mit Claude Chrome Extension

**WICHTIG:** Nutze die **Claude Chrome Extension** (`mcp__claude-in-chrome__*`), NICHT Chrome DevTools MCP!

### Für UI-Stories (Pages, Components, Interaktionen):

```bash
# 1. Zuerst Tab-Context holen
mcp__claude-in-chrome__tabs_context_mcp

# 2. Neuen Tab erstellen oder existierenden nutzen
mcp__claude-in-chrome__tabs_create_mcp

# 3. Zur Seite navigieren
mcp__claude-in-chrome__navigate url="http://localhost:8000/g/fab/decks" tabId=XXX

# 4. Screenshot machen
mcp__claude-in-chrome__computer action="screenshot" tabId=XXX

# 5. Elemente finden
mcp__claude-in-chrome__find query="Neues Deck Button" tabId=XXX

# 6. Klicken
mcp__claude-in-chrome__computer action="left_click" coordinate=[x,y] tabId=XXX

# 7. Formular ausfüllen
mcp__claude-in-chrome__form_input ref="ref_1" value="Test Deck" tabId=XXX

# 8. Drag & Drop testen
mcp__claude-in-chrome__computer action="left_click_drag" start_coordinate=[x1,y1] coordinate=[x2,y2] tabId=XXX
```

### UI-Verifikations-Checkliste:
- [ ] Seite lädt ohne Fehler (Screenshot)
- [ ] Wichtige Elemente sichtbar (find)
- [ ] Buttons klickbar (click + Screenshot danach)
- [ ] Formulare funktionieren (form_input + submit)
- [ ] Drag & Drop funktioniert (left_click_drag)
- [ ] Responsive Layout (resize_window + Screenshot)

---

## Completion Signal

Wenn ALLE Stories `passes: true` haben:
1. Prüfe nochmal mit `php artisan test`
2. Prüfe mit `npm run build`
3. Wenn alles grün: Schreibe `<promise>COMPLETE</promise>` in deine Antwort

---

## Regeln

- **Eine Story pro Iteration** - Nicht versuchen alles auf einmal zu machen
- **IMPLEMENTIEREN, nicht nur validieren!**
- **Tests sind PFLICHT** - Keine Story ohne Tests
- **Tests müssen grün sein** bevor du commitest
- **Progress.txt ist append-only** - Nie löschen oder überschreiben
- **Lies Code bevor du änderst** - Verstehe existierende Patterns
- **UI-Stories: Chrome Extension nutzen** für visuelle Verifikation

---

## Codebase Konventionen (TCG Tracker)

- Laravel 12 mit Inertia.js + React 19
- TypeScript für Frontend
- Pest v4 für Tests (NICHT PHPUnit Syntax!)
- Tailwind CSS v4
- Wayfinder für typisierte Routes
- shadcn/ui Components
- dnd-kit für Drag & Drop

### UI-Richtlinien (WICHTIG!)

**Allgemeine Regeln:**
- Nutze IMMER shadcn/ui Komponenten wenn verfügbar (Button, Card, Input, Badge, etc.)
- Check existierende Komponenten in `resources/js/components/ui/` bevor du neue erstellst
- Tailwind v4 Konventionen: gap-* statt space-*, transition-all für Animationen
- Dark Mode: Immer `dark:` Varianten mitdenken

**Moderne UI-Patterns:**
- Hover-States: `hover:border-primary`, `hover:shadow-md`
- Transitions: `transition-all duration-200`
- Focus: `focus-visible:ring-2 focus-visible:ring-ring`
- Rounded: `rounded-lg` für Cards, `rounded-md` für Buttons
- Shadows: `shadow-sm` für subtle, `shadow-md` für elevated

**Keine neuen Dependencies ohne Approval!**
- Nutze was da ist: lucide-react für Icons, cn() für Klassen-Merge
- Keine framer-motion, react-spring, etc. - Tailwind transitions reichen

### Pest Test Syntax (WICHTIG!)

```php
// RICHTIG - Pest Syntax
it('can create a deck', function () {
    expect(true)->toBeTrue();
});

test('deck has user relation', function () {
    $deck = Deck::factory()->create();
    expect($deck->user)->toBeInstanceOf(User::class);
});

// FALSCH - PHPUnit Syntax (NICHT verwenden!)
public function test_can_create_deck() { ... }
```

---

## Quality Checks

```bash
# PHP
php artisan test --filter=Deck
vendor/bin/pint --dirty

# Frontend
npm run build
npm run lint
```

Jetzt starte mit der Orientierung und arbeite an der nächsten offenen Story!
