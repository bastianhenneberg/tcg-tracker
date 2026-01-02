<?php

namespace App\Policies;

use App\Models\Op\OpInventory;
use App\Models\User;

class OpInventoryPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, OpInventory $opInventory): bool
    {
        return $user->id === $opInventory->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, OpInventory $opInventory): bool
    {
        return $user->id === $opInventory->user_id;
    }

    public function delete(User $user, OpInventory $opInventory): bool
    {
        return $user->id === $opInventory->user_id;
    }
}
