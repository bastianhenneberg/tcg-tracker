<?php

use App\Http\Controllers\BoxController;
use App\Http\Controllers\CustomCardController;
use App\Http\Controllers\CustomGameController;
use App\Http\Controllers\Fab\FabCardController;
use App\Http\Controllers\Fab\FabCollectionController;
use App\Http\Controllers\Fab\FabInventoryController;
use App\Http\Controllers\Fab\FabScannerController;
use App\Http\Controllers\LotController;
use App\Http\Controllers\Mtg\MtgCardController;
use App\Http\Controllers\Mtg\MtgCollectionController;
use App\Http\Controllers\Mtg\MtgInventoryController;
use App\Http\Controllers\Mtg\MtgScannerController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Op\OpCardController;
use App\Http\Controllers\Op\OpCollectionController;
use App\Http\Controllers\Op\OpInventoryController;
use App\Http\Controllers\Op\OpScannerController;
use App\Http\Controllers\Riftbound\RiftboundCardController;
use App\Http\Controllers\Riftbound\RiftboundCollectionController;
use App\Http\Controllers\Riftbound\RiftboundInventoryController;
use App\Http\Controllers\Riftbound\RiftboundScannerController;
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
        Route::post('inventory/delete-multiple-custom', [FabInventoryController::class, 'deleteMultipleCustom'])->name('inventory.delete-multiple-custom');

        // Collection (Karten werden nur über Inventar hinzugefügt)
        Route::get('collection', [FabCollectionController::class, 'index'])->name('collection');
        Route::patch('collection/{item}', [FabCollectionController::class, 'update'])->name('collection.update');
        Route::delete('collection/{item}', [FabCollectionController::class, 'destroy'])->name('collection.destroy');
        Route::post('collection/delete-multiple', [FabCollectionController::class, 'deleteMultiple'])->name('collection.delete-multiple');

        // Card Database
        Route::get('cards', [FabCardController::class, 'index'])->name('cards');
        Route::get('cards/{card}', [FabCardController::class, 'show'])->name('cards.show');
        Route::get('printings', [FabCardController::class, 'printings'])->name('printings');
        Route::get('printings/{printing}', [FabCardController::class, 'printing'])->name('printings.show');
    });

    // Magic: The Gathering
    Route::prefix('mtg')->name('mtg.')->group(function () {
        // Scanner (with Camera and Search)
        Route::get('scanner', [MtgScannerController::class, 'index'])->name('scanner');
        Route::post('scanner/search', [MtgScannerController::class, 'search'])->name('scanner.search');
        Route::post('scanner/recognize', [MtgScannerController::class, 'recognize'])->name('scanner.recognize');
        Route::post('scanner/confirm', [MtgScannerController::class, 'confirm'])->name('scanner.confirm');
        Route::post('scanner/confirm-bulk', [MtgScannerController::class, 'confirmBulk'])->name('scanner.confirm-bulk');
        Route::post('scanner/lot', [MtgScannerController::class, 'createLot'])->name('scanner.create-lot');
        Route::post('scanner/settings', [MtgScannerController::class, 'saveSettings'])->name('scanner.settings');
        Route::get('scanner/settings', [MtgScannerController::class, 'getSettings'])->name('scanner.settings.get');

        // Inventory
        Route::get('inventory', [MtgInventoryController::class, 'index'])->name('inventory');
        Route::post('inventory', [MtgInventoryController::class, 'store'])->name('inventory.store');
        Route::patch('inventory/{item}', [MtgInventoryController::class, 'update'])->name('inventory.update');
        Route::delete('inventory/{item}', [MtgInventoryController::class, 'destroy'])->name('inventory.destroy');
        Route::post('inventory/mark-sold', [MtgInventoryController::class, 'markSold'])->name('inventory.mark-sold');
        Route::post('inventory/move-to-collection', [MtgInventoryController::class, 'moveToCollection'])->name('inventory.move-to-collection');
        Route::post('inventory/delete-multiple', [MtgInventoryController::class, 'deleteMultiple'])->name('inventory.delete-multiple');

        // Collection
        Route::get('collection', [MtgCollectionController::class, 'index'])->name('collection');
        Route::patch('collection/{item}', [MtgCollectionController::class, 'update'])->name('collection.update');
        Route::delete('collection/{item}', [MtgCollectionController::class, 'destroy'])->name('collection.destroy');
        Route::post('collection/delete-multiple', [MtgCollectionController::class, 'deleteMultiple'])->name('collection.delete-multiple');

        // Card Database
        Route::get('cards', [MtgCardController::class, 'index'])->name('cards');
        Route::get('cards/{card}', [MtgCardController::class, 'show'])->name('cards.show');
        Route::get('printings', [MtgCardController::class, 'printings'])->name('printings');
        Route::get('printings/{printing}', [MtgCardController::class, 'printing'])->name('printings.show');
        Route::get('sets', [MtgCardController::class, 'sets'])->name('sets');
    });

    // Riftbound
    Route::prefix('riftbound')->name('riftbound.')->group(function () {
        // Scanner (Search-based, no camera)
        Route::get('scanner', [RiftboundScannerController::class, 'index'])->name('scanner');
        Route::post('scanner/confirm', [RiftboundScannerController::class, 'confirm'])->name('scanner.confirm');
        Route::post('scanner/confirm-bulk', [RiftboundScannerController::class, 'confirmBulk'])->name('scanner.confirm-bulk');
        Route::post('scanner/lot', [RiftboundScannerController::class, 'createLot'])->name('scanner.create-lot');
        Route::post('scanner/settings', [RiftboundScannerController::class, 'saveSettings'])->name('scanner.save-settings');
        Route::get('scanner/settings', [RiftboundScannerController::class, 'getSettings'])->name('scanner.get-settings');

        // Inventory
        Route::get('inventory', [RiftboundInventoryController::class, 'index'])->name('inventory');
        Route::post('inventory', [RiftboundInventoryController::class, 'store'])->name('inventory.store');
        Route::patch('inventory/{item}', [RiftboundInventoryController::class, 'update'])->name('inventory.update');
        Route::delete('inventory/{item}', [RiftboundInventoryController::class, 'destroy'])->name('inventory.destroy');
        Route::post('inventory/mark-sold', [RiftboundInventoryController::class, 'markSold'])->name('inventory.mark-sold');
        Route::post('inventory/move-to-collection', [RiftboundInventoryController::class, 'moveToCollection'])->name('inventory.move-to-collection');
        Route::post('inventory/delete-multiple', [RiftboundInventoryController::class, 'deleteMultiple'])->name('inventory.delete-multiple');

        // Collection
        Route::get('collection', [RiftboundCollectionController::class, 'index'])->name('collection');
        Route::patch('collection/{item}', [RiftboundCollectionController::class, 'update'])->name('collection.update');
        Route::delete('collection/{item}', [RiftboundCollectionController::class, 'destroy'])->name('collection.destroy');
        Route::post('collection/delete-multiple', [RiftboundCollectionController::class, 'deleteMultiple'])->name('collection.delete-multiple');

        // Card Database
        Route::get('cards', [RiftboundCardController::class, 'index'])->name('cards');
        Route::get('cards/{card}', [RiftboundCardController::class, 'show'])->name('cards.show');
        Route::get('printings', [RiftboundCardController::class, 'printings'])->name('printings');
        Route::get('printings/{printing}', [RiftboundCardController::class, 'printing'])->name('printings.show');
    });

    // One Piece Card Game
    Route::prefix('onepiece')->name('op.')->group(function () {
        // Scanner (Search-based)
        Route::get('scanner', [OpScannerController::class, 'index'])->name('scanner');
        Route::post('scanner/confirm', [OpScannerController::class, 'confirm'])->name('scanner.confirm');
        Route::post('scanner/confirm-bulk', [OpScannerController::class, 'confirmBulk'])->name('scanner.confirm-bulk');
        Route::post('scanner/lot', [OpScannerController::class, 'createLot'])->name('scanner.create-lot');
        Route::post('scanner/settings', [OpScannerController::class, 'saveSettings'])->name('scanner.save-settings');
        Route::get('scanner/settings', [OpScannerController::class, 'getSettings'])->name('scanner.get-settings');

        // Inventory
        Route::get('inventory', [OpInventoryController::class, 'index'])->name('inventory');
        Route::post('inventory', [OpInventoryController::class, 'store'])->name('inventory.store');
        Route::patch('inventory/{item}', [OpInventoryController::class, 'update'])->name('inventory.update');
        Route::delete('inventory/{item}', [OpInventoryController::class, 'destroy'])->name('inventory.destroy');
        Route::post('inventory/mark-sold', [OpInventoryController::class, 'markSold'])->name('inventory.mark-sold');
        Route::post('inventory/move-to-collection', [OpInventoryController::class, 'moveToCollection'])->name('inventory.move-to-collection');
        Route::post('inventory/delete-multiple', [OpInventoryController::class, 'deleteMultiple'])->name('inventory.delete-multiple');

        // Collection
        Route::get('collection', [OpCollectionController::class, 'index'])->name('collection');
        Route::patch('collection/{item}', [OpCollectionController::class, 'update'])->name('collection.update');
        Route::delete('collection/{item}', [OpCollectionController::class, 'destroy'])->name('collection.destroy');
        Route::post('collection/delete-multiple', [OpCollectionController::class, 'deleteMultiple'])->name('collection.delete-multiple');

        // Card Database
        Route::get('cards', [OpCardController::class, 'index'])->name('cards');
        Route::get('cards/{card}', [OpCardController::class, 'show'])->name('cards.show');
        Route::get('printings', [OpCardController::class, 'printings'])->name('printings');
        Route::get('printings/{printing}', [OpCardController::class, 'printing'])->name('printings.show');
    });

    // Notifications
    Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');

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

    // Custom Games (dynamic routes for any game by slug)
    Route::prefix('games/{slug}')->name('games.')->group(function () {
        // Scanner
        Route::get('scanner', [CustomGameController::class, 'scanner'])->name('scanner');
        Route::post('scanner/search', [CustomGameController::class, 'search'])->name('scanner.search');
        Route::post('scanner/confirm', [CustomGameController::class, 'confirm'])->name('scanner.confirm');
        Route::post('scanner/lot', [CustomGameController::class, 'createLot'])->name('scanner.create-lot');

        // Inventory
        Route::get('inventory', [CustomGameController::class, 'inventory'])->name('inventory');
        Route::patch('inventory/{item}', [CustomGameController::class, 'inventoryUpdate'])->name('inventory.update');
        Route::delete('inventory/{item}', [CustomGameController::class, 'inventoryDestroy'])->name('inventory.destroy');
        Route::post('inventory/mark-sold', [CustomGameController::class, 'inventoryMarkSold'])->name('inventory.mark-sold');
        Route::post('inventory/move-to-collection', [CustomGameController::class, 'inventoryMoveToCollection'])->name('inventory.move-to-collection');
        Route::post('inventory/delete-multiple', [CustomGameController::class, 'inventoryDeleteMultiple'])->name('inventory.delete-multiple');

        // Collection
        Route::get('collection', [CustomGameController::class, 'collection'])->name('collection');
        Route::patch('collection/{item}', [CustomGameController::class, 'collectionUpdate'])->name('collection.update');
        Route::delete('collection/{item}', [CustomGameController::class, 'collectionDestroy'])->name('collection.destroy');
        Route::post('collection/delete-multiple', [CustomGameController::class, 'collectionDeleteMultiple'])->name('collection.delete-multiple');

        // Cards (Database)
        Route::get('cards', [CustomGameController::class, 'cards'])->name('cards');
    });
});

require __DIR__.'/settings.php';
