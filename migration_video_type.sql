-- Migração: adiciona coluna "type" à tabela videos
-- Execute este SQL no Supabase → SQL Editor

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'video';

-- Opcional: adiciona uma constraint para garantir valores válidos
ALTER TABLE videos
  ADD CONSTRAINT videos_type_check CHECK (type IN ('video', 'pdf'));
