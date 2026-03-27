<?php

namespace App\Policies;

use App\Models\Binder;
use App\Models\User;

class BinderPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Binder $binder): bool
    {
        return $user->id === $binder->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Binder $binder): bool
    {
        return $user->id === $binder->user_id;
    }

    public function delete(User $user, Binder $binder): bool
    {
        return $user->id === $binder->user_id;
    }
}
