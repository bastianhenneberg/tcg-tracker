<?php

namespace App\Console\Commands;

use App\Models\Game;
use App\Models\Lot;
use App\Models\User;
use App\Services\Scanner\FolderScanService;
use Illuminate\Console\Command;

class ScanCardFolder extends Command
{
    protected $signature = 'tcg:scan-folder
                            {game : Game slug (fab, mtg, onepiece, riftbound)}
                            {path? : Folder to scan (default: /home/codingmachine/cards)}
                            {--user= : User ID whose inventory to fill (default: first user)}
                            {--lot= : Lot ID to assign cards to (required unless --dry-run)}
                            {--condition=NM : Card condition}
                            {--language=EN : Card language}
                            {--dry-run : Recognize & match only, write nothing and keep files in place}';

    protected $description = 'Scan a folder of card scans (PDF/images), recognize via Ollama and add matches to inventory';

    public function handle(FolderScanService $service): int
    {
        $game = Game::where('slug', $this->argument('game'))->first();
        if (! $game) {
            $this->error("Unknown game: {$this->argument('game')}");

            return self::FAILURE;
        }

        $path = $this->argument('path') ?: '/home/codingmachine/cards';
        if (! is_dir($path)) {
            $this->error("Folder not found: {$path}");

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');

        $userId = $this->option('user') ?: User::query()->min('id');
        if (! $userId) {
            $this->error('No user found. Pass --user=<id>.');

            return self::FAILURE;
        }

        $lotId = $this->option('lot');
        if (! $dryRun) {
            if (! $lotId || ! Lot::whereKey($lotId)->exists()) {
                $this->error('A valid --lot=<id> is required unless --dry-run is used.');

                return self::FAILURE;
            }
        }

        $this->info(sprintf('Scanning %s for %s%s...', $path, $game->slug, $dryRun ? ' (dry-run)' : ''));

        $summary = $service->scan(
            game: $game,
            path: $path,
            userId: (int) $userId,
            lotId: (int) ($lotId ?? 0),
            condition: (string) $this->option('condition'),
            language: (string) $this->option('language'),
            dryRun: $dryRun,
            onItem: function (array $item): void {
                $this->line(sprintf(
                    '  [%s] %s (S.%d) → %s',
                    $item['status'],
                    $item['recognized'] ?? '—',
                    $item['page'],
                    $item['matched'] ?? '—'
                ));
            }
        );

        $this->newLine();
        $this->table(['Metric', 'Count'], [
            ['Files', $summary['processed_files']],
            ['Pages', $summary['pages']],
            ['Matched/Imported', $summary['matched']],
            ['Unmatched', $summary['unmatched']],
            ['Failed', $summary['failed']],
        ]);

        return self::SUCCESS;
    }
}
