-- Migração: adicionar coluna prefixo_lote na tabela PCPCliente
-- Valores possíveis: NULL (sem prefixo), 'L' (Lote padrão), 'LM' (Lote múltiplo)
-- Executar no Supabase SQL Editor

ALTER TABLE "PCPCliente"
ADD COLUMN IF NOT EXISTS prefixo_lote TEXT DEFAULT NULL;

COMMENT ON COLUMN "PCPCliente".prefixo_lote IS
  'Prefixo de lote do cliente. Ex: L = Lote padrão, LM = Lote múltiplo. Auto-preenchido no formulário de reserva.';
