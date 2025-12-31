<?php

namespace App\Policies\Fab;

use App\Models\Fab\FabInventory;
use App\Models\User;

class FabInventoryPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, FabInventory $item): bool
    {
        return $user->id === $item->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, FabInventory $item): bool
    {
        return $user->id === $item->user_id;
    }

    public function delete(User $user, FabInventory $item): bool
    {
        return $user->id === $item->user_id;
    }
}
