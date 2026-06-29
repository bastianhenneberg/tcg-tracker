<?php

namespace App\Services\Scanner;

use App\Contracts\CardMatcherInterface;
use App\Models\Game;
use App\Models\UnifiedInventory;
use App\Services\Fab\FabCardMatcherService;
use App\Services\Mtg\MtgCardMatcherService;
use App\Services\OllamaService;
use App\Services\Op\OpCardMatcherService;
use App\Services\Riftbound\RiftboundCardMatcherService;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;

/**
 * Scans a local folder of card scans (PDF pages or images), recognizes each card
 * via the Ollama vision model, matches it against the card database and writes it
 * to the user's inventory. Designed for the network scanner drop folder workflow.
 */
class FolderScanService
{
    /** Image extensions handled directly (one card per file). */
    private const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

    public function __construct(protected OllamaService $ollamaService) {}

    /**
     * Scan every supported file in $path.
     *
     * @param  callable(array):void|null  $onItem  optional progress callback per processed page
     * @return array{processed_files: int, pages: int, matched: int, unmatched: int, failed: int, items: array<int, array{file: string, page: int, recognized: ?string, matched: ?string, status: string}>}
     */
    public function scan(
        Game $game,
        string $path,
        int $userId,
        int $lotId,
        string $condition = 'NM',
        string $language = 'EN',
        bool $dryRun = false,
        ?callable $onItem = null
    ): array {
        $summary = ['processed_files' => 0, 'pages' => 0, 'matched' => 0, 'unmatched' => 0, 'failed' => 0, 'items' => []];

        $matcher = $this->matcherFor($game);
        if (! $matcher) {
            throw new \InvalidArgumentException("No card matcher available for game: {$game->slug}");
        }

        $processedDir = rtrim($path, '/').'/processed';

        foreach ($this->sourceFiles($path) as $file) {
            $summary['processed_files']++;
            $images = $this->imagesFromFile($file);

            foreach ($images as $page => $base64) {
                $summary['pages']++;
                $item = ['file' => basename($file), 'page' => $page + 1, 'recognized' => null, 'matched' => null, 'status' => 'unmatched'];

                $recognition = $this->recognize($game, $base64);

                if (! ($recognition['success'] ?? false)) {
                    $item['status'] = 'failed';
                    $summary['failed']++;
                } else {
                    $item['recognized'] = $recognition['data']['card_name'] ?? null;
                    $result = $matcher->findMatch($recognition['data']);

                    if ($result['match'] && ! $result['is_custom']) {
                        $item['matched'] = $result['match']->card->name;
                        $item['status'] = $dryRun ? 'matched (dry-run)' : 'imported';
                        $summary['matched']++;

                        if (! $dryRun) {
                            $this->addToInventory($result['match']->id, $userId, $lotId, $condition, $language);
                        }
                    } else {
                        $summary['unmatched']++;
                    }
                }

                $summary['items'][] = $item;

                if ($onItem) {
                    $onItem($item);
                }
            }

            if (! $dryRun) {
                $this->moveToProcessed($file, $processedDir);
            }
        }

        return $summary;
    }

    /**
     * List supported source files in the folder (excludes the processed/ subfolder).
     *
     * @return array<int, string>
     */
    public function sourceFiles(string $path): array
    {
        if (! is_dir($path)) {
            return [];
        }

        $files = [];
        foreach (scandir($path) ?: [] as $entry) {
            $full = $path.'/'.$entry;
            if ($entry === '.' || $entry === '..' || ! is_file($full)) {
                continue;
            }

            $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
            if ($ext === 'pdf' || in_array($ext, self::IMAGE_EXTENSIONS, true)) {
                $files[] = $full;
            }
        }

        sort($files);

        return $files;
    }

    /**
     * Convert a source file into one or more base64-encoded page images.
     * PDFs are rasterized one image per page; images are returned as-is.
     *
     * @return array<int, string>
     */
    protected function imagesFromFile(string $file): array
    {
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));

        if (in_array($ext, self::IMAGE_EXTENSIONS, true)) {
            return [base64_encode((string) file_get_contents($file))];
        }

        // PDF: rasterize pages to JPEG via poppler's pdftoppm.
        $tmpDir = sys_get_temp_dir().'/tcg-scan-'.Str::random(8);
        mkdir($tmpDir, 0775, true);

        try {
            Process::timeout(120)->run(['pdftoppm', '-jpeg', '-r', '200', $file, $tmpDir.'/page']);

            $images = [];
            $pages = glob($tmpDir.'/page*.jpg') ?: [];
            sort($pages);
            foreach ($pages as $page) {
                $images[] = base64_encode((string) file_get_contents($page));
            }

            return $images;
        } finally {
            array_map('unlink', glob($tmpDir.'/*') ?: []);
            @rmdir($tmpDir);
        }
    }

    /**
     * Recognize a card image using the game-specific vision prompt.
     *
     * @return array{success: bool, data?: array, error?: string}
     */
    protected function recognize(Game $game, string $base64): array
    {
        return match ($game->slug) {
            'mtg', 'magic-the-gathering' => $this->ollamaService->recognizeMtgCard($base64),
            default => $this->ollamaService->recognizeCard($base64),
        };
    }

    /**
     * Resolve the card matcher for official games (vision recognition only supports these).
     */
    protected function matcherFor(Game $game): ?CardMatcherInterface
    {
        return match ($game->slug) {
            'fab' => app(FabCardMatcherService::class),
            'mtg', 'magic-the-gathering' => app(MtgCardMatcherService::class),
            'onepiece' => app(OpCardMatcherService::class),
            'riftbound' => app(RiftboundCardMatcherService::class),
            default => null,
        };
    }

    /**
     * Create an inventory item for a matched printing (mirrors the camera scanner).
     */
    protected function addToInventory(int $printingId, int $userId, int $lotId, string $condition, string $language): void
    {
        $position = UnifiedInventory::where('lot_id', $lotId)->max('extra->position_in_lot') ?? 0;

        UnifiedInventory::create([
            'user_id' => $userId,
            'lot_id' => $lotId,
            'printing_id' => $printingId,
            'condition' => $condition,
            'language' => $language,
            'quantity' => 1,
            'in_collection' => false,
            'extra' => ['position_in_lot' => $position + 1],
        ]);
    }

    /**
     * Move a fully processed source file into the processed/ subfolder.
     */
    protected function moveToProcessed(string $file, string $processedDir): void
    {
        if (! is_dir($processedDir)) {
            mkdir($processedDir, 0775, true);
        }

        $target = $processedDir.'/'.basename($file);
        if (file_exists($target)) {
            $target = $processedDir.'/'.pathinfo($file, PATHINFO_FILENAME).'-'.Str::random(6).'.'.pathinfo($file, PATHINFO_EXTENSION);
        }

        @rename($file, $target);
    }
}
