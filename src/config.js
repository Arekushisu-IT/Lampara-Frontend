// ============================================================
// CONFIG - Centralized Configuration & Constants
// ============================================================

const ACCOUNTS = {};

const API_CONFIG = {
  baseUrl: 'https://lampara-production.up.railway.app/api',
};

const ROLE_META = {
  admin: { lbl: '⚜ ADMIN', cls: 'rp-admin' }
};

const PANEL_TITLES = {
  db:  'DASHBOARD OVERVIEW',
  pl:  'PLAYER MANAGEMENT',
  vr:  'VERIFICATION & APPROVAL',
  qt:  'QUEST MANAGEMENT',
  lg:  'ACTIVITY LOGS'
};

const LOG_PILLS = {
  'LOGIN':          'pa',
  'LOGOUT':         'pst',
  'APPROVED':       'pa',
  'REJECTED':       'ps',
  'SUSPENDED':      'ps',
  'REINSTATED':     'pa',
  'ADDED ADMIN':    'pp',
  'EDITED ADMIN':   'pp',
  'REMOVED ADMIN':  'ps'
};

const TOAST_ICONS = { success: '⚜', error: '✕', info: '◈' };
