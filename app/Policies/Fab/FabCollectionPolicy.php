<?php

namespace App\Policies\Fab;

use App\Models\Fab\FabCollection;
use App\Models\User;

class FabCollectionPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, FabCollection $item): bool
    {
        return $user->id === $item->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, FabCollection $item): bool
    {
        return $user->id === $item->user_id;
    }

    public function delete(User $user, FabCollection $item): bool
    {
        return $user->id === $item->user_id;
    }
}
