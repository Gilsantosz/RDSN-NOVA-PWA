
/**
 * CLASSIFIED - RDSN SECURE VAULT
 * This file contains sensitive internal credentials.
 * @version 2.1.0-secure
 */

// Simple obfuscation for internal use
const _dob = (s: string) => atob(s).split('').reverse().join('');

export interface VaultData {
  ADMIN_USER: string;
  ADMIN_HASH: string;
  INTERNAL_ROLES: string[];
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  [key: string]: any;
}

const VAULT: VaultData = {
  // admin / admin123
  ADMIN_USER: 'admin',
  ADMIN_HASH: 'MzIxbmltZGE=', // 'admin123' obfuscated
  
  // Internal access keys
  INTERNAL_ROLES: ['admin', 'manager', 'pcp_manager'],
  
  // Supabase Credentials (Cloud Production)
  VITE_SUPABASE_URL: 'https://saczzyiofmlvygsopfws.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhY3p6eWlvZm1sdnlnc29wZndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDA0MzIsImV4cCI6MjA4ODIxNjQzMn0.Uv-HzvaHDbskLxcOaoHtzVq-QWcmDl6x9FUTe3VFiNQ',
};

export const getSecret = (key: string): any => {
  if (key === 'ADMIN_PWD') return _dob(VAULT.ADMIN_HASH);
  return VAULT[key];
};

export const validateAdmin = (user: string, pwd: string): boolean => {
  return user === VAULT.ADMIN_USER && pwd === _dob(VAULT.ADMIN_HASH);
};
