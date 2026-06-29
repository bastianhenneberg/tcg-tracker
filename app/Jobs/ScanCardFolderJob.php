<?php

namespace App\Jobs;

use App\Models\Game;
use App\Services\Scanner\FolderScanService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;

class ScanCardFolderJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 3600;

    public function __construct(
        public int $gameId,
        public string $path,
        public int $userId,
        public int $lotId,
        public string $condition,
        public string $language,
        public bool $dryRun,
    ) {}

    /**
     * Cache key holding the latest scan status for a user.
     */
    public static function statusKey(int $userId): string
    {
        return "card_scan_status:{$userId}";
    }

    public function handle(FolderScanService $service): void
    {
        $game = Game::findOrFail($this->gameId);
        $key = self::statusKey($this->userId);

        Cache::put($key, ['state' => 'running', 'pages' => 0, 'matched' => 0, 'summary' => null], 3600);

        $summary = $service->scan(
            game: $game,
            path: $this->path,
            userId: $this->userId,
            lotId: $this->lotId,
            condition: $this->condition,
            language: $this->language,
            dryRun: $this->dryRun,
            onItem: function (array $item) use ($key): void {
                $status = Cache::get($key, ['state' => 'running', 'pages' => 0, 'matched' => 0]);
                $status['pages'] = ($status['pages'] ?? 0) + 1;
                if (in_array($item['status'], ['imported', 'matched (dry-run)'], true)) {
                    $status['matched'] = ($status['matched'] ?? 0) + 1;
                }
                Cache::put($key, $status, 3600);
            },
        );

        Cache::put($key, ['state' => 'done', 'summary' => $summary], 3600);
    }

    public function failed(\Throwable $e): void
    {
        Cache::put(self::statusKey($this->userId), ['state' => 'failed', 'error' => $e->getMessage()], 3600);
    }
}
