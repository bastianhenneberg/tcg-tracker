<?php

namespace App\Services\CardImport;

use App\Contracts\CardImport\CardExportMapperInterface;
use App\Models\UnifiedCard;
use App\Models\UnifiedSet;
use Illuminate\Support\Collection;

class CardExportService
{
    /** @var array<string, CardExportMapperInterface> */
    protected array $mappers = [];

    public function __construct()
    {
        $this->registerMapper(new FabCardExportMapper);
    }

    public function registerMapper(CardExportMapperInterface $mapper): void
    {
        $this->mappers[$mapper->getGameSlug()] = $mapper;
    }

    public function getMapper(string $gameSlug): ?CardExportMapperInterface
    {
        return $this->mappers[$gameSlug] ?? null;
    }

    public function getAvailableMappers(): array
    {
        return array_keys($this->mappers);
    }

    /**
     * Export all cards for a game.
     *
     * @return array{sets: array, cards: array}
     */
    public function exportGame(string $gameSlug): array
    {
        $mapper = $this->getMapper($gameSlug);
        if (! $mapper) {
            throw new \InvalidArgumentException("No export mapper found for game: {$gameSlug}");
        }

        $sets = UnifiedSet::forGame($gameSlug)->get();
        $cards = UnifiedCard::forGame($gameSlug)->with('printings')->get();

        return [
            'sets' => $sets->map(fn ($set) => $mapper->exportSet($set))->toArray(),
            'cards' => $cards->map(function ($card) use ($mapper) {
                $exported = $mapper->exportCard($card);
                $exported['printings'] = $card->printings->map(
                    fn ($p) => $mapper->exportPrinting($p)
                )->toArray();

                return $exported;
            })->toArray(),
        ];
    }

    /**
     * Export specific cards.
     *
     * @param  Collection<UnifiedCard>  $cards
     */
    public function exportCards(string $gameSlug, Collection $cards): array
    {
        $mapper = $this->getMapper($gameSlug);
        if (! $mapper) {
            throw new \InvalidArgumentException("No export mapper found for game: {$gameSlug}");
        }

        return $cards->map(function ($card) use ($mapper) {
            $card->load('printings');
            $exported = $mapper->exportCard($card);
            $exported['printings'] = $card->printings->map(
                fn ($p) => $mapper->exportPrinting($p)
            )->toArray();

            return $exported;
        })->toArray();
    }

    /**
     * Export to JSON file.
     */
    public function exportToJsonFile(string $gameSlug, string $filePath): int
    {
        $data = $this->exportGame($gameSlug);

        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        file_put_contents($filePath, $json);

        return count($data['cards']);
    }
}
