import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, IconButton, AppBar, Toolbar, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { colors as c } from '../theme';
import { useFontSize } from '../contexts/FontSizeContext';

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { fontSize, setFontSize, MIN_FONT_SIZE, MAX_FONT_SIZE, fs } = useFontSize();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: c.bg }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: c.surface, borderBottom: `1px solid ${c.border}` }}>
        <Toolbar variant="dense" sx={{ minHeight: 44 }}>
          <IconButton size="small" onClick={() => navigate(location.state?.from || '/')} sx={{ color: c.muted, mr: 1 }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ flex: 1, fontWeight: 700, fontSize: fs(1), color: c.primary }}>
            Settings
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'auto', touchAction: 'pan-y', p: 2 }}>
        <Paper elevation={0} sx={{ p: 2, bgcolor: c.surface, border: `1px solid ${c.border}` }}>
          <Typography sx={{ color: c.primary, fontWeight: 600, fontSize: fs(0.9), mb: 0.5 }}>
            Font size
          </Typography>
          <Typography sx={{ color: c.muted, fontSize: fs(0.75), mb: 1.5 }}>
            Adjusts the text size across the whole app.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton
              size="small"
              onClick={() => setFontSize((f) => Math.max(MIN_FONT_SIZE, f - 2))}
              disabled={fontSize <= MIN_FONT_SIZE}
            >
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: c.primary }}>A-</Typography>
            </IconButton>
            <Typography variant="body2" sx={{ minWidth: 34, textAlign: 'center', color: c.text }}>{fontSize}px</Typography>
            <IconButton
              size="small"
              onClick={() => setFontSize((f) => Math.min(MAX_FONT_SIZE, f + 2))}
              disabled={fontSize >= MAX_FONT_SIZE}
            >
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: c.primary }}>A+</Typography>
            </IconButton>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
