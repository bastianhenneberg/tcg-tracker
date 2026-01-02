<?php

namespace App\Http\Controllers\Mtg;

use App\Http\Controllers\Controller;
use App\Models\Mtg\MtgCard;
use App\Models\Mtg\MtgPrinting;
use App\Models\Mtg\MtgSet;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MtgCardController extends Controller
{
    public function index(Request $request): Response
    {
        $query = MtgCard::query()
            ->with(['printings' => fn ($q) => $q->limit(1)])
            ->when($request->input('search'), function (Builder $query, string $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('oracle_text', 'like', "%{$search}%");
                });
            })
            ->when($request->input('color'), function (Builder $query, string $color) {
                if ($color === 'C') {
                    // Colorless
                    $query->whereJsonLength('colors', 0);
                } else {
                    $query->whereJsonContains('colors', $color);
                }
            })
            ->when($request->input('type'), function (Builder $query, string $type) {
                $query->whereJsonContains('types', $type);
            })
            ->when($request->input('format'), function (Builder $query, string $format) {
                $query->whereJsonContains('legalities->'.$format, 'Legal');
            })
            ->when($request->input('mana_value'), function (Builder $query, $mv) {
                if ($mv === '7+') {
                    $query->where('mana_value', '>=', 7);
                } else {
                    $query->where('mana_value', (int) $mv);
                }
            })
            ->orderBy('name');

        $cards = $query->paginate(24)->withQueryString();

        return Inertia::render('mtg/cards/index', [
            'cards' => $cards,
            'filters' => $request->only(['search', 'color', 'type', 'format', 'mana_value']),
            'colors' => [
                'W' => 'White',
                'U' => 'Blue',
                'B' => 'Black',
                'R' => 'Red',
                'G' => 'Green',
                'C' => 'Colorless',
            ],
            'formats' => [
                'standard' => 'Standard',
                'pioneer' => 'Pioneer',
                'modern' => 'Modern',
                'legacy' => 'Legacy',
                'vintage' => 'Vintage',
                'commander' => 'Commander',
                'pauper' => 'Pauper',
            ],
            'types' => [
                'Creature' => 'Creature',
                'Instant' => 'Instant',
                'Sorcery' => 'Sorcery',
                'Artifact' => 'Artifact',
                'Enchantment' => 'Enchantment',
                'Planeswalker' => 'Planeswalker',
                'Land' => 'Land',
            ],
        ]);
    }

    public function show(MtgCard $card): Response
    {
        $card->load([
            'printings' => fn ($q) => $q->with('set')->orderBy('number'),
        ]);

        return Inertia::render('mtg/cards/show', [
            'card' => $card,
            'rarities' => [
                'common' => 'Common',
                'uncommon' => 'Uncommon',
                'rare' => 'Rare',
                'mythic' => 'Mythic Rare',
            ],
            'finishes' => [
                'nonfoil' => 'Non-Foil',
                'foil' => 'Foil',
                'etched' => 'Etched Foil',
            ],
        ]);
    }

    public function printings(Request $request): Response
    {
        $query = MtgPrinting::query()
            ->with(['card', 'set'])
            ->when($request->input('search'), function (Builder $query, string $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('card', fn ($c) => $c->where('name', 'like', "%{$search}%"))
                        ->orWhere('number', 'like', "%{$search}%");
                });
            })
            ->when($request->input('set'), function (Builder $query, int $setId) {
                $query->where('mtg_set_id', $setId);
            })
            ->when($request->input('rarity'), function (Builder $query, string $rarity) {
                $query->where('rarity', $rarity);
            })
            ->orderBy('number');

        $printings = $query->paginate(24)->withQueryString();

        return Inertia::render('mtg/printings/index', [
            'printings' => $printings,
            'sets' => MtgSet::orderBy('name')->get(['id', 'code', 'name']),
            'filters' => $request->only(['search', 'set', 'rarity']),
            'rarities' => [
                'common' => 'Common',
                'uncommon' => 'Uncommon',
                'rare' => 'Rare',
                'mythic' => 'Mythic Rare',
            ],
        ]);
    }

    public function printing(MtgPrinting $printing): Response
    {
        $printing->load(['card', 'set']);

        $allPrintings = MtgPrinting::where('mtg_card_id', $printing->mtg_card_id)
            ->with('set')
            ->orderBy('number')
            ->get();

        return Inertia::render('mtg/printings/show', [
            'printing' => $printing,
            'allPrintings' => $allPrintings,
            'rarities' => [
                'common' => 'Common',
                'uncommon' => 'Uncommon',
                'rare' => 'Rare',
                'mythic' => 'Mythic Rare',
            ],
            'finishes' => [
                'nonfoil' => 'Non-Foil',
                'foil' => 'Foil',
                'etched' => 'Etched Foil',
            ],
        ]);
    }

    public function sets(Request $request): Response
    {
        $query = MtgSet::query()
            ->withCount('printings')
            ->when($request->input('search'), function (Builder $query, string $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%");
                });
            })
            ->when($request->input('type'), function (Builder $query, string $type) {
                $query->where('type', $type);
            })
            ->orderByDesc('release_date');

        $sets = $query->paginate(50)->withQueryString();

        return Inertia::render('mtg/sets/index', [
            'sets' => $sets,
            'filters' => $request->only(['search', 'type']),
            'types' => [
                'expansion' => 'Expansion',
                'core' => 'Core Set',
                'masters' => 'Masters',
                'commander' => 'Commander',
                'draft_innovation' => 'Draft Innovation',
            ],
        ]);
    }
}
