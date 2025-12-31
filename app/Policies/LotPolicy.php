<?php

namespace App\Policies;

use App\Models\Lot;
use App\Models\User;

class LotPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Lot $lot): bool
    {
        return $user->id === $lot->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Lot $lot): bool
    {
        return $user->id === $lot->user_id;
    }

    public function delete(User $user, Lot $lot): bool
    {
        return $user->id === $lot->user_id;
    }
}
