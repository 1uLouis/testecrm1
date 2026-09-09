-- ============================================================
-- Migração: Adiciona taxas de pagamento na tabela settings
-- Execute no painel do Supabase > SQL Editor
-- ============================================================

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS taxa_cartao NUMERIC(5,2) NOT NULL DEFAULT 3.50,
  ADD COLUMN IF NOT EXISTS taxa_boleto NUMERIC(5,2) NOT NULL DEFAULT 1.95,
  ADD COLUMN IF NOT EXISTS taxa_pix    NUMERIC(5,2) NOT NULL DEFAULT 0.99;
