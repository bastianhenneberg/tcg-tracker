<?php

namespace App\Http\Controllers\Fab;

use App\Http\Controllers\Controller;
use App\Models\Custom\CustomCard;
use App\Models\Fab\FabCard;
use App\Models\Fab\FabPrinting;
use App\Models\Fab\FabSet;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class FabCardController extends Controller
{
    public function index(Request $request): Response
    {
        $query = FabCard::query()
            ->with(['printings' => fn ($q) => $q->limit(1)])
            ->when($request->input('search'), function (Builder $query, string $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhereHas('printings', fn ($p) => $p->where('collector_number', 'like', "%{$search}%"));
                });
            })
            ->when($request->input('pitch'), function (Builder $query, int $pitch) {
                $query->where('pitch', $pitch);
            })
            ->when($request->input('type'), function (Builder $query, string $type) {
                $query->whereJsonContains('types', $type);
            })
            ->when($request->input('format'), function (Builder $query, string $format) {
                $query->legal($format);
            })
            ->orderBy('name');

        $cards = $query->paginate(24)->withQueryString();

        return Inertia::render('fab/cards/index', [
            'cards' => $cards,
            'filters' => $request->only(['search', 'pitch', 'type', 'format']),
            'formats' => [
                'blitz' => 'Blitz',
                'cc' => 'Classic Constructed',
                'commoner' => 'Commoner',
                'll' => 'Living Legend',
            ],
        ]);
    }

    public function show(FabCard $card): Response
    {
        $card->load([
            'printings' => fn ($q) => $q->with('set')->orderBy('collector_number'),
        ]);

        // Get linked custom cards (translations/variants) for current user
        $linkedCustomCards = [];
        if (Auth::check()) {
            $linkedCustomCards = CustomCard::where('linked_fab_card_id', $card->id)
                ->where('user_id', Auth::id())
                ->with('printings')
                ->get()
                ->map(fn ($cc) => [
                    'id' => $cc->id,
                    'name' => $cc->name,
                    'printings' => $cc->printings->map(fn ($p) => [
                        'id' => $p->id,
                        'set_name' => $p->set_name ?? 'Custom',
                        'collector_number' => ($p->set_name ?? '').($p->collector_number ?? '') ?: '-',
                        'rarity' => $p->rarity,
                        'foiling' => $p->foiling,
                        'language' => $p->language,
                    ]),
                ]);
        }

        return Inertia::render('fab/cards/show', [
            'card' => $card,
            'linkedCustomCards' => $linkedCustomCards,
            'rarities' => FabPrinting::RARITIES,
            'foilings' => FabPrinting::FOILINGS,
            'editions' => FabPrinting::EDITIONS,
            'languages' => FabPrinting::LANGUAGES,
        ]);
    }

    public function printings(Request $request): Response
    {
        $query = FabPrinting::query()
            ->with(['card', 'set'])
            ->when($request->input('search'), function (Builder $query, string $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('card', fn ($c) => $c->where('name', 'like', "%{$search}%"))
                        ->orWhere('collector_number', 'like', "%{$search}%");
                });
            })
            ->when($request->input('set'), function (Builder $query, int $setId) {
                $query->where('fab_set_id', $setId);
            })
            ->when($request->input('rarity'), function (Builder $query, string $rarity) {
                $query->where('rarity', $rarity);
            })
            ->when($request->input('foiling'), function (Builder $query, string $foiling) {
                $query->where('foiling', $foiling);
            })
            ->when($request->input('language'), function (Builder $query, string $language) {
                $query->where('language', $language);
            })
            ->when($request->input('edition'), function (Builder $query, string $edition) {
                $query->where('edition', $edition);
            })
            ->orderBy('collector_number');

        $printings = $query->paginate(24)->withQueryString();

        return Inertia::render('fab/printings/index', [
            'printings' => $printings,
            'sets' => FabSet::orderBy('name')->get(['id', 'name', 'external_id']),
            'filters' => $request->only(['search', 'set', 'rarity', 'foiling', 'language', 'edition']),
            'rarities' => FabPrinting::RARITIES,
            'foilings' => FabPrinting::FOILINGS,
            'editions' => FabPrinting::EDITIONS,
            'languages' => FabPrinting::LANGUAGES,
        ]);
    }

    public function printing(FabPrinting $printing): Response
    {
        $printing->load(['card', 'set']);

        $allPrintings = FabPrinting::where('fab_card_id', $printing->fab_card_id)
            ->with('set')
            ->orderBy('collector_number')
            ->get();

        return Inertia::render('fab/printings/show', [
            'printing' => $printing,
            'allPrintings' => $allPrintings,
            'rarities' => FabPrinting::RARITIES,
            'foilings' => FabPrinting::FOILINGS,
            'editions' => FabPrinting::EDITIONS,
            'languages' => FabPrinting::LANGUAGES,
        ]);
    }
}
