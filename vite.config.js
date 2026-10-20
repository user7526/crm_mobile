import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

// Dev-only HTTPS using the same mkcert-issued, already-trusted cert AIW /
// AI Assistant / tdw_email dev use (see tdw_email/vite.config.js for the
// precedent this is copied from). Needed so PWA service-worker registration
// works when testing from a phone over Tailscale/LAN (insecure origins
// refuse to register a service worker). Falls back to plain HTTP if the
// certs aren't present, e.g. a fresh clone on a machine without them.
const CERT_FILE = 'C:/ai-warehouse-system/certs/10.10.100.25+3.pem';
const KEY_FILE = 'C:/ai-warehouse-system/certs/10.10.100.25+3-key.pem';
const httpsConfig = fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)
  ? { cert: fs.readFileSync(CERT_FILE), key: fs.readFileSync(KEY_FILE) }
  : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3002,
    https: httpsConfig,
  },
});
