<?php

use App\Http\Controllers\BoxController;
use App\Http\Controllers\Fab\FabCardController;
use App\Http\Controllers\Fab\FabCollectionController;
use App\Http\Controllers\Fab\FabInventoryController;
use App\Http\Controllers\Fab\FabScannerController;
use App\Http\Controllers\LotController;
use App\Http\Controllers\NotificationController;
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

    // Flesh and Blood
    Route::prefix('fab')->name('fab.')->group(function () {
        // Scanner (Camera + Manual Search)
        Route::get('scanner', [FabScannerController::class, 'index'])->name('scanner');
        Route::post('scanner/recognize', [FabScannerController::class, 'recognize'])->name('scanner.recognize');
        Route::post('scanner/search', [FabScannerController::class, 'search'])->name('scanner.search');
        Route::post('scanner/confirm', [FabScannerController::class, 'confirm'])->name('scanner.confirm');
        Route::post('scanner/confirm-bulk', [FabScannerController::class, 'confirmBulk'])->name('scanner.confirm-bulk');
        Route::post('scanner/lot', [FabScannerController::class, 'createLot'])->name('scanner.create-lot');
        Route::post('scanner/settings', [FabScannerController::class, 'saveSettings'])->name('scanner.save-settings');
        Route::get('scanner/settings', [FabScannerController::class, 'getSettings'])->name('scanner.get-settings');

        // Inventory
        Route::get('inventory', [FabInventoryController::class, 'index'])->name('inventory');
        Route::post('inventory', [FabInventoryController::class, 'store'])->name('inventory.store');
        Route::patch('inventory/{item}', [FabInventoryController::class, 'update'])->name('inventory.update');
        Route::delete('inventory/{item}', [FabInventoryController::class, 'destroy'])->name('inventory.destroy');
        Route::post('inventory/mark-sold', [FabInventoryController::class, 'markSold'])->name('inventory.mark-sold');
        Route::post('inventory/move-to-collection', [FabInventoryController::class, 'moveToCollection'])->name('inventory.move-to-collection');
        Route::post('inventory/delete-multiple', [FabInventoryController::class, 'deleteMultiple'])->name('inventory.delete-multiple');

        // Collection (Karten werden nur über Inventar hinzugefügt)
        Route::get('collection', [FabCollectionController::class, 'index'])->name('collection');
        Route::patch('collection/{item}', [FabCollectionController::class, 'update'])->name('collection.update');
        Route::delete('collection/{item}', [FabCollectionController::class, 'destroy'])->name('collection.destroy');

        // Card Database
        Route::get('cards', [FabCardController::class, 'index'])->name('cards');
        Route::get('cards/{card}', [FabCardController::class, 'show'])->name('cards.show');
        Route::get('printings', [FabCardController::class, 'printings'])->name('printings');
        Route::get('printings/{printing}', [FabCardController::class, 'printing'])->name('printings.show');
    });

    // Notifications
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
});

require __DIR__.'/settings.php';
