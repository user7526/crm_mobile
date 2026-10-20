import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, IconButton, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useAuth } from './App';
import { colors as c } from './theme';
import Parties from './pages/Parties';
import PartyDetail from './pages/PartyDetail';
import Contacts from './pages/Contacts';
import Tasks from './pages/Tasks';
import Import from './pages/Import';

const TABS = [
  { path: '/', label: 'Parties', icon: <BusinessIcon /> },
  { path: '/contacts', label: 'Contacts', icon: <PeopleAltIcon /> },
  { path: '/tasks', label: 'Tasks', icon: <AssignmentIcon /> },
  { path: '/import', label: 'Import', icon: <UploadFileIcon /> },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Bottom nav highlights by top-level path; party detail (/parties/:id)
  // still highlights the Parties tab since it's a drill-down from there.
  const activeTab = TABS.findIndex((t) => (t.path === '/' ? location.pathname === '/' || location.pathname.startsWith('/parties') : location.pathname.startsWith(t.path)));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', bgcolor: c.bg }}>
      <AppBar position="static" elevation={0} sx={{
        bgcolor: import.meta.env.MODE !== 'production' ? '#ff9800' : c.surface,
        borderBottom: `1px solid ${c.border}`,
      }}>
        <Toolbar variant="dense" sx={{ minHeight: 44 }}>
          <Typography sx={{
            flex: 1, fontWeight: 700, fontSize: 16,
            color: import.meta.env.MODE !== 'production' ? '#000' : c.primary,
          }}>
            AIW CRM
          </Typography>
          <Typography sx={{ color: import.meta.env.MODE !== 'production' ? 'rgba(0,0,0,0.6)' : c.muted, fontSize: 12, mr: 1 }}>
            {(user?.company_short_name || user?.company_name) ? `${user.company_short_name || user.company_name} · ` : ''}
            {user?.name || user?.email?.split('@')[0]}
          </Typography>
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
          <Route path="import" element={<Import />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>

      <Paper elevation={3} sx={{ flexShrink: 0 }}>
        <BottomNavigation
          showLabels
          value={activeTab}
          onChange={(e, newValue) => navigate(TABS[newValue].path)}
          sx={{
            '& .Mui-selected': { color: c.primary },
          }}
        >
          {TABS.map((t) => (
            <BottomNavigationAction key={t.path} label={t.label} icon={t.icon} />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
