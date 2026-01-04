<?php

namespace App\Contracts\CardImport;

use App\Models\UnifiedCard;
use App\Models\UnifiedPrinting;
use App\Models\UnifiedSet;

interface CardExportMapperInterface
{
    /**
     * Get the game slug this mapper handles.
     */
    public function getGameSlug(): string;

    /**
     * Export UnifiedSet to game-specific format.
     *
     * @return array<string, mixed>
     */
    public function exportSet(UnifiedSet $set): array;

    /**
     * Export UnifiedCard to game-specific format.
     *
     * @return array<string, mixed>
     */
    public function exportCard(UnifiedCard $card): array;

    /**
     * Export UnifiedPrinting to game-specific format.
     *
     * @return array<string, mixed>
     */
    public function exportPrinting(UnifiedPrinting $printing): array;

    /**
     * Get supported export formats.
     *
     * @return array<string>
     */
    public function getSupportedFormats(): array;
}
