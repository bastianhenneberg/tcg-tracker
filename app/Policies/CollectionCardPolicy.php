<?php

namespace App\Policies;

use App\Models\CollectionCard;
use App\Models\User;

class CollectionCardPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, CollectionCard $collectionCard): bool
    {
        return $user->id === $collectionCard->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, CollectionCard $collectionCard): bool
    {
        return $user->id === $collectionCard->user_id;
    }

    public function delete(User $user, CollectionCard $collectionCard): bool
    {
        return $user->id === $collectionCard->user_id;
    }
}
