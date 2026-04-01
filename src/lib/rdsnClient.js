import { createClient } from '@supabase/supabase-js';
import { getEnvConfig } from '../utils/hybridContext';

const { supabaseUrl, supabaseAnonKey } = getEnvConfig();

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('Ambiente local detectado - usando mocks ou aguardando configuração');
}

export const rdsn = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// Helper para chamadas de função RDSN
rdsn.run = async (functionName, payload = {}) => {
  const { data, error } = await rdsn.functions.invoke(functionName, {
    body: payload,
  });
  if (error) throw error;
  return data;
};

// NOTA: rdsnAdmin foi removido por razões de segurança (Lei 01: Isolamento Smith).
// Toda operação administrativa deve ser feita via Edge Functions.
