<?php

use App\Http\Controllers\BinderController;
use App\Http\Controllers\BinderPageController;
use App\Http\Controllers\BoxController;
use App\Http\Controllers\CustomCardController;
use App\Http\Controllers\DataMappingController;
use App\Http\Controllers\DeckController;
use App\Http\Controllers\DeckInventoryController;
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

    // Binders (Collection Organization)
    Route::get('binders', [BinderController::class, 'index'])->name('binders.index');
    Route::post('binders', [BinderController::class, 'store'])->name('binders.store');
    Route::get('binders/{binder}', [BinderController::class, 'show'])->name('binders.show');
    Route::patch('binders/{binder}', [BinderController::class, 'update'])->name('binders.update');
    Route::delete('binders/{binder}', [BinderController::class, 'destroy'])->name('binders.destroy');
    Route::post('binders/{binder}/pages', [BinderController::class, 'addPage'])->name('binders.add-page');

    // Binder Pages
    Route::get('binder-pages/{binderPage}', [BinderPageController::class, 'show'])->name('binder-pages.show');
    Route::patch('binder-pages/{binderPage}', [BinderPageController::class, 'update'])->name('binder-pages.update');
    Route::delete('binder-pages/{binderPage}', [BinderPageController::class, 'destroy'])->name('binder-pages.destroy');
    Route::post('binder-pages/{binderPage}/assign', [BinderPageController::class, 'assignCard'])->name('binder-pages.assign');
    Route::post('binder-pages/{binderPage}/remove', [BinderPageController::class, 'removeCard'])->name('binder-pages.remove');
    Route::post('binder-pages/{binderPage}/move', [BinderPageController::class, 'moveCard'])->name('binder-pages.move');
    Route::post('binder-pages/{binderPage}/move-to-slot', [BinderPageController::class, 'moveCardToSlot'])->name('binder-pages.move-to-slot');
    Route::post('binder-pages/{binderPage}/reorder-stack', [BinderPageController::class, 'reorderStack'])->name('binder-pages.reorder-stack');
    Route::get('binder-pages/{binderPage}/available-cards', [BinderPageController::class, 'availableCards'])->name('binder-pages.available-cards');

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
        Route::post('inventory/change-lot', [UnifiedInventoryController::class, 'changeLot'])->name('inventory.change-lot');
        Route::post('inventory/delete-multiple', [UnifiedInventoryController::class, 'destroyMultiple'])->name('inventory.delete-multiple');
        Route::get('inventory/export', [UnifiedInventoryController::class, 'export'])->name('inventory.export');

        // Collection
        Route::get('collection', [UnifiedCollectionController::class, 'index'])->name('collection');
        Route::patch('collection/{item}', [UnifiedCollectionController::class, 'update'])->name('collection.update');
        Route::delete('collection/{item}', [UnifiedCollectionController::class, 'destroy'])->name('collection.destroy');
        Route::post('collection/delete-multiple', [UnifiedCollectionController::class, 'destroyMultiple'])->name('collection.delete-multiple');
        Route::post('collection/move-to-inventory', [UnifiedCollectionController::class, 'moveToInventory'])->name('collection.move-to-inventory');
    });

    // Decks & Deckbuilder
    Route::prefix('g/{slug}')->group(function () {
        Route::get('decks', [DeckController::class, 'index'])->name('decks.index');
        Route::get('decks/create', [DeckController::class, 'create'])->name('decks.create');
        Route::post('decks', [DeckController::class, 'store'])->name('decks.store');
        Route::get('decks/{deck}', [DeckController::class, 'show'])->name('decks.show');
        Route::get('decks/{deck}/edit', [DeckController::class, 'edit'])->name('decks.edit');
        Route::patch('decks/{deck}', [DeckController::class, 'update'])->name('decks.update');
        Route::delete('decks/{deck}', [DeckController::class, 'destroy'])->name('decks.destroy');

        // Builder
        Route::get('decks/{deck}/builder', [DeckController::class, 'builder'])->name('decks.builder');
        Route::post('decks/{deck}/cards', [DeckController::class, 'addCard'])->name('decks.add-card');
        Route::patch('decks/{deck}/cards/reorder', [DeckController::class, 'reorderCards'])->name('decks.reorder-cards');
        Route::delete('decks/{deck}/cards/{card}', [DeckController::class, 'removeCard'])->name('decks.remove-card');
        Route::patch('decks/{deck}/cards/{card}/move', [DeckController::class, 'moveCard'])->name('decks.move-card');
        Route::patch('decks/{deck}/cards/{card}/quantity', [DeckController::class, 'updateQuantity'])->name('decks.update-quantity');
        Route::get('decks/{deck}/validate', [DeckController::class, 'validate'])->name('decks.validate');
        Route::get('decks/{deck}/search', [DeckController::class, 'searchCards'])->name('decks.search');
        Route::get('decks/{deck}/export/{format?}', [DeckController::class, 'export'])->name('decks.export');

        // Deck Inventory Assignments (mark as "in deck")
        Route::post('decks/{deck}/mark-in-deck', [DeckInventoryController::class, 'markInDeck'])->name('decks.mark-in-deck');
        Route::delete('decks/{deck}/mark-in-deck', [DeckInventoryController::class, 'clearMarkings'])->name('decks.clear-markings');
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
