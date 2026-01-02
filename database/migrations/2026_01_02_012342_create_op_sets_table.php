<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('op_sets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->nullable()->constrained()->nullOnDelete();
            $table->string('external_id')->unique(); // z.B. "OP01", "ST01"
            $table->string('name');
            $table->string('type')->nullable(); // "booster", "starter", "promo"
            $table->date('released_at')->nullable();
            $table->timestamps();

            $table->index('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('op_sets');
    }
};
