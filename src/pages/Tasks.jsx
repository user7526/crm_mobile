import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Paper, Chip, CircularProgress, Button, Select, MenuItem,
  FormControlLabel, Checkbox,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { listTasks, patchActivity } from '../api/crmApi';
import { colors as c } from '../theme';

const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'closed', label: 'Closed' },
];

function isOverdue(t) {
  if (!t.due_at || t.task_status === 'closed') return false;
  return new Date(t.due_at).getTime() < Date.now();
}

export default function Tasks() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const tasksRef = useRef([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('open');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const fetchList = useCallback(async (append = false) => {
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, offset: append ? tasksRef.current.length : 0, sort_by: 'due_at', sort_dir: 'asc' };
      if (status) params.status = status;
      if (overdueOnly) params.overdue = 'true';
      const data = await listTasks(params);
      const rows = data.tasks || [];
      setTasks((prev) => (append ? [...prev, ...rows] : rows));
      setTotal(data.total ?? 0);
    } catch {
      if (!append) { setTasks([]); setTotal(0); }
    } finally {
      setLoading(false);
    }
  }, [status, overdueOnly]);

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { fetchList(false); }, [fetchList]);

  const toggleStatus = async (t) => {
    const next = t.task_status === 'closed' ? 'open' : 'closed';
    setSavingId(t.activity_id);
    try {
      await patchActivity(t.party_id, t.activity_id, { task_status: next });
      fetchList(false);
    } catch { /* ignore */ } finally {
      setSavingId(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
        <Select size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 130 }}>
          {STATUS_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </Select>
        <FormControlLabel
          control={<Checkbox size="small" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />}
          label="Overdue only"
        />
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {loading && tasks.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={28} /></Box>
        ) : tasks.length === 0 ? (
          <Typography sx={{ textAlign: 'center', color: c.muted, mt: 2 }}>No tasks found.</Typography>
        ) : (
          tasks.map((t) => {
            const overdue = isOverdue(t);
            return (
              <Paper
                key={t.activity_id}
                variant="outlined"
                sx={{ p: 1.25, mb: 1, opacity: savingId === t.activity_id ? 0.6 : 1 }}
                onClick={() => navigate(`/parties/${t.party_id}`)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: c.muted }}>#{t.activity_id}</Typography>
                  <Chip
                    size="small"
                    label={t.task_status === 'closed' ? 'Closed' : t.task_status === 'on_hold' ? 'On hold' : 'Open'}
                    color={t.task_status === 'closed' ? 'success' : t.task_status === 'on_hold' ? 'warning' : 'default'}
                    variant="outlined"
                    sx={{ height: 20, fontSize: 11 }}
                  />
                  {t.due_at && (
                    <Typography variant="caption" sx={{ color: overdue ? c.danger : c.muted, fontWeight: overdue ? 700 : 400, ml: 'auto' }}>
                      Due {new Date(t.due_at).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
                <Typography sx={{ fontWeight: 600 }}>{t.subject || '(no title)'}</Typography>
                <Typography variant="caption" sx={{ color: c.muted }}>
                  {t.party_legal_name || t.party_dba_name || `Party #${t.party_id}`}
                </Typography>
                <Box sx={{ mt: 0.75 }}>
                  <Button size="small" onClick={(e) => { e.stopPropagation(); toggleStatus(t); }}>
                    {t.task_status === 'closed' ? 'Reopen' : 'Mark complete'}
                  </Button>
                </Box>
              </Paper>
            );
          })
        )}
        {tasks.length < total && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
            <Button size="small" onClick={() => fetchList(true)} disabled={loading}>
              {loading ? <CircularProgress size={16} /> : `Load more (${tasks.length} of ${total})`}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
