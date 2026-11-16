package com.kodnest.service;

import com.kodnest.dto.ItemRequest;
import com.kodnest.dto.ItemResponse;
import com.kodnest.dto.DashboardResponse;
import com.kodnest.dto.StockMovementResponse;
import java.util.List;

public interface ItemService {

    ItemResponse add(ItemRequest request);

    List<ItemResponse> findAll();

    ItemResponse updateQuantity(Long id, int quantity);

    ItemResponse updateQuantity(Long id, int quantity, String reason);

    DashboardResponse getDashboard();

    List<StockMovementResponse> findMovements(Long id);
}
