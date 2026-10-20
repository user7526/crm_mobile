// Dev frontend runs on :3002, prod on :8003 -- see
// project_memory/_shared/port_configuration.md. Both share AIW's existing
// backend (dev :5000, prod :5001), same pattern as tdw_email's config.js.
const getApiBaseUrl = () => {
  const port = window.location.port;
  if (port === '8003') {
    return `${window.location.protocol}//${window.location.hostname}:5001`;
  }
  return `${window.location.protocol}//${window.location.hostname}:5000`;
};

export const API_BASE_URL = getApiBaseUrl();
export const WS_BASE_URL = getApiBaseUrl().replace(/^http/, 'ws');

// AIW desktop's own origin -- used to build deep links (email compose,
// "Open in desktop CRM") that only make sense on the full desktop app.
// Dev desktop runs on :3000, prod on :8000.
export function getAiwDesktopOrigin() {
  const aiwPort = window.location.port === '8003' ? '8000' : '3000';
  return `${window.location.protocol}//${window.location.hostname}:${aiwPort}`;
}
