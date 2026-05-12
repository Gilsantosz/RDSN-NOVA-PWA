/**
 * RDSN SECURE VAULT — Credenciais internas
 * @version 2.2.0-secure
 *
 * REGRA: Nunca expor SUPABASE_SERVICE_ROLE_KEY aqui.
 * As credenciais Supabase vêm exclusivamente das variáveis de ambiente (import.meta.env).
 */

// Obfuscação simples para credencial de emergência local
const _dob = (s: string) => atob(s).split('').reverse().join('');

export interface VaultData {
  ADMIN_USER: string;
  ADMIN_HASH: string;
  INTERNAL_ROLES: string[];
  [key: string]: any;
}

// Credencial de emergência local (bypass offline)
// Não substitui o banco — é o último recurso quando Supabase está inacessível
const VAULT: VaultData = {
  ADMIN_USER: 'admin',
  ADMIN_HASH: 'MzIxbmltZGE=', // admin123 (obfuscado)
  INTERNAL_ROLES: ['admin', 'manager', 'pcp_manager'],
};

export const getSecret = (key: string): any => {
  if (key === 'ADMIN_PWD') return _dob(VAULT.ADMIN_HASH);
  return VAULT[key] ?? null;
};

/** Valida o administrador de emergência local (sem banco de dados) */
export const validateAdmin = (user: string, pwd: string): boolean => {
  return user === VAULT.ADMIN_USER && pwd === _dob(VAULT.ADMIN_HASH);
};
