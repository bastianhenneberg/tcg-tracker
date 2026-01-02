<?php

use App\Http\Controllers\GameController;
use App\Http\Controllers\PlaysetRuleController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\TwoFactorAuthenticationController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('user-password.edit');

    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance.edit');

    Route::get('settings/two-factor', [TwoFactorAuthenticationController::class, 'show'])
        ->name('two-factor.show');

    // Playset Rules
    Route::get('settings/playset-rules', [PlaysetRuleController::class, 'index'])->name('playset-rules.index');
    Route::post('settings/playset-rules', [PlaysetRuleController::class, 'store'])->name('playset-rules.store');
    Route::patch('settings/playset-rules/{rule}', [PlaysetRuleController::class, 'update'])->name('playset-rules.update');
    Route::delete('settings/playset-rules/{rule}', [PlaysetRuleController::class, 'destroy'])->name('playset-rules.destroy');
    Route::post('settings/playset-rules/reset', [PlaysetRuleController::class, 'resetDefaults'])->name('playset-rules.reset');

    // Games
    Route::get('settings/games', [GameController::class, 'index'])->name('games.index');
    Route::post('settings/games', [GameController::class, 'store'])->name('games.store');
    Route::get('settings/games/{game}', [GameController::class, 'show'])->name('games.show');
    Route::patch('settings/games/{game}', [GameController::class, 'update'])->name('games.update');
    Route::delete('settings/games/{game}', [GameController::class, 'destroy'])->name('games.destroy');
    Route::post('settings/games/{game}/attributes', [GameController::class, 'storeAttribute'])->name('games.attributes.store');
    Route::delete('settings/games/{game}/attributes/{attribute}', [GameController::class, 'destroyAttribute'])->name('games.attributes.destroy');
    Route::post('settings/games/{game}/formats', [GameController::class, 'storeFormat'])->name('games.formats.store');
    Route::delete('settings/games/{game}/formats/{format}', [GameController::class, 'destroyFormat'])->name('games.formats.destroy');
});
