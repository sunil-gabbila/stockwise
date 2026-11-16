package com.kodnest.repository;

import com.kodnest.model.StockMovement;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    @EntityGraph(attributePaths = "item")
    List<StockMovement> findTop10ByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = "item")
    List<StockMovement> findByItemIdOrderByCreatedAtDesc(Long itemId);

    long countByCreatedAtGreaterThanEqual(Instant startOfDay);
}
