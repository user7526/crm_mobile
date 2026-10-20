import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, IconButton, CircularProgress, Chip, Paper, Divider, TextField,
  Select, MenuItem, Button, Tabs, Tab,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useParams, useNavigate } from 'react-router-dom';
import { getParty, createActivity, patchActivity } from '../api/crmApi';
import { colors as c } from '../theme';
import { getAiwDesktopOrigin } from '../config';
import PhoneLink from '../components/PhoneLink';
import EmailLink from '../components/EmailLink';

const ACTIVITY_TYPES = ['task', 'call', 'email', 'meeting', 'note'];

function fmtDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' });
}

export default function PartyDetail() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [party, setParty] = useState(null);
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({ activity_type: 'note', subject: '', body: '', contact_id: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getParty(partyId);
      setParty(data);
    } catch {
      setParty(null);
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  useEffect(() => { load(); }, [load]);

  const submitActivity = async () => {
    if (!form.subject.trim() && !form.body.trim()) return;
    setSaving(true);
    try {
      await createActivity(partyId, {
        activity_type: form.activity_type,
        subject: form.subject.trim() || null,
        body: form.body.trim() || null,
        contact_id: form.contact_id || null,
        task_status: form.activity_type === 'task' ? 'open' : undefined,
      });
      setForm({ activity_type: 'note', subject: '', body: '', contact_id: '' });
      load();
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleTaskStatus = async (act) => {
    const next = act.task_status === 'closed' ? 'open' : 'closed';
    try {
      await patchActivity(partyId, act.activity_id, { task_status: next });
      load();
    } catch { /* ignore */ }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }
  if (!party) {
    return <Typography sx={{ p: 3, color: c.muted }}>Party not found.</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.25, borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
        <IconButton size="small" onClick={() => navigate(-1)}><ArrowBackIcon /></IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {party.legal_name}
          </Typography>
          {party.dba_name && <Typography variant="caption" sx={{ color: c.muted }}>{party.dba_name}</Typography>}
        </Box>
        <IconButton
          size="small"
          title="Open in desktop CRM"
          onClick={() => window.open(`${getAiwDesktopOrigin()}/crm?openParty=${party.party_id}`, '_blank')}
        >
          <OpenInNewIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ px: 1.5, pt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap', flexShrink: 0 }}>
        {(party.roles || []).map((r) => (
          <Chip key={r} size="small" label={r.replace(/_/g, ' ')} variant="outlined" />
        ))}
        {party.phone_main && <PhoneLink value={party.phone_main} />}
      </Box>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: `1px solid ${c.border}`, minHeight: 40, flexShrink: 0 }}>
        <Tab label="Timeline" sx={{ minHeight: 40 }} />
        <Tab label={`Contacts (${(party.contacts || []).length})`} sx={{ minHeight: 40 }} />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {tab === 0 && (
          <>
            <Paper variant="outlined" sx={{ p: 1.25, mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Select size="small" value={form.activity_type} onChange={(e) => setForm((f) => ({ ...f, activity_type: e.target.value }))}>
                  {ACTIVITY_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
                <Select size="small" value={form.contact_id} displayEmpty onChange={(e) => setForm((f) => ({ ...f, contact_id: e.target.value }))} sx={{ flex: 1 }}>
                  <MenuItem value="">(no related contact)</MenuItem>
                  {(party.contacts || []).map((ct) => (
                    <MenuItem key={ct.contact_id} value={ct.contact_id}>{[ct.first_name, ct.last_name].filter(Boolean).join(' ')}</MenuItem>
                  ))}
                </Select>
              </Box>
              <TextField
                size="small" fullWidth placeholder="Subject" sx={{ mb: 1 }}
                value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
              <TextField
                size="small" fullWidth multiline minRows={2} placeholder="Detail / note" sx={{ mb: 1 }}
                value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
              <Button size="small" variant="contained" onClick={submitActivity} disabled={saving} fullWidth>
                {saving ? <CircularProgress size={18} /> : 'Save to timeline'}
              </Button>
            </Paper>

            {(party.activities || []).map((act) => (
              <Paper key={act.activity_id} variant="outlined" sx={{ p: 1.25, mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                  <Chip size="small" label={act.activity_type} variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                  <Typography variant="caption" sx={{ color: c.muted }}>#{act.activity_id}</Typography>
                  {act.task_status === 'closed' && <Chip size="small" label="Done" color="success" variant="outlined" sx={{ height: 20, fontSize: 11 }} />}
                  {act.task_status === 'on_hold' && <Chip size="small" label="On hold" color="warning" variant="outlined" sx={{ height: 20, fontSize: 11 }} />}
                  <Typography variant="caption" sx={{ color: c.muted, ml: 'auto' }}>{fmtDateTime(act.created_at)}</Typography>
                </Box>
                {act.subject && <Typography sx={{ fontWeight: 600 }}>{act.subject}</Typography>}
                {act.body && <Typography variant="body2" sx={{ color: c.textSecondary, whiteSpace: 'pre-wrap' }}>{act.body}</Typography>}
                {act.due_at && act.task_status !== 'closed' && (
                  <Typography variant="caption" sx={{ color: c.warning, display: 'block', mt: 0.5 }}>
                    Due {new Date(act.due_at).toLocaleDateString()}
                  </Typography>
                )}
                {act.activity_type === 'task' && (
                  <Button size="small" sx={{ mt: 0.5 }} onClick={() => toggleTaskStatus(act)}>
                    {act.task_status === 'closed' ? 'Reopen' : 'Mark complete'}
                  </Button>
                )}
              </Paper>
            ))}
            {(party.activities || []).length === 0 && (
              <Typography sx={{ color: c.muted, textAlign: 'center', mt: 2 }}>No timeline activity yet.</Typography>
            )}
          </>
        )}

        {tab === 1 && (
          <Box>
            {(party.contacts || []).map((ct, idx) => (
              <React.Fragment key={ct.contact_id}>
                {idx > 0 && <Divider sx={{ my: 1 }} />}
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>
                    {[ct.first_name, ct.last_name].filter(Boolean).join(' ')}
                    {ct.is_primary && <Chip size="small" label="Primary" sx={{ ml: 1, height: 18, fontSize: 10 }} />}
                  </Typography>
                  {ct.title && <Typography variant="caption" sx={{ color: c.muted }}>{ct.title}</Typography>}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
                    {ct.phone && <PhoneLink value={ct.phone} />}
                    {ct.phone_office && <PhoneLink value={ct.phone_office} />}
                    {ct.email && <EmailLink value={ct.email} partyId={party.party_id} contactId={ct.contact_id} />}
                  </Box>
                </Box>
              </React.Fragment>
            ))}
            {(party.contacts || []).length === 0 && (
              <Typography sx={{ color: c.muted, textAlign: 'center', mt: 2 }}>No contacts yet.</Typography>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
