/**
 * Qorvum Configuration Store
 * Handles persistence of gateway settings and authentication state to localStorage.
 */

export interface QorvumConfig {
  baseUrl: string;
  token: string | null;
  tokenExpiry: number | null; // Unix timestamp in seconds
  username: string | null;
  org: string | null;
  roles: string[];
}

const DEFAULT_BASE_URL = 'http://localhost:8080';
const STORAGE_KEYS = {
  BASE_URL: 'qorvum_base_url',
  TOKEN: 'qorvum_token',
  TOKEN_EXPIRY: 'qorvum_token_expiry',
  USERNAME: 'qorvum_username',
  ORG: 'qorvum_org',
  ROLES: 'qorvum_roles',
};

export function getConfig(): QorvumConfig {
  if (typeof window === 'undefined') {
    return {
      baseUrl: DEFAULT_BASE_URL,
      token: null,
      tokenExpiry: null,
      username: null,
      org: null,
      roles: [],
    };
  }

  let roles = [];
  try {
    roles = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROLES) || '[]');
  } catch (e) {
    console.error('Failed to parse roles from localStorage', e);
  }

  return {
    baseUrl: localStorage.getItem(STORAGE_KEYS.BASE_URL) || DEFAULT_BASE_URL,
    token: localStorage.getItem(STORAGE_KEYS.TOKEN),
    tokenExpiry: localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY) ? Number(localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY)) : null,
    username: localStorage.getItem(STORAGE_KEYS.USERNAME),
    org: localStorage.getItem(STORAGE_KEYS.ORG),
    roles,
  };
}

export function setConfig(partial: Partial<QorvumConfig>): void {
  if (typeof window === 'undefined') return;

  if (partial.baseUrl !== undefined) localStorage.setItem(STORAGE_KEYS.BASE_URL, partial.baseUrl);
  if (partial.token !== undefined) {
    if (partial.token) localStorage.setItem(STORAGE_KEYS.TOKEN, partial.token);
    else localStorage.removeItem(STORAGE_KEYS.TOKEN);
  }
  if (partial.tokenExpiry !== undefined) {
    if (partial.tokenExpiry) localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, partial.tokenExpiry.toString());
    else localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  }
  if (partial.username !== undefined) {
    if (partial.username) localStorage.setItem(STORAGE_KEYS.USERNAME, partial.username);
    else localStorage.removeItem(STORAGE_KEYS.USERNAME);
  }
  if (partial.org !== undefined) {
    if (partial.org) localStorage.setItem(STORAGE_KEYS.ORG, partial.org);
    else localStorage.removeItem(STORAGE_KEYS.ORG);
  }
  if (partial.roles !== undefined) {
    localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(partial.roles));
  }
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  localStorage.removeItem(STORAGE_KEYS.USERNAME);
  localStorage.removeItem(STORAGE_KEYS.ORG);
  localStorage.removeItem(STORAGE_KEYS.ROLES);
}

export function isAuthenticated(): boolean {
  const config = getConfig();
  if (!config.token) return false;
  
  // Check expiry
  if (config.tokenExpiry && config.tokenExpiry < Math.floor(Date.now() / 1000)) {
    return false;
  }
  
  return true;
}

export function getAuthHeader(): string | null {
  const config = getConfig();
  if (!config.token) return null;
  return `Bearer ${config.token}`;
}
