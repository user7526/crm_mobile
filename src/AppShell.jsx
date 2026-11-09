import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, IconButton, Paper, Badge } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import ForumIcon from '@mui/icons-material/Forum';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAuth } from './App';
import { colors as c } from './theme';
import { useMessaging } from './contexts/MessagingContext';
import { useFontSize } from './contexts/FontSizeContext';
import Parties from './pages/Parties';
import PartyDetail from './pages/PartyDetail';
import Contacts from './pages/Contacts';
import Tasks from './pages/Tasks';
import Import from './pages/Import';
import BakkenWatch from './pages/BakkenWatch';
import ChatList from './pages/ChatList';
import ChatThread from './pages/ChatThread';
import Settings from './pages/Settings';

const TABS = [
  { path: '/', label: 'Parties', icon: <BusinessIcon /> },
  { path: '/contacts', label: 'Contacts', icon: <PeopleAltIcon /> },
  { path: '/tasks', label: 'Tasks', icon: <AssignmentIcon /> },
  { path: '/chat', label: 'Chat', icon: <ForumIcon /> },
  { path: '/bakken-watch', label: 'Bakken Watch', icon: <TravelExploreIcon /> },
  { path: '/import', label: 'Import', icon: <UploadFileIcon /> },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { totalUnread } = useMessaging();
  const { fsPx } = useFontSize();

  // Bottom nav highlights by top-level path; party detail (/parties/:id)
  // still highlights the Parties tab since it's a drill-down from there.
  const activeTabPath = TABS.find((t) => (t.path === '/' ? location.pathname === '/' || location.pathname.startsWith('/parties') : location.pathname.startsWith(t.path)))?.path;

  // Two fixed rows instead of one single row (task #442, 2026-11-04):
  // mirrors ai_assistant's mobile nav (frontend/src/mobile/MobileLayout.js)
  // -- splits the tab list evenly, row 1 filling left-to-right first then
  // row 2, so reading order still matches TABS' own order.
  const navRowSplit = Math.ceil(TABS.length / 2);
  const navRows = [TABS.slice(0, navRowSplit), TABS.slice(navRowSplit)];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', bgcolor: c.bg }}>
      <AppBar position="static" elevation={0} sx={{
        bgcolor: import.meta.env.MODE !== 'production' ? '#ff9800' : c.surface,
        borderBottom: `1px solid ${c.border}`,
      }}>
        <Toolbar variant="dense" sx={{ minHeight: 44 }}>
          <Typography sx={{
            flex: 1, fontWeight: 700, fontSize: fsPx(16),
            color: import.meta.env.MODE !== 'production' ? '#000' : c.primary,
          }}>
            AIW CRM
          </Typography>
          <Typography sx={{ color: import.meta.env.MODE !== 'production' ? 'rgba(0,0,0,0.6)' : c.muted, fontSize: fsPx(12), mr: 1 }}>
            {(user?.company_short_name || user?.company_name) ? `${user.company_short_name || user.company_name} · ` : ''}
            {user?.name || user?.email?.split('@')[0]}
          </Typography>
          <IconButton size="small" onClick={() => navigate('/settings')} sx={{ color: import.meta.env.MODE !== 'production' ? 'rgba(0,0,0,0.7)' : c.muted, mr: 0.5 }}>
            <SettingsIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={logout} sx={{ color: import.meta.env.MODE !== 'production' ? 'rgba(0,0,0,0.7)' : c.muted }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route index element={<Parties />} />
          <Route path="parties/:partyId" element={<PartyDetail />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="chat" element={<ChatList />} />
          <Route path="chat/:conversationId" element={<ChatThread />} />
          <Route path="bakken-watch" element={<BakkenWatch />} />
          <Route path="import" element={<Import />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>

      {/* Two-row bottom nav (task #442, 2026-11-04), replacing the old
          single-row MUI BottomNavigation -- 6 tabs in one row were
          crowding/clipping at the screen edges. Horizontal padding plus
          the safe-area bottom inset keep every tap target (especially the
          bottom row's leftmost/rightmost buttons) clear of the physical
          curved screen corners, rather than sitting flush against them. */}
      <Paper elevation={3} sx={{ flexShrink: 0, px: 1.5, pb: 'env(safe-area-inset-bottom)' }}>
        {navRows.map((rowTabs, rowIdx) => (
          <Box key={rowIdx} sx={{ display: 'flex', width: '100%' }}>
            {rowTabs.map((t) => {
              const selected = t.path === activeTabPath;
              return (
                <Box
                  key={t.path}
                  component="button"
                  type="button"
                  onClick={() => navigate(t.path)}
                  sx={{
                    flex: 1, minWidth: 0, border: 'none', background: 'none', p: 0, m: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    py: 0.75, gap: 0.25, cursor: 'pointer', fontFamily: 'inherit',
                    color: selected ? c.primary : c.muted,
                    '&:focus-visible': { outline: '2px solid', outlineColor: c.primary, outlineOffset: -2 },
                  }}
                >
                  {t.path === '/chat' ? (
                    <Badge color="error" badgeContent={totalUnread} max={99}>{t.icon}</Badge>
                  ) : t.icon}
                  <Typography
                    sx={{
                      fontSize: fsPx(11), lineHeight: 1.2, color: 'inherit',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
                    }}
                  >
                    {t.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
