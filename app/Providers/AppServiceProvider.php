<?php

namespace App\Providers;

use App\Models\Fab\FabCollection;
use App\Models\Fab\FabInventory;
use App\Policies\Fab\FabCollectionPolicy;
use App\Policies\Fab\FabInventoryPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(FabInventory::class, FabInventoryPolicy::class);
        Gate::policy(FabCollection::class, FabCollectionPolicy::class);
    }
}
