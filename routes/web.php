<?php

use App\Http\Controllers\BoxController;
use App\Http\Controllers\CustomCardController;
use App\Http\Controllers\DataMappingController;
use App\Http\Controllers\LotController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\QuickAddController;
use App\Http\Controllers\ScannerController;
use App\Http\Controllers\UnifiedCardController;
use App\Http\Controllers\UnifiedCollectionController;
use App\Http\Controllers\UnifiedInventoryController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    // Boxes
    Route::get('boxes', [BoxController::class, 'index'])->name('boxes.index');
    Route::post('boxes', [BoxController::class, 'store'])->name('boxes.store');
    Route::get('boxes/{box}', [BoxController::class, 'show'])->name('boxes.show');
    Route::patch('boxes/{box}', [BoxController::class, 'update'])->name('boxes.update');
    Route::delete('boxes/{box}', [BoxController::class, 'destroy'])->name('boxes.destroy');

    // Lots
    Route::get('lots', [LotController::class, 'index'])->name('lots.index');
    Route::post('lots', [LotController::class, 'store'])->name('lots.store');
    Route::get('lots/{lot}', [LotController::class, 'show'])->name('lots.show');
    Route::patch('lots/{lot}', [LotController::class, 'update'])->name('lots.update');
    Route::delete('lots/{lot}', [LotController::class, 'destroy'])->name('lots.destroy');

    // Unified Scanner (all games)
    Route::prefix('scanner')->name('scanner.')->group(function () {
        Route::get('/', [ScannerController::class, 'index'])->name('index');
        Route::post('/recognize', [ScannerController::class, 'recognize'])->name('recognize');
        Route::post('/confirm', [ScannerController::class, 'confirm'])->name('confirm');
        Route::post('/confirm-bulk', [ScannerController::class, 'confirmBulk'])->name('confirm-bulk');
        Route::post('/lot', [ScannerController::class, 'createLot'])->name('create-lot');
        Route::post('/settings', [ScannerController::class, 'saveSettings'])->name('save-settings');
    });

    // Quick Add (keyboard-optimized manual entry)
    Route::prefix('quick-add')->name('quick-add.')->group(function () {
        Route::get('/', [QuickAddController::class, 'index'])->name('index');
        Route::post('/confirm', [QuickAddController::class, 'confirm'])->name('confirm');
        Route::post('/lot', [QuickAddController::class, 'createLot'])->name('create-lot');
    });

    // ========== UNIFIED ROUTES (neue unified Tabellen) ==========
    Route::prefix('g/{slug}')->name('unified.')->group(function () {
        // Cards Database
        Route::get('cards', [UnifiedCardController::class, 'index'])->name('cards');
        Route::get('cards/{card}', [UnifiedCardController::class, 'show'])->name('cards.show');
        Route::get('printings', [UnifiedCardController::class, 'printings'])->name('printings');
        Route::get('printings/{printing}', [UnifiedCardController::class, 'printing'])->name('printings.show');
        Route::get('sets', [UnifiedCardController::class, 'sets'])->name('sets');
        Route::get('sets/{set}', [UnifiedCardController::class, 'set'])->name('sets.show');

        // Inventory
        Route::get('inventory', [UnifiedInventoryController::class, 'index'])->name('inventory');
        Route::patch('inventory/{item}', [UnifiedInventoryController::class, 'update'])->name('inventory.update');
        Route::delete('inventory/{item}', [UnifiedInventoryController::class, 'destroy'])->name('inventory.destroy');
        Route::post('inventory/mark-sold', [UnifiedInventoryController::class, 'markSold'])->name('inventory.mark-sold');
        Route::post('inventory/move-to-collection', [UnifiedInventoryController::class, 'moveToCollection'])->name('inventory.move-to-collection');
        Route::post('inventory/delete-multiple', [UnifiedInventoryController::class, 'destroyMultiple'])->name('inventory.delete-multiple');
        Route::get('inventory/export', [UnifiedInventoryController::class, 'export'])->name('inventory.export');

        // Collection
        Route::get('collection', [UnifiedCollectionController::class, 'index'])->name('collection');
        Route::patch('collection/{item}', [UnifiedCollectionController::class, 'update'])->name('collection.update');
        Route::delete('collection/{item}', [UnifiedCollectionController::class, 'destroy'])->name('collection.destroy');
        Route::post('collection/delete-multiple', [UnifiedCollectionController::class, 'destroyMultiple'])->name('collection.delete-multiple');
        Route::post('collection/move-to-inventory', [UnifiedCollectionController::class, 'moveToInventory'])->name('collection.move-to-inventory');
    });

    // Notifications
    Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');

    // Data Mappings (Platform)
    Route::get('data-mappings', [DataMappingController::class, 'index'])->name('data-mappings.index');

    // Custom Cards
    Route::get('custom-cards', [CustomCardController::class, 'index'])->name('custom-cards.index');
    Route::post('custom-cards', [CustomCardController::class, 'store'])->name('custom-cards.store');
    Route::post('custom-cards/create', [CustomCardController::class, 'create'])->name('custom-cards.create');
    Route::get('custom-cards/fab-cards/search', [CustomCardController::class, 'searchFabCards'])->name('custom-cards.search-fab');
    Route::patch('custom-cards/{card}', [CustomCardController::class, 'update'])->name('custom-cards.update');
    Route::delete('custom-cards/{card}', [CustomCardController::class, 'destroy'])->name('custom-cards.destroy');
    Route::post('custom-cards/{card}/printings', [CustomCardController::class, 'addPrinting'])->name('custom-cards.add-printing');
    Route::delete('custom-printings/{printing}', [CustomCardController::class, 'deletePrinting'])->name('custom-printings.destroy');
    Route::post('custom-printings/{printing}', [CustomCardController::class, 'updatePrinting'])->name('custom-printings.update');
    Route::get('custom-cards/{gameId}/search', [CustomCardController::class, 'search'])->name('custom-cards.search');

});

require __DIR__.'/settings.php';
