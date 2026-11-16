package com.kodnest.service.impl;

import com.kodnest.dto.ItemRequest;
import com.kodnest.dto.ItemResponse;
import com.kodnest.dto.DashboardResponse;
import com.kodnest.dto.StockMovementResponse;
import com.kodnest.exception.ItemAlreadyExistsException;
import com.kodnest.model.Item;
import com.kodnest.model.StockMovement;
import com.kodnest.repository.ItemRepository;
import com.kodnest.repository.StockMovementRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import com.kodnest.service.ItemService;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class ItemServiceImpl implements ItemService {

    private final ItemRepository itemRepository;
    private final StockMovementRepository stockMovementRepository;

    public ItemServiceImpl(ItemRepository itemRepository, StockMovementRepository stockMovementRepository) {
        this.itemRepository = itemRepository;
        this.stockMovementRepository = stockMovementRepository;
    }

    @Override
    public ItemResponse add(ItemRequest request) {
        String name = request.name().trim();
        if (itemRepository.existsByNameIgnoreCase(name)) {
            throw new ItemAlreadyExistsException(
                    "A product named '" + name + "' already exists. Please choose a different name.");
        }

        Item savedItem = itemRepository.save(
                new Item(name, request.description(), request.quantity(), request.reorderLevel()));
        return toResponse(savedItem);
    }

    @Override
    public List<ItemResponse> findAll() {
        return itemRepository.findAll(Sort.by(Sort.Direction.ASC, "name"))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public ItemResponse updateQuantity(Long id, int quantity) {
        return updateQuantity(id, quantity, null);
    }

    @Override
    public ItemResponse updateQuantity(Long id, int quantity, String reason) {
        Item item = itemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found."));
        int quantityChange = quantity - item.getQuantity();
        item.setQuantity(quantity);
        Item savedItem = itemRepository.save(item);
        if (quantityChange != 0) {
            String movementReason = reason == null || reason.isBlank() ? "Manual adjustment" : reason.trim();
            stockMovementRepository.save(new StockMovement(savedItem, quantityChange, movementReason));
        }
        return toResponse(savedItem);
    }

    @Override
    public DashboardResponse getDashboard() {
        List<ItemResponse> items = findAll();
        List<ItemResponse> lowStockItems = items.stream()
                .filter(item -> item.quantity() <= item.reorderLevel())
                .toList();
        Instant startOfToday = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant();
        return new DashboardResponse(
                items.size(),
                lowStockItems.size(),
                stockMovementRepository.countByCreatedAtGreaterThanEqual(startOfToday),
                lowStockItems,
                stockMovementRepository.findTop10ByOrderByCreatedAtDesc().stream().map(this::toMovementResponse).toList());
    }

    @Override
    public List<StockMovementResponse> findMovements(Long id) {
        if (!itemRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found.");
        }
        return stockMovementRepository.findByItemIdOrderByCreatedAtDesc(id).stream()
                .map(this::toMovementResponse)
                .toList();
    }

    private ItemResponse toResponse(Item item) {
        return new ItemResponse(item.getId(), item.getName(), item.getDescription(), item.getQuantity(), item.getReorderLevel());
    }

    private StockMovementResponse toMovementResponse(StockMovement movement) {
        return new StockMovementResponse(
                movement.getId(), movement.getItem().getId(), movement.getItem().getName(),
                movement.getQuantityChange(), movement.getReason(), movement.getCreatedAt());
    }
}
