-- Migration: Drop Favorites and Inquiries tables
-- Run this against existing database to remove dedicated feature tables

DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS inquiries;
