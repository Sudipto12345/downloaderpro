-- Migration: add parentId to menu_items for dropdown/submenu support
-- Run this when the database is available

ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- Add foreign key for self-referential relationship (set null on delete)
ALTER TABLE "menu_items"
  ADD CONSTRAINT "menu_items_parentId_fkey"
  FOREIGN KEY ("parentId")
  REFERENCES "menu_items"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Index for efficient parent lookups
CREATE INDEX IF NOT EXISTS "menu_items_parentId_idx" ON "menu_items"("parentId");
