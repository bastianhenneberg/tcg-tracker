<?php

namespace App\Policies;

use App\Models\Riftbound\RiftboundInventory;
use App\Models\User;

class RiftboundInventoryPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, RiftboundInventory $riftboundInventory): bool
    {
        return $user->id === $riftboundInventory->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, RiftboundInventory $riftboundInventory): bool
    {
        return $user->id === $riftboundInventory->user_id;
    }

    public function delete(User $user, RiftboundInventory $riftboundInventory): bool
    {
        return $user->id === $riftboundInventory->user_id;
    }
}
