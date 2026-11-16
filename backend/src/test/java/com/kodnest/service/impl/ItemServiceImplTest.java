package com.kodnest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kodnest.dto.ItemRequest;
import com.kodnest.dto.ItemResponse;
import com.kodnest.exception.ItemAlreadyExistsException;
import com.kodnest.model.Item;
import com.kodnest.model.StockMovement;
import com.kodnest.repository.ItemRepository;
import com.kodnest.repository.StockMovementRepository;
import java.util.Optional;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ItemServiceImplTest {

    @Mock
    private ItemRepository itemRepository;

    @Mock
    private StockMovementRepository stockMovementRepository;

    private ItemServiceImpl itemService;

    @BeforeEach
    void setUp() {
        itemService = new ItemServiceImpl(itemRepository, stockMovementRepository);
    }

    @Test
    void addThrowsMeaningfulErrorWhenNameAlreadyExists() {
        when(itemRepository.existsByNameIgnoreCase("Coffee")).thenReturn(true);

        ItemAlreadyExistsException exception = assertThrows(
                ItemAlreadyExistsException.class,
                () -> itemService.add(new ItemRequest(" Coffee ", "Ground coffee"))
        );

        assertEquals(
                "A product named 'Coffee' already exists. Please choose a different name.",
                exception.getMessage()
        );
        verify(itemRepository, never()).save(any(Item.class));
    }

    @Test
    void addTrimsNameBeforeCheckingAndSaving() {
        when(itemRepository.existsByNameIgnoreCase("Coffee")).thenReturn(false);
        when(itemRepository.save(any(Item.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ItemResponse response = itemService.add(new ItemRequest(" Coffee ", "Ground coffee"));

        assertEquals("Coffee", response.name());
        assertEquals("Ground coffee", response.description());
        verify(itemRepository).existsByNameIgnoreCase("Coffee");
    }

    @Test
    void addIncludesReorderLevelInSavedProduct() {
        when(itemRepository.existsByNameIgnoreCase("Tea")).thenReturn(false);
        when(itemRepository.save(any(Item.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ItemResponse response = itemService.add(new ItemRequest("Tea", "Loose leaf", 8, 3));

        assertEquals(8, response.quantity());
        assertEquals(3, response.reorderLevel());
    }

    @Test
    void stockAdjustmentRecordsMovementWithReason() {
        Item item = new Item("Coffee", "Ground coffee", 5, 2);
        when(itemRepository.findById(1L)).thenReturn(Optional.of(item));
        when(itemRepository.save(item)).thenReturn(item);

        ItemResponse response = itemService.updateQuantity(1L, 8, "New delivery");

        ArgumentCaptor<StockMovement> movement = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(movement.capture());
        assertEquals(8, response.quantity());
        assertEquals(3, movement.getValue().getQuantityChange());
        assertEquals("New delivery", movement.getValue().getReason());
    }
}
