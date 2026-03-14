-- Migration 071: Menu data migration — executed live on 2026-03-14
-- This file documents the SQL that was run directly on the production DB.
-- DO NOT re-run — data already exists.

-- 1. Deleted 30 fake/invented cocktails from Classic Cocktails category
-- DELETE FROM menu_items WHERE id IN ('d0000001-...') AND category_id = 'c0000001-0000-0000-0000-000000000007';

-- 2. Inserted 9 Liqueurs (cat 14) — all at €8.50
-- Amaretto, Tia Maria, Licor 34, Limoncello, Baileys, Grand Marnier, Kahlúa, Hierbas, Hennessy Cognac

-- 3. Inserted 13 Longdrinks (cat 15) — €7.00-€18.00
-- Gin: Gordons, Roku, GVine, Brockmans, Hendricks
-- Vodka: Smirnoff, Belvedere, Belvedere Bartezek, Ciroc
-- Whiskey: Glen Grant, Dewars Caribbean, Jameson, Jack Daniels Honey

-- 4. Inserted 7 Towers (cat 17) — €25.00-€120.00
-- Beer 3L/5L, Mix 3L/5L, Cocktail 3L/5L, Red Bull Round

-- 5. Inserted 21 Table Bottles (cat 16) — €80.00-€160.00
-- Belvedere, Ciroc, Bacardi variants, Malibu, Safari, Smirnoff, Gordons, etc.

-- 6. Inserted 4 Cold Coffees into Coffees (cat 13)
-- Freddo Espresso, Freddo Cappuccino, Caribbean Espresso, Espresso Tonic

-- 7. Inserted 4 Sangrias into Spritz & Sangria (cat 9) WITH sizes JSONB
-- Red, White, Sonnema, Strawberry — each with glass/pitcher pricing

-- Final state: 166 items across 17 categories
