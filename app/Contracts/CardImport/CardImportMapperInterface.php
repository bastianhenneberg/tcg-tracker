<?php

namespace App\Contracts\CardImport;

use App\Models\UnifiedCard;
use App\Models\UnifiedPrinting;
use App\Models\UnifiedSet;

interface CardImportMapperInterface
{
    /**
     * Get the game slug this mapper handles.
     */
    public function getGameSlug(): string;

    /**
     * Map external set data to UnifiedSet attributes.
     *
     * @param  array<string, mixed>  $externalData  Raw data from external source
     * @return array<string, mixed> Attributes for UnifiedSet model
     */
    public function mapSet(array $externalData): array;

    /**
     * Map external card data to UnifiedCard attributes.
     *
     * @param  array<string, mixed>  $externalData  Raw data from external source
     * @return array<string, mixed> Attributes for UnifiedCard model
     */
    public function mapCard(array $externalData): array;

    /**
     * Map external printing data to UnifiedPrinting attributes.
     *
     * @param  array<string, mixed>  $externalData  Raw data from external source
     * @param  UnifiedCard  $card  The parent card
     * @param  UnifiedSet|null  $set  The set (if available)
     * @return array<string, mixed> Attributes for UnifiedPrinting model
     */
    public function mapPrinting(array $externalData, UnifiedCard $card, ?UnifiedSet $set = null): array;

    /**
     * Extract unique card identifier from external data.
     * Used to find existing cards and avoid duplicates.
     */
    public function extractCardIdentifier(array $externalData): string;

    /**
     * Extract unique printing identifier from external data.
     * Used to find existing printings and avoid duplicates.
     */
    public function extractPrintingIdentifier(array $externalData): string;

    /**
     * Check if external data represents a valid card.
     */
    public function isValidCard(array $externalData): bool;

    /**
     * Get supported file extensions for import.
     *
     * @return array<string>
     */
    public function getSupportedExtensions(): array;
}
