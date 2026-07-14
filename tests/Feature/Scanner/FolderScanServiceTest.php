<?php

use App\Models\Game;
use App\Models\Lot;
use App\Models\UnifiedCard;
use App\Models\UnifiedInventory;
use App\Models\UnifiedPrinting;
use App\Models\User;
use App\Services\Fab\FabCardMatcherService;
use App\Services\OllamaService;
use App\Services\Scanner\FolderScanService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;

uses(RefreshDatabase::class);

function fakeScanFolder(): string
{
    $dir = sys_get_temp_dir().'/tcg-scan-test-'.uniqid();
    mkdir($dir, 0775, true);
    file_put_contents($dir.'/card-001.jpg', 'dummy-image-bytes');

    return $dir;
}

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->game = Game::factory()->official()->create(['slug' => 'fab', 'name' => 'Flesh and Blood']);
    $this->lot = Lot::factory()->create(['user_id' => $this->user->id]);

    $card = UnifiedCard::factory()->forGame('fab')->create(['name' => 'Lightning Press']);
    $this->printing = UnifiedPrinting::factory()->forCard($card)->create();

    // Ollama always "recognizes" a card.
    $this->mock(OllamaService::class, function ($mock) {
        $mock->shouldReceive('recognizeCard')->andReturn([
            'success' => true,
            'data' => ['card_name' => 'Lightning Press', 'set_code' => 'WTR', 'collector_number' => '001'],
        ]);
    });

    // Matcher returns our known printing.
    $this->mock(FabCardMatcherService::class, function ($mock) {
        $mock->shouldReceive('findMatch')->andReturn([
            'match' => $this->printing,
            'confidence' => 'high',
            'alternatives' => new Collection,
            'is_custom' => false,
        ]);
    });
});

it('imports a matched card into inventory and moves the file', function () {
    $dir = fakeScanFolder();

    $summary = app(FolderScanService::class)->scan(
        game: $this->game,
        path: $dir,
        userId: $this->user->id,
        lotId: $this->lot->id,
        condition: 'NM',
        language: 'EN',
        dryRun: false,
    );

    expect($summary['matched'])->toBe(1)
        ->and($summary['pages'])->toBe(1);

    expect(UnifiedInventory::where('user_id', $this->user->id)->where('lot_id', $this->lot->id)->count())->toBe(1);

    // Original file moved into processed/
    expect(file_exists($dir.'/card-001.jpg'))->toBeFalse()
        ->and(file_exists($dir.'/processed/card-001.jpg'))->toBeTrue();

    array_map('unlink', glob($dir.'/processed/*') ?: []);
    @rmdir($dir.'/processed');
    @rmdir($dir);
});

it('does not write inventory or move files on dry-run', function () {
    $dir = fakeScanFolder();

    $summary = app(FolderScanService::class)->scan(
        game: $this->game,
        path: $dir,
        userId: $this->user->id,
        lotId: $this->lot->id,
        dryRun: true,
    );

    expect($summary['matched'])->toBe(1);
    expect(UnifiedInventory::count())->toBe(0);
    expect(file_exists($dir.'/card-001.jpg'))->toBeTrue();

    @unlink($dir.'/card-001.jpg');
    @rmdir($dir);
});

it('runs the tcg:scan-folder command in dry-run', function () {
    $dir = fakeScanFolder();

    $this->artisan('tcg:scan-folder', ['game' => 'fab', 'path' => $dir, '--dry-run' => true])
        ->assertSuccessful();

    expect(UnifiedInventory::count())->toBe(0);

    @unlink($dir.'/card-001.jpg');
    @rmdir($dir);
});

function jpegOfSize(int $width, int $height): string
{
    $image = imagecreatetruecolor($width, $height);
    ob_start();
    imagejpeg($image);
    $bytes = (string) ob_get_clean();
    imagedestroy($image);

    return $bytes;
}

function normalizeOrientation(string $bytes): string
{
    $service = app(FolderScanService::class);
    $method = (new ReflectionClass($service))->getMethod('normalizeOrientation');
    $method->setAccessible(true);

    return $method->invoke($service, $bytes);
}

it('rotates a landscape scan to portrait before recognition', function () {
    $out = normalizeOrientation(jpegOfSize(200, 100));

    [$width, $height] = getimagesizefromstring($out);
    expect($width)->toBe(100)->and($height)->toBe(200);
});

it('leaves a portrait scan unchanged', function () {
    $out = normalizeOrientation(jpegOfSize(100, 200));

    [$width, $height] = getimagesizefromstring($out);
    expect($width)->toBe(100)->and($height)->toBe(200);
});
