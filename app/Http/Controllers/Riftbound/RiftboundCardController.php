<?php

namespace App\Http\Controllers\Riftbound;

use App\Http\Controllers\Controller;
use App\Models\Riftbound\RiftboundCard;
use App\Models\Riftbound\RiftboundPrinting;
use App\Models\Riftbound\RiftboundSet;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RiftboundCardController extends Controller
{
    public function index(Request $request): Response
    {
        $query = RiftboundCard::query()
            ->with(['printings' => fn ($q) => $q->limit(1)])
            ->when($request->input('search'), function (Builder $query, string $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhereHas('printings', fn ($p) => $p->where('collector_number', 'like', "%{$search}%"));
                });
            })
            ->when($request->input('type'), function (Builder $query, string $type) {
                $query->whereJsonContains('types', $type);
            })
            ->when($request->input('domain'), function (Builder $query, string $domain) {
                $query->whereJsonContains('domains', $domain);
            })
            ->orderBy('name');

        $cards = $query->paginate(24)->withQueryString();

        return Inertia::render('riftbound/cards/index', [
            'cards' => $cards,
            'filters' => $request->only(['search', 'type', 'domain']),
            'types' => RiftboundCard::TYPES,
            'domains' => RiftboundCard::DOMAINS,
        ]);
    }

    public function show(RiftboundCard $card): Response
    {
        $card->load([
            'printings' => fn ($q) => $q->with('set')->orderBy('collector_number'),
        ]);

        return Inertia::render('riftbound/cards/show', [
            'card' => $card,
            'rarities' => RiftboundPrinting::RARITIES,
            'foilings' => RiftboundPrinting::FOILINGS,
        ]);
    }

    public function printings(Request $request): Response
    {
        $query = RiftboundPrinting::query()
            ->with(['card', 'set'])
            ->when($request->input('search'), function (Builder $query, string $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('card', fn ($c) => $c->where('name', 'like', "%{$search}%"))
                        ->orWhere('collector_number', 'like', "%{$search}%");
                });
            })
            ->when($request->input('set'), function (Builder $query, int $setId) {
                $query->where('riftbound_set_id', $setId);
            })
            ->when($request->input('rarity'), function (Builder $query, string $rarity) {
                $query->where('rarity', $rarity);
            })
            ->when($request->input('foiling'), function (Builder $query, string $foiling) {
                $query->where('foiling', $foiling);
            })
            ->orderBy('collector_number');

        $printings = $query->paginate(24)->withQueryString();

        return Inertia::render('riftbound/printings/index', [
            'printings' => $printings,
            'sets' => RiftboundSet::orderBy('name')->get(['id', 'name', 'code']),
            'filters' => $request->only(['search', 'set', 'rarity', 'foiling']),
            'rarities' => RiftboundPrinting::RARITIES,
            'foilings' => RiftboundPrinting::FOILINGS,
        ]);
    }

    public function printing(RiftboundPrinting $printing): Response
    {
        $printing->load(['card', 'set']);

        $allPrintings = RiftboundPrinting::where('riftbound_card_id', $printing->riftbound_card_id)
            ->with('set')
            ->orderBy('collector_number')
            ->get();

        return Inertia::render('riftbound/printings/show', [
            'printing' => $printing,
            'allPrintings' => $allPrintings,
            'rarities' => RiftboundPrinting::RARITIES,
            'foilings' => RiftboundPrinting::FOILINGS,
        ]);
    }
}
