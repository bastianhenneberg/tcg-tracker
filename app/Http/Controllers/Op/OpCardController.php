<?php

namespace App\Http\Controllers\Op;

use App\Http\Controllers\Controller;
use App\Models\Op\OpCard;
use App\Models\Op\OpPrinting;
use App\Models\Op\OpSet;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OpCardController extends Controller
{
    public function index(Request $request): Response
    {
        $query = OpCard::query()
            ->with(['printings' => fn ($q) => $q->limit(1)])
            ->when($request->input('search'), function (Builder $query, string $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('external_id', 'like', "%{$search}%")
                        ->orWhereHas('printings', fn ($p) => $p->where('external_id', 'like', "%{$search}%")
                            ->orWhere('collector_number', 'like', "%{$search}%"));
                });
            })
            ->when($request->input('card_type'), function (Builder $query, string $type) {
                $query->where('card_type', $type);
            })
            ->when($request->input('color'), function (Builder $query, string $color) {
                $query->where(function ($q) use ($color) {
                    $q->where('color', $color)
                        ->orWhere('color_secondary', $color);
                });
            })
            ->when($request->input('attribute'), function (Builder $query, string $attribute) {
                $query->where('attribute', $attribute);
            })
            ->when($request->input('cost'), function (Builder $query, int $cost) {
                $query->where('cost', $cost);
            })
            ->orderBy('name');

        $cards = $query->paginate(24)->withQueryString();

        return Inertia::render('op/cards/index', [
            'cards' => $cards,
            'filters' => $request->only(['search', 'card_type', 'color', 'attribute', 'cost']),
            'cardTypes' => OpCard::CARD_TYPES,
            'colors' => OpCard::COLORS,
            'attributes' => OpCard::ATTRIBUTES,
        ]);
    }

    public function show(OpCard $card): Response
    {
        $card->load([
            'printings' => fn ($q) => $q->with('set')->orderBy('collector_number'),
        ]);

        return Inertia::render('op/cards/show', [
            'card' => $card,
            'rarities' => OpPrinting::RARITIES,
            'languages' => OpPrinting::LANGUAGES,
        ]);
    }

    public function printings(Request $request): Response
    {
        $query = OpPrinting::query()
            ->with(['card', 'set'])
            ->when($request->input('search'), function (Builder $query, string $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('card', fn ($c) => $c->where('name', 'like', "%{$search}%"))
                        ->orWhere('external_id', 'like', "%{$search}%")
                        ->orWhere('collector_number', 'like', "%{$search}%");
                });
            })
            ->when($request->input('set'), function (Builder $query, int $setId) {
                $query->where('op_set_id', $setId);
            })
            ->when($request->input('rarity'), function (Builder $query, string $rarity) {
                $query->where('rarity', $rarity);
            })
            ->when($request->input('language'), function (Builder $query, string $language) {
                $query->where('language', $language);
            })
            ->orderBy('collector_number');

        $printings = $query->paginate(24)->withQueryString();

        return Inertia::render('op/printings/index', [
            'printings' => $printings,
            'sets' => OpSet::orderBy('name')->get(['id', 'name', 'external_id']),
            'filters' => $request->only(['search', 'set', 'rarity', 'language']),
            'rarities' => OpPrinting::RARITIES,
            'languages' => OpPrinting::LANGUAGES,
        ]);
    }

    public function printing(OpPrinting $printing): Response
    {
        $printing->load(['card', 'set']);

        $allPrintings = OpPrinting::where('op_card_id', $printing->op_card_id)
            ->with('set')
            ->orderBy('collector_number')
            ->get();

        return Inertia::render('op/printings/show', [
            'printing' => $printing,
            'allPrintings' => $allPrintings,
            'rarities' => OpPrinting::RARITIES,
            'languages' => OpPrinting::LANGUAGES,
        ]);
    }
}
