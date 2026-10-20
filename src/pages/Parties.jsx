import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, TextField, InputAdornment, IconButton, List, ListItemButton, ListItemText,
  Typography, Chip, CircularProgress, Button, Select, MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useNavigate } from 'react-router-dom';
import { listParties } from '../api/crmApi';
import { colors as c } from '../theme';
import PhoneLink from '../components/PhoneLink';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'customer', label: 'Customer' },
  { value: 'end_user', label: 'End user' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'competitor', label: 'Competitor' },
];

const PAGE_SIZE = 50;

export default function Parties() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const debounceRef = useRef(null);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState([]);
  const partiesRef = useRef([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQDebounced(q), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  useEffect(() => { partiesRef.current = parties; }, [parties]);

  const fetchList = useCallback(async (append = false) => {
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, offset: append ? partiesRef.current.length : 0 };
      if (qDebounced.trim()) params.q = qDebounced.trim();
      if (role) params.role = role;
      const data = await listParties(params);
      const rows = data.parties || data || [];
      setParties((prev) => (append ? [...prev, ...rows] : rows));
      setTotal(data.total ?? rows.length);
    } catch {
      if (!append) { setParties([]); setTotal(0); }
    } finally {
      setLoading(false);
    }
  }, [qDebounced, role]);

  useEffect(() => { fetchList(false); }, [fetchList]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: 1.5, display: 'flex', gap: 1, borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search parties..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            endAdornment: q ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setQ('')}><ClearIcon fontSize="small" /></IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        />
        <Select size="small" value={role} onChange={(e) => setRole(e.target.value)} sx={{ minWidth: 110 }}>
          {ROLE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </Select>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading && parties.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={28} /></Box>
        ) : parties.length === 0 ? (
          <Typography sx={{ p: 3, textAlign: 'center', color: c.muted }}>No parties found.</Typography>
        ) : (
          <List disablePadding>
            {parties.map((p) => (
              <ListItemButton
                key={p.party_id}
                onClick={() => navigate(`/parties/${p.party_id}`)}
                sx={{ borderBottom: `1px solid ${c.border}`, alignItems: 'flex-start', py: 1.25 }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 600 }}>{p.legal_name}</Typography>
                      {p.dba_name && <Typography variant="caption" sx={{ color: c.muted }}>({p.dba_name})</Typography>}
                      {Number(p.open_task_count) > 0 && (
                        <Chip size="small" label={`${p.open_task_count} open`} color="warning" variant="outlined" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {(p.roles || []).map((r) => (
                          <Chip key={r} size="small" label={r.replace(/_/g, ' ')} variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                        ))}
                      </Box>
                      {p.phone_main && <PhoneLink value={p.phone_main} sx={{ fontSize: 13 }} />}
                      {p.location && <Typography variant="caption" sx={{ color: c.muted }}>{p.location}</Typography>}
                    </Box>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
        {parties.length < total && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 1.5 }}>
            <Button size="small" onClick={() => fetchList(true)} disabled={loading}>
              {loading ? <CircularProgress size={16} /> : `Load more (${parties.length} of ${total})`}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
