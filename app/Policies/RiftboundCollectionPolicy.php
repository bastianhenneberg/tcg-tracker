<?php

namespace App\Policies;

use App\Models\Riftbound\RiftboundCollection;
use App\Models\User;

class RiftboundCollectionPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, RiftboundCollection $riftboundCollection): bool
    {
        return $user->id === $riftboundCollection->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, RiftboundCollection $riftboundCollection): bool
    {
        return $user->id === $riftboundCollection->user_id;
    }

    public function delete(User $user, RiftboundCollection $riftboundCollection): bool
    {
        return $user->id === $riftboundCollection->user_id;
    }
}
