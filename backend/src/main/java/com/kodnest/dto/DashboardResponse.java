package com.kodnest.dto;

import java.util.List;

public record DashboardResponse(
        long productCount,
        long lowStockCount,
        long movementsToday,
        List<ItemResponse> lowStockItems,
        List<StockMovementResponse> recentMovements
) {
}
