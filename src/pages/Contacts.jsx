import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, TextField, InputAdornment, IconButton, List, ListItem, ListItemText,
  Typography, CircularProgress, Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { listContacts } from '../api/crmApi';
import { colors as c } from '../theme';
import PhoneLink from '../components/PhoneLink';
import EmailLink from '../components/EmailLink';

const PAGE_SIZE = 50;

export default function Contacts() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const debounceRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const contactsRef = useRef([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQDebounced(q), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  useEffect(() => { contactsRef.current = contacts; }, [contacts]);

  const fetchList = useCallback(async (append = false) => {
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, offset: append ? contactsRef.current.length : 0 };
      if (qDebounced.trim()) params.q = qDebounced.trim();
      const data = await listContacts(params);
      const rows = data.contacts || data || [];
      setContacts((prev) => (append ? [...prev, ...rows] : rows));
      setTotal(data.total ?? rows.length);
    } catch {
      if (!append) { setContacts([]); setTotal(0); }
    } finally {
      setLoading(false);
    }
  }, [qDebounced]);

  useEffect(() => { fetchList(false); }, [fetchList]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: 1.5, borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
        <TextField
          size="small" fullWidth placeholder="Search contacts..."
          value={q} onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            endAdornment: q ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setQ('')}><ClearIcon fontSize="small" /></IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        />
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading && contacts.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={28} /></Box>
        ) : contacts.length === 0 ? (
          <Typography sx={{ p: 3, textAlign: 'center', color: c.muted }}>No contacts found.</Typography>
        ) : (
          <List disablePadding>
            {contacts.map((ct) => (
              <ListItem
                key={ct.contact_id}
                divider
                secondaryAction={ct.party_id ? (
                  <IconButton size="small" onClick={() => navigate(`/parties/${ct.party_id}`)}>
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                ) : null}
              >
                <ListItemText
                  primary={
                    <Typography sx={{ fontWeight: 600 }}>
                      {[ct.first_name, ct.last_name].filter(Boolean).join(' ') || '(no name)'}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.25 }}>
                      {ct.party_legal_name && <Typography variant="caption" sx={{ color: c.muted }}>{ct.party_legal_name}</Typography>}
                      {ct.title && <Typography variant="caption" sx={{ color: c.muted }}>{ct.title}</Typography>}
                      {ct.phone && <PhoneLink value={ct.phone} sx={{ fontSize: 13 }} />}
                      {ct.phone_office && <PhoneLink value={ct.phone_office} sx={{ fontSize: 13 }} />}
                      {ct.email && <EmailLink value={ct.email} partyId={ct.party_id} contactId={ct.contact_id} sx={{ fontSize: 13 }} />}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
        {contacts.length < total && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 1.5 }}>
            <Button size="small" onClick={() => fetchList(true)} disabled={loading}>
              {loading ? <CircularProgress size={16} /> : `Load more (${contacts.length} of ${total})`}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
