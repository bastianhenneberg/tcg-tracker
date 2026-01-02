# Neues Spiel hinzufügen - Anleitung

Diese Dokumentation beschreibt die Schritte zum Hinzufügen eines neuen Trading Card Games basierend auf der FAB-Implementierung.

## Struktur-Übersicht

Jedes Spiel benötigt folgende Komponenten:

```
Backend:
├── app/Models/{Game}/
│   ├── {Game}Card.php
│   ├── {Game}Set.php
│   ├── {Game}Printing.php
│   ├── {Game}Collection.php
│   └── {Game}Inventory.php
├── app/Http/Controllers/{Game}/
│   ├── {Game}CardController.php
│   ├── {Game}CollectionController.php
│   ├── {Game}InventoryController.php
│   └── {Game}ScannerController.php
├── database/migrations/
│   ├── create_{game}_sets_table.php
│   ├── create_{game}_cards_table.php
│   ├── create_{game}_printings_table.php
│   ├── create_{game}_inventory_table.php
│   ├── create_{game}_collection_table.php
│   └── add_{game}_scanner_settings_to_users_table.php

Frontend:
├── resources/js/pages/{game}/
│   ├── cards/index.tsx
│   ├── cards/show.tsx
│   ├── printings/index.tsx
│   ├── printings/show.tsx
│   ├── collection.tsx
│   ├── inventory.tsx
│   └── scanner.tsx
├── resources/js/types/{game}.ts
```

---

## 1. Migrationen erstellen

### 1.1 Sets-Tabelle

```php
Schema::create('{game}_sets', function (Blueprint $table) {
    $table->id();
    $table->foreignId('game_id')->nullable()->constrained()->nullOnDelete();
    $table->string('external_id')->unique();  // API-ID
    $table->string('name');
    $table->date('released_at')->nullable();
    $table->timestamps();
});
```

### 1.2 Cards-Tabelle

```php
Schema::create('{game}_cards', function (Blueprint $table) {
    $table->id();
    $table->foreignId('game_id')->nullable()->constrained()->nullOnDelete();
    $table->string('external_id')->unique();  // API-ID
    $table->string('name');

    // Spielspezifische Attribute hier
    // Beispiel FAB: pitch, cost, power, defense, health
    // Beispiel MTG: mana_cost, mana_value, type_line, oracle_text

    $table->json('types')->nullable();         // Kartentypen
    $table->json('traits')->nullable();        // Spielspezifische Traits
    $table->json('card_keywords')->nullable(); // Keywords/Abilities
    $table->text('functional_text')->nullable();

    // Legalität pro Format (optional, wenn relevant)
    // $table->boolean('format1_legal')->default(false);

    $table->timestamps();
    $table->index('name');
});
```

### 1.3 Printings-Tabelle

```php
Schema::create('{game}_printings', function (Blueprint $table) {
    $table->id();
    $table->foreignId('{game}_card_id')->constrained()->cascadeOnDelete();
    $table->foreignId('{game}_set_id')->constrained()->cascadeOnDelete();
    $table->string('external_id')->unique();
    $table->string('collector_number', 20);
    $table->string('rarity', 5)->nullable();
    $table->string('foiling', 5)->nullable();
    $table->string('language', 5)->default('EN');
    $table->string('image_url')->nullable();
    $table->json('artists')->nullable();
    $table->text('flavor_text')->nullable();
    $table->timestamps();

    $table->index('collector_number');
    $table->index(['{game}_card_id', '{game}_set_id']);
});
```

### 1.4 Inventory-Tabelle (Verkaufsinventar)

```php
Schema::create('{game}_inventory', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('lot_id')->nullable()->constrained()->nullOnDelete();
    $table->foreignId('{game}_printing_id')->constrained()->cascadeOnDelete();
    $table->string('condition', 5);
    $table->string('language', 5)->default('EN');
    $table->decimal('price', 10, 2)->nullable();
    $table->integer('position_in_lot')->nullable();
    $table->timestamp('sold_at')->nullable();
    $table->decimal('sold_price', 10, 2)->nullable();
    $table->timestamps();

    $table->index('lot_id');
    $table->index(['user_id', 'sold_at']);
});
```

### 1.5 Collection-Tabelle (Persönliche Sammlung)

```php
Schema::create('{game}_collection', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('{game}_printing_id')->constrained()->cascadeOnDelete();
    $table->string('condition', 5);
    $table->string('language', 5)->default('EN');
    $table->integer('quantity')->default(1);
    $table->text('notes')->nullable();
    $table->foreignId('source_lot_id')->nullable()
        ->constrained('lots')->nullOnDelete();
    $table->timestamps();

    $table->unique(['user_id', '{game}_printing_id', 'condition', 'language']);
});
```

### 1.6 Scanner-Settings für User

```php
Schema::table('users', function (Blueprint $table) {
    $table->json('{game}_scanner_settings')->nullable();
});
```

---

## 2. Models erstellen

### 2.1 {Game}Card Model

```php
<?php

namespace App\Models\{Game};

use App\Models\Game;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class {Game}Card extends Model
{
    protected $fillable = [
        'game_id',
        'external_id',
        'name',
        // Spielspezifische Felder
        'types',
        'traits',
        'card_keywords',
        'functional_text',
    ];

    protected function casts(): array
    {
        return [
            'types' => 'array',
            'traits' => 'array',
            'card_keywords' => 'array',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function printings(): HasMany
    {
        return $this->hasMany({Game}Printing::class);
    }
}
```

### 2.2 {Game}Set Model

```php
<?php

namespace App\Models\{Game};

use App\Models\Game;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class {Game}Set extends Model
{
    protected $fillable = [
        'game_id',
        'external_id',
        'name',
        'released_at',
    ];

    protected function casts(): array
    {
        return [
            'released_at' => 'date',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function printings(): HasMany
    {
        return $this->hasMany({Game}Printing::class);
    }
}
```

### 2.3 {Game}Printing Model

```php
<?php

namespace App\Models\{Game};

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class {Game}Printing extends Model
{
    // Konstanten für Labels
    public const RARITIES = [
        'C' => 'Common',
        'U' => 'Uncommon',
        'R' => 'Rare',
        // Spielspezifisch anpassen
    ];

    public const FOILINGS = [
        'S' => 'Standard',
        'F' => 'Foil',
        // Spielspezifisch anpassen
    ];

    public const LANGUAGES = [
        'EN' => 'English',
        'JP' => 'Japanese',
        // Spielspezifisch anpassen
    ];

    protected $fillable = [
        '{game}_card_id',
        '{game}_set_id',
        'external_id',
        'collector_number',
        'rarity',
        'foiling',
        'language',
        'image_url',
        'artists',
        'flavor_text',
    ];

    protected function casts(): array
    {
        return [
            'artists' => 'array',
        ];
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo({Game}Card::class, '{game}_card_id');
    }

    public function set(): BelongsTo
    {
        return $this->belongsTo({Game}Set::class, '{game}_set_id');
    }

    public function inventoryItems(): HasMany
    {
        return $this->hasMany({Game}Inventory::class);
    }

    public function collectionItems(): HasMany
    {
        return $this->hasMany({Game}Collection::class);
    }

    // Label Accessors
    public function getRarityLabelAttribute(): string
    {
        return self::RARITIES[$this->rarity] ?? $this->rarity ?? 'Unknown';
    }

    public function getFoilingLabelAttribute(): string
    {
        return self::FOILINGS[$this->foiling] ?? $this->foiling ?? 'Standard';
    }

    public function getLanguageLabelAttribute(): string
    {
        return self::LANGUAGES[$this->language] ?? $this->language ?? 'English';
    }

    // Static Helper
    public static function getRarityLabel(?string $rarity): string
    {
        return self::RARITIES[$rarity] ?? $rarity ?? 'Unknown';
    }
}
```

### 2.4 {Game}Collection Model

```php
<?php

namespace App\Models\{Game};

use App\Models\Lot;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class {Game}Collection extends Model
{
    protected $table = '{game}_collection';

    public const CONDITIONS = [
        'NM' => 'Near Mint',
        'LP' => 'Lightly Played',
        'MP' => 'Moderately Played',
        'HP' => 'Heavily Played',
        'DMG' => 'Damaged',
    ];

    protected $fillable = [
        'user_id',
        '{game}_printing_id',
        'condition',
        'language',
        'quantity',
        'notes',
        'source_lot_id',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function printing(): BelongsTo
    {
        return $this->belongsTo({Game}Printing::class, '{game}_printing_id');
    }

    public function sourceLot(): BelongsTo
    {
        return $this->belongsTo(Lot::class, 'source_lot_id');
    }

    public function addQuantity(int $amount = 1): void
    {
        $this->increment('quantity', $amount);
    }

    public function removeQuantity(int $amount = 1): void
    {
        $newQuantity = max(0, $this->quantity - $amount);
        if ($newQuantity === 0) {
            $this->delete();
        } else {
            $this->update(['quantity' => $newQuantity]);
        }
    }
}
```

### 2.5 {Game}Inventory Model

```php
<?php

namespace App\Models\{Game};

use App\Models\Lot;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class {Game}Inventory extends Model
{
    protected $table = '{game}_inventory';

    public const CONDITIONS = [
        'NM' => 'Near Mint',
        'LP' => 'Lightly Played',
        'MP' => 'Moderately Played',
        'HP' => 'Heavily Played',
        'DMG' => 'Damaged',
    ];

    protected $fillable = [
        'user_id',
        'lot_id',
        '{game}_printing_id',
        'condition',
        'language',
        'price',
        'position_in_lot',
        'sold_at',
        'sold_price',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'sold_at' => 'datetime',
            'sold_price' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }

    public function printing(): BelongsTo
    {
        return $this->belongsTo({Game}Printing::class, '{game}_printing_id');
    }

    // Scopes
    public function scopeUnsold(Builder $query): Builder
    {
        return $query->whereNull('sold_at');
    }

    public function scopeSold(Builder $query): Builder
    {
        return $query->whereNotNull('sold_at');
    }

    // Helper Methods
    public function markAsSold(?float $price = null): void
    {
        $this->update([
            'sold_at' => now(),
            'sold_price' => $price ?? $this->price,
        ]);
    }

    public static function renumberPositionsInLot(int $lotId): void
    {
        $items = self::where('lot_id', $lotId)
            ->orderBy('position_in_lot')
            ->get();

        $position = 1;
        foreach ($items as $item) {
            if ($item->position_in_lot !== $position) {
                $item->update(['position_in_lot' => $position]);
            }
            $position++;
        }
    }
}
```

---

## 3. GamesSeeder erweitern

In `database/seeders/GamesSeeder.php`:

```php
// Im run() Method:
$game = Game::updateOrCreate(
    ['slug' => '{game-slug}'],
    [
        'name' => '{Game Name}',
        'description' => '{Beschreibung des Spiels}',
        'logo_url' => null,
        'is_official' => true,
        'user_id' => null,
    ]
);

$this->seed{Game}Attributes($game);
$this->seed{Game}Formats($game);

// Neue private Methoden:
private function seed{Game}Attributes(Game $game): void
{
    // Rarities
    $rarities = [...];
    $sortOrder = 0;
    foreach ($rarities as $key => $label) {
        GameAttribute::updateOrCreate(
            ['game_id' => $game->id, 'type' => GameAttribute::TYPE_RARITY, 'key' => $key],
            ['label' => $label, 'sort_order' => $sortOrder++]
        );
    }

    // Foilings, Languages, Conditions analog
}

private function seed{Game}Formats(Game $game): void
{
    $formats = [
        ['slug' => 'format1', 'name' => 'Format 1', 'description' => '...', 'is_active' => true, 'sort_order' => 0],
    ];

    foreach ($formats as $format) {
        GameFormat::updateOrCreate(
            ['game_id' => $game->id, 'slug' => $format['slug']],
            $format
        );
    }
}
```

---

## 4. Controller erstellen

### Basis-Muster für Controller

Siehe `app/Http/Controllers/Fab/` als Referenz:

- **CardController**: Index (Kartensuche), Show (Kartendetails), Printings (alle Drucke)
- **CollectionController**: Index, Update (Menge), Destroy, DeleteMultiple
- **InventoryController**: Index, Store, Update, Destroy, DeleteMultiple, MarkSold, MoveToCollection
- **ScannerController**: Index, Confirm, ConfirmBulk, CreateLot, SaveSettings

---

## 5. Routes definieren

In `routes/web.php`:

```php
Route::prefix('{game}')->name('{game}.')->group(function () {
    // Card Database
    Route::get('/cards', [{Game}CardController::class, 'index'])->name('cards.index');
    Route::get('/cards/{card}', [{Game}CardController::class, 'show'])->name('cards.show');
    Route::get('/printings', [{Game}CardController::class, 'printings'])->name('printings.index');
    Route::get('/printings/{printing}', [{Game}CardController::class, 'printing'])->name('printings.show');

    Route::middleware('auth')->group(function () {
        // Scanner
        Route::get('/scanner', [{Game}ScannerController::class, 'index'])->name('scanner.index');
        Route::post('/scanner/confirm', [{Game}ScannerController::class, 'confirm'])->name('scanner.confirm');
        Route::post('/scanner/confirm-bulk', [{Game}ScannerController::class, 'confirmBulk'])->name('scanner.confirmBulk');
        Route::post('/scanner/lot', [{Game}ScannerController::class, 'createLot'])->name('scanner.createLot');
        Route::post('/scanner/settings', [{Game}ScannerController::class, 'saveSettings'])->name('scanner.saveSettings');

        // Inventory
        Route::get('/inventory', [{Game}InventoryController::class, 'index'])->name('inventory.index');
        Route::post('/inventory', [{Game}InventoryController::class, 'store'])->name('inventory.store');
        Route::patch('/inventory/{item}', [{Game}InventoryController::class, 'update'])->name('inventory.update');
        Route::delete('/inventory/{item}', [{Game}InventoryController::class, 'destroy'])->name('inventory.destroy');
        Route::post('/inventory/delete-multiple', [{Game}InventoryController::class, 'deleteMultiple'])->name('inventory.deleteMultiple');
        Route::post('/inventory/mark-sold', [{Game}InventoryController::class, 'markSold'])->name('inventory.markSold');
        Route::post('/inventory/move-to-collection', [{Game}InventoryController::class, 'moveToCollection'])->name('inventory.moveToCollection');

        // Collection
        Route::get('/collection', [{Game}CollectionController::class, 'index'])->name('collection.index');
        Route::patch('/collection/{item}', [{Game}CollectionController::class, 'update'])->name('collection.update');
        Route::delete('/collection/{item}', [{Game}CollectionController::class, 'destroy'])->name('collection.destroy');
        Route::post('/collection/delete-multiple', [{Game}CollectionController::class, 'deleteMultiple'])->name('collection.deleteMultiple');
    });
});
```

---

## 6. TypeScript Types erstellen

In `resources/js/types/{game}.ts`:

```typescript
export interface {Game}Set {
    id: number;
    external_id: string;
    name: string;
    released_at: string | null;
}

export interface {Game}Card {
    id: number;
    external_id: string;
    name: string;
    // Spielspezifische Felder
    types: string[];
    printings?: {Game}Printing[];
}

export type RarityKey = 'C' | 'U' | 'R'; // Anpassen
export type FoilingKey = 'S' | 'F'; // Anpassen
export type LanguageKey = 'EN' | 'JP'; // Anpassen
export type ConditionKey = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';

export const RARITIES: Record<RarityKey, string> = {
    C: 'Common',
    U: 'Uncommon',
    R: 'Rare',
};

export const FOILINGS: Record<FoilingKey, string> = {
    S: 'Standard',
    F: 'Foil',
};

export const CONDITIONS: Record<ConditionKey, string> = {
    NM: 'Near Mint',
    LP: 'Lightly Played',
    MP: 'Moderately Played',
    HP: 'Heavily Played',
    DMG: 'Damaged',
};

export interface {Game}Printing {
    id: number;
    {game}_card_id: number;
    {game}_set_id: number;
    external_id: string;
    collector_number: string;
    rarity: RarityKey | null;
    rarity_label?: string;
    foiling: FoilingKey | null;
    foiling_label?: string;
    language: LanguageKey;
    image_url: string | null;
    card?: {Game}Card;
    set?: {Game}Set;
}

export interface {Game}Inventory {
    id: number;
    user_id: number;
    lot_id: number;
    {game}_printing_id: number;
    condition: ConditionKey;
    language: LanguageKey;
    price: number | null;
    position_in_lot: number;
    sold_at: string | null;
    sold_price: number | null;
    printing?: {Game}Printing;
}

export interface {Game}Collection {
    id: number;
    user_id: number;
    {game}_printing_id: number;
    condition: ConditionKey;
    language: LanguageKey;
    quantity: number;
    notes: string | null;
    printing?: {Game}Printing;
}

// Helper Functions
export function getRarityLabel(rarity: string | null): string {
    if (!rarity) return 'Unknown';
    return RARITIES[rarity as RarityKey] ?? rarity;
}
```

---

## 7. Frontend Pages erstellen

Kopiere die entsprechenden Seiten aus `resources/js/pages/fab/` und passe sie an:

- `cards/index.tsx` - Kartensuche mit Filtern
- `cards/show.tsx` - Kartendetails mit allen Drucken
- `printings/index.tsx` - Druckübersicht
- `printings/show.tsx` - Druckdetails
- `collection.tsx` - Persönliche Sammlung
- `inventory.tsx` - Verkaufsinventar
- `scanner.tsx` - Scanner-Interface

---

## 8. Checkliste

- [ ] Migrationen erstellen und ausführen
- [ ] Models erstellen
- [ ] GamesSeeder erweitern und ausführen
- [ ] Controller erstellen
- [ ] Routes definieren
- [ ] TypeScript Types erstellen
- [ ] Frontend Pages erstellen
- [ ] Navigation/Links hinzufügen
- [ ] Tests schreiben
- [ ] Daten-Import-Command erstellen (optional)

---

## Beispiel: One Piece Card Game

Slug: `onepiece`
Prefix: `Op` (z.B. OpCard, OpSet, OpPrinting)
Tabellen: `op_cards`, `op_sets`, `op_printings`, `op_inventory`, `op_collection`

Spezifische Attribute:
- Farben: Red, Blue, Green, Purple, Black, Yellow
- Kartentypen: Leader, Character, Event, Stage
- Attribute: Cost, Power, Counter, Life (für Leader)
- Trigger-Effekte
