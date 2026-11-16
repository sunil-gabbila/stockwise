package com.kodnest.controller;

import com.kodnest.dto.DashboardResponse;
import com.kodnest.service.ItemService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final ItemService itemService;

    public DashboardController(ItemService itemService) {
        this.itemService = itemService;
    }

    @GetMapping
    public DashboardResponse getDashboard() {
        return itemService.getDashboard();
    }
}
