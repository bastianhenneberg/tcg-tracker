# TCG Tracker

A comprehensive trading card game collection and inventory management platform. Track, organize, and manage your cards across multiple games with AI-powered card scanning, binder organization, deck building, and export functionality.

## Features

- **Multi-Game Support** — Flesh and Blood, Magic: The Gathering, One Piece, Riftbound, plus custom games
- **AI Card Scanner** — Camera-based card recognition via Ollama with bulk scanning mode
- **Inventory Management** — Track cards for sale with lots, boxes, conditions, and pricing
- **Collection & Binders** — Organize your personal collection in physical binder layouts with drag-and-drop
- **Deck Builder** — Build decks with zone management, format validation, and inventory assignment
- **Custom Cards** — Create cards for unsupported games with full inventory integration
- **Quick Add** — Keyboard-optimized manual card entry
- **Export** — CSV export with Cardmarket ID matching (FAB)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | PHP 8.5, Laravel 13 |
| Frontend | React 19, TypeScript 6, Tailwind CSS 4 |
| Bridge | Inertia.js v3 (SSR) |
| Database | SQLite (default) |
| AI | Ollama (qwen2.5) |
| Testing | Pest v4 |
| Build | Vite 8 |

## Setup

```bash
# Clone and install
git clone git@github.com:bastianhenneberg/tcg-tracker.git
cd tcg-tracker
composer install
npm install

# Environment
cp .env.example .env
php artisan key:generate
php artisan migrate --seed

# Build & run
npm run build
composer run dev
```

### Environment Variables

```env
# Required
DB_CONNECTION=sqlite

# Card Scanner (optional)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5
OLLAMA_TIMEOUT=120
```

## Card Data Import

Import card databases from external sources:

```bash
# Flesh and Blood
php artisan tcg:import-fab data/fab/card-flattened.json

# Magic: The Gathering (from MTGJSON AllPrintings.json)
php artisan tcg:import-mtg data/mtg/AllPrintings.json

# One Piece Card Game
php artisan tcg:import-onepiece data/op/cards.json

# Riftbound
php artisan tcg:import-riftbound data/riftbound/cards.json

# Sync into unified system
php artisan cards:import-unified {game-slug}
```

## Routes

| Route | Description |
|-------|-------------|
| `/scanner?game={slug}` | AI card scanner |
| `/quick-add?game={slug}` | Manual card entry |
| `/g/{slug}/inventory` | Inventory management |
| `/g/{slug}/collection` | Personal collection |
| `/g/{slug}/cards` | Card database browser |
| `/g/{slug}/decks` | Deck list & builder |
| `/binders` | Binder organization |
| `/custom-cards` | Custom card management |

## Architecture

### Unified Card System

All games share a unified schema for cross-game functionality:

```
UnifiedCard (game, name, type_line, cost, power, ...)
    └── UnifiedPrinting (collector_number, set, rarity, foiling, image_url)
            └── UnifiedInventory (user_id, lot_id, condition, language, quantity)
```

Game-specific models (FabCard, MtgCard, etc.) are retained for import commands only.

### Key Patterns

- **CardMatcherService** per game — implements `CardMatcherInterface` for card recognition
- **Scanner Flow** — Camera/Search → CardMatcher → UnifiedInventory (no optimistic UI updates)
- **DataTable** — TanStack Table with server-side pagination, sorting, row selection, and bulk actions
- **Binder D&D** — @dnd-kit for drag-and-drop card organization

## Testing

```bash
php artisan test                          # All tests
php artisan test --compact                # Compact output
php artisan test --filter=ScannerTest     # Specific test
```

## Documentation

- [`docs/ADD_NEW_GAME.md`](docs/ADD_NEW_GAME.md) — Guide for adding new game support
- [`docs/FUTURE_FEATURES.md`](docs/FUTURE_FEATURES.md) — Planned features and roadmap
