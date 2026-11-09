import React, { useState } from 'react';
import { Box, Collapse, IconButton, Typography } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { colors as c } from '../theme';

/**
 * Collapsed-by-default wrapper for a CRM party detail tab's "add new X" form
 * (AI-A task #471, 2026-11-07) -- mirrors ai_ui_react's
 * components/crm/CollapsibleAddSection.js (desktop's AI-A task #414), ported
 * to this app's conventions (`colors` import instead of
 * `theme.palette.custom`, no MUI theme hook needed). Same rationale: on a
 * tab with any real history (Timeline especially), an always-open add form
 * pushes what the user actually opened the tab to read below the fold every
 * time, even though most visits don't involve adding anything. Collapsed by
 * default behind a one-line toggle; nothing is removed, just hidden until
 * asked for. Not persisted to localStorage -- "I'm adding something" is a
 * per-visit intent, not a standing preference (same as desktop).
 */
export default function CollapsibleAddSection({ label, children, defaultExpanded = false }) {
  const [open, setOpen] = useState(defaultExpanded);

  return (
    <Box sx={{ mb: 2, border: `1px solid ${c.border}`, borderRadius: 1 }}>
      <Box
        onClick={() => setOpen((o) => !o)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.75,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <IconButton size="small" sx={{ p: 0.25 }} tabIndex={-1}>
          {open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>
        <AddCircleOutlineIcon sx={{ fontSize: 18, color: c.primary }} />
        <Typography variant="subtitle2">{label}</Typography>
      </Box>
      <Collapse in={open} timeout="auto">
        <Box sx={{ px: 1.5, pb: 1.5, pt: 0.5 }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}
