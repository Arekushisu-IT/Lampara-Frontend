// ============================================================
// CONFIG - Centralized Configuration & Constants
// ============================================================

const ACCOUNTS = {};

// Production backend is down, using local for now
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const API_CONFIG = {
  baseUrl: 'http://localhost:8080/api',
};

const ROLE_META = {
  admin: { lbl: '⚜ ADMIN', cls: 'rp-admin' }
};

const PANEL_TITLES = {
  db: 'DASHBOARD OVERVIEW',
  pl: 'PLAYER MANAGEMENT',
  vr: 'VERIFICATION & APPROVAL',
  qt: 'QUEST MANAGEMENT',
  gs: 'GAME SETTINGS',
  lb: 'PLAYER LEADERBOARD',
  lg: 'ACTIVITY LOGS'
};

const LOG_PILLS = {
  'LOGIN': 'pa',
  'LOGOUT': 'pst',
  'APPROVED': 'pa',
  'REJECTED': 'ps',
  'SUSPENDED': 'ps',
  'REINSTATED': 'pa',
  'ADDED ADMIN': 'pp',
  'EDITED ADMIN': 'pp',
  'REMOVED ADMIN': 'ps'
};

const TOAST_ICONS = { success: '⚜', error: '✕', info: '◈' };
