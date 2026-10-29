import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { fetchMe, logout as apiLogout, getAiwLoginUrl, tryRefresh } from './api/auth';
import AppShell from './AppShell';
import { MessagingProvider } from './contexts/MessagingContext';

const theme = createTheme({
  palette: { mode: 'light', background: { default: '#ffffff', paper: '#f6f8f7' }, primary: { main: '#0f766e' } },
});

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// No standalone /login route here -- this app has no identity of its own,
// same as tdw_email. If there's no valid AIW session cookie, bounce to
// AIW's own login page instead of rendering one here.
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const refreshed = await tryRefresh();
      if (!refreshed) {
        window.location.href = getAiwLoginUrl();
        return;
      }
      try {
        const u = await fetchMe();
        setUser(u);
        setReady(true);
      } catch {
        window.location.href = getAiwLoginUrl();
      }
    })();
  }, []);

  const logout = useCallback(() => { apiLogout(); }, []);

  if (!ready) return null;
  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <MessagingProvider>
            <Routes>
              <Route path="/*" element={<AppShell />} />
            </Routes>
          </MessagingProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
