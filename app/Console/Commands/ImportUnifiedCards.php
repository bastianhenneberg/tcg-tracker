<?php

namespace App\Console\Commands;

use App\Services\CardImport\CardImportService;
use Illuminate\Console\Command;

class ImportUnifiedCards extends Command
{
    protected $signature = 'cards:import
                            {game : The game slug (fab, mtg, op, etc.)}
                            {file : Path to JSON file to import}
                            {--dry-run : Show what would be imported without actually importing}';

    protected $description = 'Import cards from JSON file into unified card tables';

    public function handle(CardImportService $importService): int
    {
        $game = $this->argument('game');
        $file = $this->argument('file');
        $dryRun = $this->option('dry-run');

        // Validate game
        if (! $importService->getMapper($game)) {
            $this->error("No import mapper found for game: {$game}");
            $this->info('Available mappers: '.implode(', ', $importService->getAvailableMappers()));

            return self::FAILURE;
        }

        // Validate file
        if (! file_exists($file)) {
            $this->error("File not found: {$file}");

            return self::FAILURE;
        }

        $this->info("Importing cards for {$game} from {$file}...");

        if ($dryRun) {
            $this->warn('DRY RUN - No changes will be made');
            $content = file_get_contents($file);
            $data = json_decode($content, true);

            if (isset($data['cards'])) {
                $this->info('Found '.count($data['cards']).' cards to import');
            } elseif (isset($data[0])) {
                $this->info('Found '.count($data).' cards to import');
            }

            if (isset($data['sets'])) {
                $this->info('Found '.count($data['sets']).' sets to import');
            }

            return self::SUCCESS;
        }

        try {
            $stats = $importService->importFromJsonFile($game, $file);

            $this->info('Import complete!');
            $this->table(
                ['Metric', 'Count'],
                [
                    ['Cards imported/updated', $stats['cards']],
                    ['Printings imported/updated', $stats['printings']],
                ]
            );

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Import failed: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
