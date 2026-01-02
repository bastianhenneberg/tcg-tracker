<?php

namespace App\Policies;

use App\Models\Op\OpCollection;
use App\Models\User;

class OpCollectionPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, OpCollection $opCollection): bool
    {
        return $user->id === $opCollection->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, OpCollection $opCollection): bool
    {
        return $user->id === $opCollection->user_id;
    }

    public function delete(User $user, OpCollection $opCollection): bool
    {
        return $user->id === $opCollection->user_id;
    }
}
