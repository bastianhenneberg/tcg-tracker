<?php

namespace App\Console\Commands;

use App\Services\CardImport\CardExportService;
use Illuminate\Console\Command;

class ExportUnifiedCards extends Command
{
    protected $signature = 'cards:export
                            {game : The game slug (fab, mtg, op, etc.)}
                            {file : Path to output JSON file}';

    protected $description = 'Export cards from unified card tables to JSON file';

    public function handle(CardExportService $exportService): int
    {
        $game = $this->argument('game');
        $file = $this->argument('file');

        // Validate game
        if (! $exportService->getMapper($game)) {
            $this->error("No export mapper found for game: {$game}");
            $this->info('Available mappers: '.implode(', ', $exportService->getAvailableMappers()));

            return self::FAILURE;
        }

        $this->info("Exporting cards for {$game} to {$file}...");

        try {
            $count = $exportService->exportToJsonFile($game, $file);

            $this->info("Export complete! {$count} cards exported.");

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Export failed: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
