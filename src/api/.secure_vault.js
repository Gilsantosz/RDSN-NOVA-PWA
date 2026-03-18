
/**
 * CLASSIFIED - RDSN SECURE VAULT
 * This file contains sensitive internal credentials.
 * @version 2.1.0-secure
 */

// Simple obfuscation for internal use
const _obs = (s) => btoa(s).split('').reverse().join('');
const _dob = (s) => atob(s.split('').reverse().join(''));

const VAULT = {
  // admin / admin123
  ADMIN_USER: 'admin',
  ADMIN_HASH: 'MTIzbmlkbWE=', // 'admin123' obfuscated
  
  // Internal access keys
  INTERNAL_ROLES: ['admin', 'manager', 'pcp_manager'],
};

export const getSecret = (key) => {
  if (key === 'ADMIN_PWD') return _dob(VAULT.ADMIN_HASH);
  return VAULT[key];
};

export const validateAdmin = (user, pwd) => {
  return user === VAULT.ADMIN_USER && pwd === _dob(VAULT.ADMIN_HASH);
};
