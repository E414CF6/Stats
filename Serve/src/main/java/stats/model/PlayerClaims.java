package stats.model;

import java.util.List;

public record PlayerClaims(long accruedBlocks, long bonusBlocks, long totalAvailableBlocks, long usedBlocks,
                           long remainingBlocks, int claimCount, List<ClaimItem> items) {
}
