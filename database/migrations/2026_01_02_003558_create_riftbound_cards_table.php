<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('riftbound_cards', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->nullable()->unique();
            $table->string('name');
            $table->json('types')->nullable();
            $table->json('domains')->nullable();
            $table->integer('energy')->nullable();
            $table->integer('power')->nullable();
            $table->text('functional_text')->nullable();
            $table->json('illustrators')->nullable();
            $table->timestamps();

            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('riftbound_cards');
    }
};
