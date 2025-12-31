<?php

namespace App\Policies;

use App\Models\InventoryCard;
use App\Models\User;

class InventoryCardPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, InventoryCard $inventoryCard): bool
    {
        return $user->id === $inventoryCard->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, InventoryCard $inventoryCard): bool
    {
        return $user->id === $inventoryCard->user_id;
    }

    public function delete(User $user, InventoryCard $inventoryCard): bool
    {
        return $user->id === $inventoryCard->user_id;
    }
}
