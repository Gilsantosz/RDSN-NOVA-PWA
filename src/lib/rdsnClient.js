import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_RDSN_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_RDSN_SUPABASE_ANON_KEY;

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

// Cliente administrativo (USAR APENAS SE ABSOLUTAMENTE NECESSÁRIO NO SERVER-SIDE MOCK)
// No frontend, use sempre as API routes ou Edge Functions para operações sensíveis
export const rdsnAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  import.meta.env.VITE_RDSN_SERVICE_ROLE_KEY || 'placeholder'
);
