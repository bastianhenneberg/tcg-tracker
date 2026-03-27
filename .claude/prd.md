# Deckbuilder Feature - TCG Tracker

## Übersicht

Multi-Game Deckbuilder mit Drag & Drop, spiel-spezifischen Zonen und strikter Validierung.

---

## Selbst-Verifikation

**WICHTIG:** Nach JEDEM Task MUSST du deine Arbeit verifizieren bevor du "fertig" meldest!

### Verifikations-Methoden

| Methode | Wann nutzen |
|:--------|:------------|
| `php artisan migrate` | Nach jeder Migration |
| `php artisan test --filter=XyzTest` | Nach Backend-Code |
| `php artisan tinker` | Model-Relations prüfen |
| `npm run build` | Nach Frontend-Code |
| `npm run dev` + Browser | UI visuell prüfen |
| **Claude Chrome Extension** | UI-Interaktionen testen (Drag&Drop, Klicks) |

### Verifikations-Ablauf pro Task

```
1. Code schreiben
2. Relevanten Test/Command ausführen
3. Bei Fehler: Fixen und zurück zu 2
4. Bei Erfolg: Ergebnis dokumentieren
5. Erst dann: Task als erledigt markieren
```

### Claude Chrome Browser Verifikation

**WICHTIG:** Nutze die Claude Chrome Extension (MCP Tools: `mcp__claude-in-chrome__*`), NICHT Google Chrome DevTools MCP!

Für UI-Tasks (16-27):
```bash
# 1. Dev-Server starten (in separatem Terminal)
composer run dev
# App läuft dann unter http://localhost:8000

# 2. Neue Claude Session MIT Chrome Extension starten
claude --chrome

# 3. In der Chrome-Session:
#    - mcp__claude-in-chrome__navigate → URL öffnen
#    - mcp__claude-in-chrome__computer action=screenshot → Screenshot
#    - mcp__claude-in-chrome__find → Elemente finden
#    - mcp__claude-in-chrome__computer action=left_click → Klicken
#    - mcp__claude-in-chrome__form_input → Formulare ausfüllen
```

---

## Anforderungen

- **Spiele:** Alle (FAB, MTG, OP, Riftbound, Custom)
- **Kartenpool:** Toggle "Alle Karten" / "Nur eigene Sammlung"
- **Validierung:** Strikt (Playset-Limits, Zonen-Limits, Format-Regeln)
- **Zonen:** Spiel-spezifisch (MTG: Main+Side, FAB: Main+Equipment+Side, etc.)
- **UI:** 3-Spalten (Suche | Deck | Stats)
- **Export:** Text + Bild

---

## Kritische Dateien

| Datei | Zweck |
|:------|:------|
| `app/Services/PlaysetService.php` | Existierende Validierung |
| `app/Models/UnifiedCard.php` | Card-Schema |
| `database/seeders/GamesSeeder.php` | Format/Zonen Seeding |
| `resources/js/pages/scanner/index.tsx` | UI-Pattern Referenz |
| `resources/js/pages/collection/binders/pages/show.tsx` | Card-Slot Pattern |

---

## Tasks für PRD

### Task 1: Migration `decks` Tabelle
**Dateien:** `database/migrations/xxxx_create_decks_table.php`

**Schema:**
```php
$table->id();
$table->foreignId('user_id')->constrained()->cascadeOnDelete();
$table->foreignId('game_format_id')->constrained()->cascadeOnDelete();
$table->string('name');
$table->text('description')->nullable();
$table->boolean('is_public')->default(false);
$table->boolean('use_collection_only')->default(false);
$table->json('metadata')->nullable();
$table->timestamps();
$table->index(['user_id', 'game_format_id']);
```

**Akzeptanzkriterien:**
- [ ] Migration erstellt
- [ ] `php artisan migrate` läuft ohne Fehler

**Verifikation:**
```bash
php artisan migrate
# Erwartung: "Migrating: xxxx_create_decks_table ... DONE"

php artisan tinker --execute="Schema::hasTable('decks')"
# Erwartung: true
```

---

### Task 2: Migration `deck_zones` Tabelle
**Dateien:** `database/migrations/xxxx_create_deck_zones_table.php`

**Schema:**
```php
$table->id();
$table->foreignId('game_format_id')->constrained()->cascadeOnDelete();
$table->string('slug', 50);
$table->string('name', 100);
$table->unsignedInteger('min_cards')->default(0);
$table->unsignedInteger('max_cards')->nullable();
$table->boolean('is_required')->default(false);
$table->unsignedInteger('sort_order')->default(0);
$table->timestamps();
$table->unique(['game_format_id', 'slug']);
```

**Akzeptanzkriterien:**
- [ ] Migration erstellt
- [ ] `php artisan migrate` läuft ohne Fehler

---

### Task 3: Migration `deck_cards` Tabelle
**Dateien:** `database/migrations/xxxx_create_deck_cards_table.php`

**Schema:**
```php
$table->id();
$table->foreignId('deck_id')->constrained()->cascadeOnDelete();
$table->foreignId('deck_zone_id')->constrained()->cascadeOnDelete();
$table->foreignId('printing_id')->constrained('unified_printings')->cascadeOnDelete();
$table->unsignedInteger('quantity')->default(1);
$table->unsignedInteger('position')->default(0);
$table->timestamps();
$table->unique(['deck_id', 'deck_zone_id', 'printing_id']);
$table->index(['deck_id', 'deck_zone_id']);
```

**Akzeptanzkriterien:**
- [ ] Migration erstellt
- [ ] `php artisan migrate` läuft ohne Fehler

---

### Task 4: Model `Deck`
**Dateien:** `app/Models/Deck.php`

**Anforderungen:**
- Fillable: user_id, game_format_id, name, description, is_public, use_collection_only, metadata
- Casts: is_public (bool), use_collection_only (bool), metadata (array)
- Relations: user(), gameFormat(), cards(), zones()
- Helper: getCardCount(), getGame()

**Akzeptanzkriterien:**
- [ ] Model erstellt mit allen Fillables
- [ ] Casts definiert
- [ ] Relations funktionieren
- [ ] `Deck::factory()` erstellt (optional)

**Verifikation:**
```bash
php artisan tinker
>>> $user = User::first();
>>> $format = GameFormat::first();
>>> $deck = Deck::create(['user_id' => $user->id, 'game_format_id' => $format->id, 'name' => 'Test']);
>>> $deck->user->name  // Erwartung: User-Name
>>> $deck->gameFormat->name  // Erwartung: Format-Name
>>> $deck->delete();
```

---

### Task 5: Model `DeckZone`
**Dateien:** `app/Models/DeckZone.php`

**Anforderungen:**
- Fillable: game_format_id, slug, name, min_cards, max_cards, is_required, sort_order
- Relations: gameFormat(), deckCards()

**Akzeptanzkriterien:**
- [ ] Model erstellt
- [ ] Relations funktionieren

---

### Task 6: Model `DeckCard`
**Dateien:** `app/Models/DeckCard.php`

**Anforderungen:**
- Fillable: deck_id, deck_zone_id, printing_id, quantity, position
- Relations: deck(), zone(), printing()

**Akzeptanzkriterien:**
- [ ] Model erstellt
- [ ] Relations funktionieren
- [ ] `printing()` verweist auf `UnifiedPrinting`

---

### Task 7: DeckZones Seeder
**Dateien:** `database/seeders/DeckZonesSeeder.php`

**Zonen pro Format:**

**FAB Blitz:**
- hero: min=1, max=1, required=true
- main: min=40, max=40, required=true
- equipment: min=0, max=11, required=false
- sideboard: min=0, max=null, required=false

**FAB CC:**
- hero: min=1, max=1, required=true
- main: min=60, max=null, required=true
- equipment: min=0, max=11, required=false
- sideboard: min=0, max=null, required=false

**MTG Standard/Modern:**
- main: min=60, max=null, required=true
- sideboard: min=0, max=15, required=false

**MTG Commander:**
- commander: min=1, max=2, required=true
- main: min=99, max=99, required=true

**One Piece:**
- leader: min=1, max=1, required=true
- main: min=50, max=50, required=true
- don: min=10, max=10, required=true

**Akzeptanzkriterien:**
- [ ] Seeder erstellt
- [ ] `php artisan db:seed --class=DeckZonesSeeder` läuft
- [ ] Zonen in DB vorhanden

---

### Task 8: DeckPolicy
**Dateien:** `app/Policies/DeckPolicy.php`

**Methoden:**
- viewAny(): true (Liste sehen)
- view(): owner oder is_public
- create(): authenticated
- update(): owner only
- delete(): owner only

**Akzeptanzkriterien:**
- [ ] Policy erstellt
- [ ] In AuthServiceProvider registriert
- [ ] Tests für Authorization

---

### Task 9: DeckValidationService
**Dateien:** `app/Services/DeckValidationService.php`

**Methoden:**
```php
public function validateDeck(Deck $deck): ValidationResult;
public function checkPlaysetLimit(Deck $deck, UnifiedCard $card, int $additionalQty = 0): bool;
public function checkZoneLimits(Deck $deck): array;
public function checkCollectionAvailability(Deck $deck): array;
```

**Akzeptanzkriterien:**
- [ ] Service erstellt
- [ ] Nutzt existierenden PlaysetService
- [ ] Playset-Check funktioniert über alle Zonen
- [ ] Zonen-Limits werden geprüft
- [ ] Collection-Check wenn use_collection_only=true

---

### Task 10: DeckbuilderService
**Dateien:** `app/Services/DeckbuilderService.php`

**Methoden:**
```php
public function addCard(Deck $deck, UnifiedPrinting $printing, string $zoneSlug, int $qty): DeckCard;
public function removeCard(Deck $deck, int $deckCardId): void;
public function moveCard(Deck $deck, int $deckCardId, string $targetZone): DeckCard;
public function updateQuantity(Deck $deck, int $deckCardId, int $qty): DeckCard;
public function getStatistics(Deck $deck): array;
public function exportAsText(Deck $deck): string;
```

**Akzeptanzkriterien:**
- [ ] Service erstellt
- [ ] CRUD für Karten funktioniert
- [ ] Statistiken werden berechnet (Mana-Kurve, Typen)
- [ ] Text-Export im Format "4x Card Name"

---

### Task 11: Form Requests
**Dateien:**
- `app/Http/Requests/StoreDeckRequest.php`
- `app/Http/Requests/UpdateDeckRequest.php`
- `app/Http/Requests/AddCardRequest.php`
- `app/Http/Requests/MoveCardRequest.php`

**Akzeptanzkriterien:**
- [ ] Alle Requests erstellt
- [ ] Validation Rules definiert
- [ ] Authorization via Policy

---

### Task 12: DeckController - CRUD
**Dateien:** `app/Http/Controllers/DeckController.php`

**Methoden:**
- index(string $slug)
- create(string $slug)
- store(StoreDeckRequest)
- show(string $slug, Deck $deck)
- edit(string $slug, Deck $deck)
- update(UpdateDeckRequest, Deck $deck)
- destroy(Deck $deck)

**Akzeptanzkriterien:**
- [ ] Controller erstellt
- [ ] CRUD Methoden implementiert
- [ ] Policy Authorization
- [ ] Inertia Responses

---

### Task 13: DeckController - Builder Actions
**Dateien:** `app/Http/Controllers/DeckController.php` (erweitern)

**Methoden:**
- builder(string $slug, Deck $deck) - Haupt-UI
- addCard(AddCardRequest, Deck $deck) - JSON
- removeCard(Deck $deck, DeckCard $card) - JSON
- moveCard(MoveCardRequest, Deck $deck, DeckCard $card) - JSON
- updateQuantity(Request, Deck $deck, DeckCard $card) - JSON
- validate(Deck $deck) - JSON
- searchCards(Request, Deck $deck) - JSON
- export(Deck $deck, string $format)

**Akzeptanzkriterien:**
- [ ] Alle Methoden implementiert
- [ ] JSON Responses für AJAX
- [ ] Search mit Pagination
- [ ] Export als Download

---

### Task 14: Routes
**Dateien:** `routes/web.php`

**Routes:**
```php
Route::prefix('g/{slug}')->group(function () {
    Route::resource('decks', DeckController::class);
    Route::get('decks/{deck}/builder', [DeckController::class, 'builder'])->name('decks.builder');
    Route::post('decks/{deck}/cards', [DeckController::class, 'addCard'])->name('decks.add-card');
    Route::delete('decks/{deck}/cards/{card}', [DeckController::class, 'removeCard'])->name('decks.remove-card');
    Route::patch('decks/{deck}/cards/{card}/move', [DeckController::class, 'moveCard'])->name('decks.move-card');
    Route::patch('decks/{deck}/cards/{card}/quantity', [DeckController::class, 'updateQuantity'])->name('decks.update-quantity');
    Route::get('decks/{deck}/validate', [DeckController::class, 'validate'])->name('decks.validate');
    Route::get('decks/{deck}/search', [DeckController::class, 'searchCards'])->name('decks.search');
    Route::get('decks/{deck}/export/{format?}', [DeckController::class, 'export'])->name('decks.export');
});
```

**Akzeptanzkriterien:**
- [ ] Alle Routes registriert
- [ ] Wayfinder Types generiert (`php artisan wayfinder:generate`)

---

### Task 15: TypeScript Types
**Dateien:** `resources/js/types/deck.ts`

**Types:**
```typescript
interface Deck { ... }
interface DeckZone { ... }
interface DeckCard { ... }
interface DeckStatistics { ... }
interface ValidationError { ... }
```

**Akzeptanzkriterien:**
- [ ] Types erstellt
- [ ] In `resources/js/types/index.ts` exportiert

---

### Task 16: Deck List Page
**Dateien:** `resources/js/pages/decks/index.tsx`

**UI:**
- Liste aller Decks des Users für das Spiel
- "Neues Deck" Button
- Deck-Cards mit Name, Format, Kartenanzahl
- Edit/Delete Actions

**Akzeptanzkriterien:**
- [ ] Page erstellt
- [ ] Deck-Liste wird angezeigt
- [ ] Create Button funktioniert
- [ ] Edit/Delete funktioniert

**Verifikation:**
```bash
npm run build  # Keine TypeScript/Build Errors

# Claude Chrome Verifikation (starte: claude --chrome):
# 1. composer run dev (in anderem Terminal)
# 2. mcp__claude-in-chrome__navigate url="http://localhost:8000/g/fab/decks"
# 3. mcp__claude-in-chrome__computer action=screenshot
# 4. Prüfen: "Neues Deck" Button sichtbar?
# 5. mcp__claude-in-chrome__find query="Neues Deck Button"
# 6. mcp__claude-in-chrome__computer action=left_click auf Button
# 7. Screenshot: Redirect zu /create erfolgt?
```

---

### Task 17: Deck Create Page
**Dateien:** `resources/js/pages/decks/create.tsx`

**UI:**
- Form: Name, Format (Dropdown), Beschreibung
- "Nur eigene Sammlung" Toggle
- Submit → Redirect zu Builder

**Akzeptanzkriterien:**
- [ ] Page erstellt
- [ ] Form funktioniert
- [ ] Format-Auswahl zeigt nur Formate des Spiels
- [ ] Nach Create → Redirect zu /builder

---

### Task 18: Deck Show Page
**Dateien:** `resources/js/pages/decks/show.tsx`

**UI:**
- Deck-Name, Format, Beschreibung
- Karten-Liste nach Zonen gruppiert
- Statistiken (Read-only)
- "Bearbeiten" Button → Builder
- Export Buttons

**Akzeptanzkriterien:**
- [ ] Page erstellt
- [ ] Karten werden nach Zonen angezeigt
- [ ] Export funktioniert

---

### Task 19: dnd-kit Installation
**Dateien:** `package.json`

**Commands:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Akzeptanzkriterien:**
- [ ] Packages installiert
- [ ] Import funktioniert in Test-Component

---

### Task 20: CardSearchPanel Component
**Dateien:** `resources/js/components/deckbuilder/CardSearchPanel.tsx`

**Props:**
- deck: Deck
- useCollectionOnly: boolean
- onCardSelect: (printing: UnifiedPrinting, zone: string) => void

**UI:**
- Search Input mit Debounce
- Filter (Typ, Kosten, Farbe)
- Ergebnis-Grid mit Kartenbildern
- Klick auf Karte → Zone-Auswahl → onCardSelect

**Akzeptanzkriterien:**
- [ ] Component erstellt
- [ ] Suche funktioniert mit Debounce
- [ ] Filter funktionieren
- [ ] Kartenbilder werden geladen
- [ ] Klick fügt Karte hinzu

---

### Task 21: DeckZone Component
**Dateien:** `resources/js/components/deckbuilder/DeckZone.tsx`

**Props:**
- zone: DeckZone
- cards: DeckCard[]
- onRemove: (cardId: number) => void
- onQuantityChange: (cardId: number, qty: number) => void

**UI:**
- Zone-Header mit Name und Count (z.B. "Main Deck (45/60)")
- Droppable Area (dnd-kit useDroppable)
- Liste der Karten als DeckCardItem
- Validierungs-Status (grün/rot)

**Akzeptanzkriterien:**
- [ ] Component erstellt
- [ ] Droppable funktioniert
- [ ] Karten werden angezeigt
- [ ] Count wird aktualisiert

---

### Task 22: DeckCardItem Component
**Dateien:** `resources/js/components/deckbuilder/DeckCardItem.tsx`

**Props:**
- card: DeckCard
- onRemove: () => void
- onQuantityChange: (qty: number) => void

**UI:**
- Draggable (dnd-kit useDraggable)
- Kartenbild (klein)
- Name
- Quantity Selector (+/-)
- Remove Button (X)

**Akzeptanzkriterien:**
- [ ] Component erstellt
- [ ] Draggable funktioniert
- [ ] Quantity +/- funktioniert
- [ ] Remove funktioniert

---

### Task 23: DeckStatistics Component
**Dateien:** `resources/js/components/deckbuilder/DeckStatistics.tsx`

**Props:**
- statistics: DeckStatistics

**UI:**
- Total Cards
- Mana-Kurve (Bar Chart)
- Typ-Verteilung (Pie/Bar)
- Farb-Verteilung

**Akzeptanzkriterien:**
- [ ] Component erstellt
- [ ] Mana-Kurve wird visualisiert
- [ ] Typ-Verteilung wird angezeigt

---

### Task 24: ValidationPanel Component
**Dateien:** `resources/js/components/deckbuilder/ValidationPanel.tsx`

**Props:**
- errors: ValidationError[]

**UI:**
- Liste der Fehler mit Icons
- Kategorisiert nach Typ (Playset, Zone, Legality)
- Grün "Valid" wenn keine Fehler

**Akzeptanzkriterien:**
- [ ] Component erstellt
- [ ] Fehler werden angezeigt
- [ ] "Valid" wenn leer

---

### Task 25: ExportPanel Component
**Dateien:** `resources/js/components/deckbuilder/ExportPanel.tsx`

**Props:**
- deck: Deck

**UI:**
- "Als Text exportieren" Button
- "Als Bild exportieren" Button (Phase 2)
- Textarea mit Preview

**Akzeptanzkriterien:**
- [ ] Component erstellt
- [ ] Text-Export funktioniert
- [ ] Download als .txt

---

### Task 26: Builder Page - Layout
**Dateien:** `resources/js/pages/decks/builder.tsx`

**UI:**
```
┌────────────┬─────────────┬──────────┐
│   Search   │    Deck     │  Stats   │
│   Panel    │   Zones     │  Panel   │
│  (4 cols)  │  (5 cols)   │ (3 cols) │
└────────────┴─────────────┴──────────┘
```

**Akzeptanzkriterien:**
- [ ] 3-Spalten Grid Layout
- [ ] Responsive (Mobile: Tabs statt Spalten)
- [ ] DndContext wrapper

---

### Task 27: Builder Page - State & Handlers
**Dateien:** `resources/js/pages/decks/builder.tsx` (erweitern)

**State:**
- deckCards, zones, searchResults, validationErrors, statistics

**Handlers:**
- handleAddCard → POST /cards
- handleRemoveCard → DELETE /cards/{id}
- handleMoveCard → PATCH /cards/{id}/move
- handleQuantityChange → PATCH /cards/{id}/quantity
- handleDragEnd → moveCard

**Akzeptanzkriterien:**
- [ ] State Management implementiert
- [ ] API Calls funktionieren
- [ ] Optimistic Updates für UX
- [ ] Drag & Drop funktioniert zwischen Zonen

**Verifikation:**
```bash
npm run build  # Keine Errors
php artisan test --filter=DeckTest  # Backend Tests grün

# Claude Chrome Verifikation (starte: claude --chrome)
# WICHTIG - vollständiger UI Test!

# Setup:
# Terminal 1: composer run dev
# Terminal 2: claude --chrome

# Test-Ablauf mit MCP Tools:
# 1. mcp__claude-in-chrome__navigate url="http://localhost:8000/g/fab/decks"
# 2. Deck erstellen (Klick auf "Neues Deck", Form ausfüllen)
# 3. Im Builder:
#    a) mcp__claude-in-chrome__form_input → Suchfeld "Ninja" eingeben
#    b) mcp__claude-in-chrome__computer action=screenshot → Suchergebnisse?
#    c) mcp__claude-in-chrome__find query="Karte in Suchergebnissen"
#    d) mcp__claude-in-chrome__computer action=left_click → Karte hinzufügen
#    e) Screenshot: Karte in Main Deck Zone?
#    f) Drag & Drop Test:
#       - mcp__claude-in-chrome__computer action=left_click_drag
#         start_coordinate=[x1,y1] coordinate=[x2,y2]
#    g) Screenshot: Karte in Sideboard?
#    h) Quantity +/- Button klicken
#    i) Statistik-Panel prüfen
#    j) 5x gleiche Karte hinzufügen → Validierungsfehler sichtbar?
# 4. Export Button klicken → Download prüfen
```

---

### Task 28: Navigation Integration
**Dateien:** `resources/js/components/nav-main.tsx` oder ähnlich

**Änderung:**
- "Decks" Link in Game-Navigation hinzufügen

**Akzeptanzkriterien:**
- [ ] Decks-Link sichtbar
- [ ] Führt zu /g/{slug}/decks

---

### Task 29: Feature Tests - Backend
**Dateien:** `tests/Feature/DeckTest.php`

**Tests:**
- Deck erstellen
- Karte hinzufügen
- Playset-Limit prüfen
- Zonen-Limit prüfen
- Export

**Akzeptanzkriterien:**
- [ ] Tests geschrieben
- [ ] `php artisan test --filter=DeckTest` grün

---

### Task 30: Final Integration Test
**Dateien:** Manuell

**Prüfen:**
- [ ] Deck erstellen für FAB
- [ ] Karten suchen und hinzufügen
- [ ] Drag & Drop zwischen Zonen
- [ ] Validierung zeigt Fehler
- [ ] Export funktioniert
- [ ] Deck erstellen für MTG (andere Zonen)

**Verifikation (Claude Chrome - Kompletter E2E Test):**
```bash
# Alle Tests müssen GRÜN sein bevor Feature als fertig gilt!

php artisan test  # Alle Tests grün
npm run build     # Keine Errors

# Setup für E2E:
# Terminal 1: composer run dev
# Terminal 2: claude --chrome

# E2E Test mit Claude Chrome Extension (MCP Tools):

## Test 1: FAB Blitz Deck
# mcp__claude-in-chrome__navigate url="http://localhost:8000/login"
# (Login durchführen)
# mcp__claude-in-chrome__navigate url="http://localhost:8000/g/fab/decks"
# mcp__claude-in-chrome__computer action=screenshot
# Deck erstellen: "Test Blitz", Format: "Blitz"
# Im Builder:
#   - Hero hinzufügen (1x)
#   - 40 Karten zum Main Deck (mehrfach Karte suchen + klicken)
#   - Equipment hinzufügen
#   - mcp__claude-in-chrome__computer action=screenshot → Alle Zonen korrekt?
# Validierung prüfen: Grün wenn 40 Main + 1 Hero?
# Export Button klicken → Download erfolgt?

## Test 2: MTG Standard Deck
# mcp__claude-in-chrome__navigate url="http://localhost:8000/g/mtg/decks"
# Neues Deck → Format: "Standard"
# Im Builder: 60+ Main, 15 Sideboard
# mcp__claude-in-chrome__computer action=screenshot → Nur 2 Zonen?
# Playset-Limit: 5x gleiche Karte → Fehler sichtbar?

## Test 3: Collection-Only Mode
# Neues Deck mit "Nur eigene Sammlung" Toggle aktiviert
# mcp__claude-in-chrome__form_input auf Search
# Screenshot: Zeigt nur Karten aus Inventory?

## Test 4: Responsive
# mcp__claude-in-chrome__resize_window width=375 height=812
# mcp__claude-in-chrome__computer action=screenshot
# Layout noch nutzbar?

# Wenn ALLE Tests bestanden: EXIT_SIGNAL: true
# Bei Fehlern: Notiere Problem, fixe es, teste erneut
```

---

## Verifikation

```bash
# Nach jedem Task
php artisan migrate
php artisan test
npm run build

# Am Ende
php artisan serve
# Browser: http://localhost:8000/g/fab/decks
```

---

## Geschätzte Reihenfolge

**Phase 1 - Database (Tasks 1-7):** Migrationen + Models + Seeder
**Phase 2 - Backend (Tasks 8-14):** Services + Controller + Routes
**Phase 3 - Types (Task 15):** TypeScript Definitionen
**Phase 4 - Pages (Tasks 16-18):** CRUD Pages
**Phase 5 - Builder (Tasks 19-27):** Drag & Drop UI
**Phase 6 - Polish (Tasks 28-30):** Navigation + Tests
