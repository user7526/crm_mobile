import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Button, Chip, TextField, IconButton,
  Accordion, AccordionSummary, AccordionDetails, Dialog, DialogTitle, DialogContent,
  DialogActions, DialogContentText, Autocomplete, Checkbox,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { colors as c } from '../theme';
import {
  listAiProposals, approveAiProposal, rejectAiProposal, updateAiProposal,
  listReferenceMaterials, getBakkenWatchCandidates,
} from '../api/crmApi';

const DAILY_REPORT_TAG = 'bakken_daily_report';

// Mirrors ai_ui_react/src/pages/CrmParties.js's ROLE_OPTIONS -- used only for
// the role-shaped fields (roles/add_roles/remove_roles) in the proposal
// editor below, same as desktop's CrmBakkenWatch.js.
const ROLE_OPTIONS = [
  { value: 'customer', label: 'Customer' },
  { value: 'end_user', label: 'End user / producer' },
  { value: 'service_provider', label: 'Service Provider' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'vendor_prospect', label: 'Vendor prospect' },
  { value: 'importer', label: 'Importer' },
  { value: 'importer_prospect', label: 'Importer prospect' },
  { value: 'mill', label: 'Mill' },
  { value: 'mill_prospect', label: 'Mill prospect' },
  { value: 'exporter_prospect', label: 'Exporter prospect' },
  { value: 'competitor', label: 'Competitor' },
  { value: 'other', label: 'Other' },
  { value: 'project', label: 'Project' },
  { value: 'event', label: 'Event' },
];
const ROLE_ARRAY_FIELDS = new Set(['roles', 'add_roles', 'remove_roles']);
const MULTILINE_FIELDS = new Set(['notes', 'details', 'body', 'description', 'justification']);

const STATUS_COLORS = {
  pending: '#ed6c02', approved: '#0288d1', applied: '#2e7d32',
  rejected: '#616161', failed: '#c62828',
};
const RECON_ACTION_COLORS = {
  create: '#2e7d32', update: '#0288d1',
  create_task: '#2e7d32', update_task: '#0288d1',
  no_change: '#616161',
};
const RECON_ACTION_LABELS = {
  create: 'Create', update: 'Update', create_task: 'Create Task',
  update_task: 'Update Task', no_change: 'No Change',
};

function fmtDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    month: '2-digit', day: '2-digit', year: '2-digit', hour: 'numeric', minute: '2-digit',
  });
}

// Markdown rendering for the generated reports -- same react-markdown +
// remark-gfm pairing as desktop's CrmBakkenWatch.js, restyled for the light
// mobile theme (desktop forces white text for its dark surface; this app
// only has a light theme, so plain default colors read fine here).
const reportMdComponents = {
  table: ({ children }) => (
    <table style={{ borderCollapse: 'collapse', width: '100%', margin: '6px 0', fontSize: '12px' }}>{children}</table>
  ),
  tr: ({ children }) => <tr style={{ borderBottom: `1px solid ${c.border}` }}>{children}</tr>,
  th: ({ children }) => (
    <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600, fontSize: '12px', borderBottom: `2px solid ${c.border}` }}>{children}</th>
  ),
  td: ({ children }) => <td style={{ padding: '3px 6px', fontSize: '12px', borderBottom: `1px solid ${c.border}` }}>{children}</td>,
  h1: ({ children }) => <h1 style={{ fontSize: '19px', fontWeight: 700, margin: '10px 0 6px' }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '10px 0 4px' }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '8px 0 3px' }}>{children}</h3>,
  h4: ({ children }) => <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '6px 0 2px' }}>{children}</h4>,
  p: ({ children }) => <p style={{ margin: '4px 0', lineHeight: 1.5 }}>{children}</p>,
  hr: () => <hr style={{ border: 'none', borderTop: `1px solid ${c.border}`, margin: '8px 0' }} />,
  ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: '1.4em' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: '4px 0', paddingLeft: '1.4em' }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: '2px' }}>{children}</li>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: c.primary }}>{children}</a>,
  strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
};

export default function BakkenWatch() {
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [showAllStatuses, setShowAllStatuses] = useState(false);
  // Everything auto-collapses on load (AI-A task #400, 2026-10-23) -- a small
  // phone screen can't afford to default-open both sections' full content.
  const [pendingCollapsed, setPendingCollapsed] = useState(true);
  const [reportsCollapsed, setReportsCollapsed] = useState(true);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(null); // 'approve' | 'deny' | null
  const [editTarget, setEditTarget] = useState(null);
  const [editArgs, setEditArgs] = useState({});
  const [editBusy, setEditBusy] = useState(false);

  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportSearch, setReportSearch] = useState('');
  const [expandedReport, setExpandedReport] = useState(null);
  const [candidatesByRun, setCandidatesByRun] = useState({});
  const [candidatesLoadingRun, setCandidatesLoadingRun] = useState(null);

  const loadProposals = useCallback(async (silent = false) => {
    if (!silent) setProposalsLoading(true);
    try {
      const data = await listAiProposals(showAllStatuses);
      setProposals(data.proposals || []);
    } catch {
      if (!silent) setProposals([]);
    } finally {
      if (!silent) setProposalsLoading(false);
    }
  }, [showAllStatuses]);

  const loadReports = useCallback(async (silent = false) => {
    if (!silent) setReportsLoading(true);
    try {
      const params = { context_tag: DAILY_REPORT_TAG };
      if (reportSearch.trim()) params.q = reportSearch.trim();
      const data = await listReferenceMaterials(params);
      setReports(data.materials || []);
    } catch {
      if (!silent) setReports([]);
    } finally {
      if (!silent) setReportsLoading(false);
    }
  }, [reportSearch]);

  useEffect(() => { loadProposals(); }, [loadProposals]);
  useEffect(() => {
    const t = setTimeout(loadReports, 250);
    return () => clearTimeout(t);
  }, [loadReports]);

  // Same unattended-run auto-refresh as desktop.
  useEffect(() => {
    const interval = setInterval(() => {
      loadProposals(true);
      loadReports(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [loadProposals, loadReports]);

  const loadCandidates = useCallback(async (runId) => {
    if (!runId || candidatesByRun[runId]) return;
    setCandidatesLoadingRun(runId);
    try {
      const data = await getBakkenWatchCandidates(runId);
      setCandidatesByRun((prev) => ({ ...prev, [runId]: data.candidates || [] }));
    } catch {
      // swallow -- the nested section just stays empty
    } finally {
      setCandidatesLoadingRun((cur) => (cur === runId ? null : cur));
    }
  }, [candidatesByRun]);

  const approve = async (id) => {
    setBusyId(id);
    try {
      const data = await approveAiProposal(id);
      if (data.status !== 'applied') {
        // eslint-disable-next-line no-alert
        alert(`Tool call failed: ${JSON.stringify(data.result)}`);
      }
      await loadProposals();
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message || 'Failed to approve');
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget);
    try {
      await rejectAiProposal(rejectTarget, rejectReason.trim());
      setRejectTarget(null);
      setRejectReason('');
      await loadProposals();
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message || 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  };

  // Sequential, oldest-id-first -- same reasoning as desktop (a create_task
  // proposal can depend on an earlier create_party proposal for the same
  // run having already committed).
  const runBulkApprove = async () => {
    const targets = proposals.filter((p) => p.status === 'pending').sort((a, b) => a.id - b.id);
    setBulkConfirm(null);
    setBulkBusy(true);
    for (const p of targets) {
      setBusyId(p.id);
      try { await approveAiProposal(p.id); } catch { /* keep going */ }
    }
    setBusyId(null);
    setBulkBusy(false);
    await loadProposals();
  };

  const runBulkDeny = async () => {
    const targets = proposals.filter((p) => p.status === 'pending').sort((a, b) => a.id - b.id);
    setBulkConfirm(null);
    setBulkBusy(true);
    for (const p of targets) {
      setBusyId(p.id);
      try { await rejectAiProposal(p.id, 'Bulk denied'); } catch { /* keep going */ }
    }
    setBusyId(null);
    setBulkBusy(false);
    await loadProposals();
  };

  const openEdit = (p) => {
    setEditTarget(p);
    setEditArgs({ ...(p.tool_args || {}) });
  };

  const setEditField = (key, value) => {
    setEditArgs((prev) => ({ ...prev, [key]: value }));
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setEditBusy(true);
    try {
      await updateAiProposal(editTarget.id, editArgs);
      setEditTarget(null);
      await loadProposals();
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message || 'Failed to update proposal');
    } finally {
      setEditBusy(false);
    }
  };

  const pendingCount = proposals.filter((p) => p.status === 'pending').length;

  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* ---- Pending Reviews ---- */}
      <Paper variant="outlined" sx={{ p: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, flex: 1 }}>
            Pending Reviews{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </Typography>
          <IconButton size="small" onClick={() => loadProposals()}><RefreshIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => setPendingCollapsed((v) => !v)}>
            <ExpandMoreIcon fontSize="small" sx={{ transform: pendingCollapsed ? 'rotate(-90deg)' : 'none' }} />
          </IconButton>
        </Box>

        {!pendingCollapsed && (
          <>
            <Typography variant="caption" sx={{ color: c.muted, display: 'block', mt: 0.5, mb: 1 }}>
              CRM writes proposed by the unattended Bakken Watch research run. Approving a row calls the real
              tool for the first time.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
              <Button
                size="small" variant={showAllStatuses ? 'contained' : 'outlined'}
                onClick={() => setShowAllStatuses((v) => !v)} sx={{ textTransform: 'none' }}
              >
                {showAllStatuses ? 'Showing all' : 'Pending only'}
              </Button>
              <Button
                size="small" variant="contained" color="success"
                disabled={bulkBusy || pendingCount === 0}
                onClick={() => setBulkConfirm('approve')} sx={{ textTransform: 'none' }}
              >
                Approve All
              </Button>
              <Button
                size="small" variant="outlined" color="error"
                disabled={bulkBusy || pendingCount === 0}
                onClick={() => setBulkConfirm('deny')} sx={{ textTransform: 'none' }}
              >
                Deny All
              </Button>
            </Box>

            {proposalsLoading ? (
              <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={22} /></Box>
            ) : proposals.length === 0 ? (
              <Typography variant="body2" sx={{ color: c.muted }}>No proposals to review.</Typography>
            ) : (
              proposals.map((p) => (
                <Paper key={p.id} variant="outlined" sx={{ p: 1.25, mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 0.5 }}>
                    <Chip size="small" label={p.status} sx={{ bgcolor: STATUS_COLORS[p.status] || '#616161', color: '#fff' }} />
                    <Chip size="small" variant="outlined" label={p.tool_name} />
                    <Typography variant="caption" sx={{ color: c.muted }}>#{p.id} &middot; {fmtDateTime(p.created_at)}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 14 }}>{p.summary}</Typography>
                  {p.apply_result && (p.apply_result.error || p.apply_result.ok === false) && (
                    <Typography variant="caption" sx={{ color: '#c62828', display: 'block', mt: 0.5, fontWeight: 600 }}>
                      ⚠ Last attempt failed: {p.apply_result.error || JSON.stringify(p.apply_result)}
                    </Typography>
                  )}
                  {p.target_label && (
                    <Typography variant="caption" sx={{ color: c.muted, display: 'block', mt: 0.5 }}>
                      Target: {p.target_label}
                    </Typography>
                  )}
                  {Array.isArray(p.field_changes) && p.field_changes.length > 0 && (
                    <Box sx={{ mt: 0.75, border: `1px solid ${c.border}`, borderRadius: 1, overflow: 'hidden' }}>
                      {p.field_changes.map((fc, idx) => (
                        <Box
                          key={fc.field}
                          sx={{ px: 1, py: 0.5, fontSize: 11, borderTop: idx === 0 ? 'none' : `1px solid ${c.border}` }}
                        >
                          <Typography sx={{ fontSize: 11, fontWeight: 600, color: c.muted }}>{fc.field}</Typography>
                          <Typography sx={{ fontSize: 11, color: '#c62828', textDecoration: 'line-through', wordBreak: 'break-word' }}>
                            {fc.old || '(empty)'}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: '#2e7d32', wordBreak: 'break-word' }}>
                            {fc.new || '(empty)'}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                  <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, mt: 0.5 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 26, px: 0, '& .MuiAccordionSummary-content': { my: 0 } }}>
                      <Typography variant="caption" sx={{ color: c.muted }}>View raw tool arguments</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 0 }}>
                      <Box component="pre" sx={{
                        fontSize: 10, color: c.textSecondary, bgcolor: c.surface, p: 1, borderRadius: 1,
                        overflow: 'auto', m: 0,
                      }}>
                        {JSON.stringify(p.tool_args, null, 2)}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                  {p.status !== 'pending' && (
                    <Typography variant="caption" sx={{ color: c.muted, display: 'block', mt: 0.5 }}>
                      {p.status} by {p.reviewed_by_label || 'unknown'} on {fmtDateTime(p.reviewed_at)}
                      {p.reject_reason ? ` -- ${p.reject_reason}` : ''}
                    </Typography>
                  )}
                  {p.status === 'pending' && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <IconButton size="small" disabled={busyId === p.id} onClick={() => openEdit(p)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <Button
                        size="small" variant="contained" color="success" disabled={busyId === p.id}
                        onClick={() => approve(p.id)} sx={{ textTransform: 'none' }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small" variant="outlined" color="error" disabled={busyId === p.id}
                        onClick={() => { setRejectTarget(p.id); setRejectReason(''); }} sx={{ textTransform: 'none' }}
                      >
                        Reject
                      </Button>
                    </Box>
                  )}
                </Paper>
              ))
            )}
          </>
        )}
      </Paper>

      {/* ---- Daily Reports archive ---- */}
      <Paper variant="outlined" sx={{ p: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, flex: 1 }}>Daily Reports</Typography>
          <IconButton size="small" onClick={() => loadReports()}><RefreshIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => setReportsCollapsed((v) => !v)}>
            <ExpandMoreIcon fontSize="small" sx={{ transform: reportsCollapsed ? 'rotate(-90deg)' : 'none' }} />
          </IconButton>
        </Box>

        {!reportsCollapsed && (
          <>
            <TextField
              size="small" fullWidth placeholder="Search reports..." sx={{ mt: 1, mb: 1.5 }}
              value={reportSearch} onChange={(e) => setReportSearch(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: c.muted }} /> }}
            />
            {reportsLoading ? (
              <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={22} /></Box>
            ) : reports.length === 0 ? (
              <Typography variant="body2" sx={{ color: c.muted }}>No daily reports yet.</Typography>
            ) : (
              reports.map((r) => (
                <Accordion
                  key={r.material_id} disableGutters elevation={0} variant="outlined" sx={{ mb: 1 }}
                  expanded={expandedReport === r.material_id}
                  onChange={(e, expanded) => setExpandedReport(expanded ? r.material_id : null)}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: c.muted }}>{fmtDateTime(r.created_at)}</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {(r.ndic_report_url || r.directors_cut_url) && (
                      <Box sx={{ mb: 1.5, p: 1, border: `1px solid ${c.border}`, borderRadius: 1, bgcolor: c.surface }}>
                        <Typography variant="caption" sx={{ color: c.muted, display: 'block', mb: 0.5, fontWeight: 600 }}>
                          Sources (fetched directly by AIW, not web_search)
                        </Typography>
                        {r.ndic_report_url ? (
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            NDIC Daily Activity Report
                            {r.latest_ndic_report_number ? ` #${r.latest_ndic_report_number}` : ''}
                            {r.latest_ndic_report_date ? ` (${r.latest_ndic_report_date})` : ''}
                            {' -- '}
                            <a href={r.ndic_report_url} target="_blank" rel="noopener noreferrer" style={{ color: c.primary }}>link</a>
                          </Typography>
                        ) : r.ndic_report_status && (
                          <Typography variant="caption" sx={{ display: 'block', color: c.muted }}>
                            NDIC Daily Activity Report: could not be retrieved this run ({r.ndic_report_status})
                          </Typography>
                        )}
                        {r.directors_cut_url ? (
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            Director's Cut Monthly Report
                            {r.directors_cut_published_date ? ` (${r.directors_cut_published_date})` : ''}
                            {' -- '}
                            <a href={r.directors_cut_url} target="_blank" rel="noopener noreferrer" style={{ color: c.primary }}>link</a>
                          </Typography>
                        ) : r.directors_cut_status && (
                          <Typography variant="caption" sx={{ display: 'block', color: c.muted }}>
                            Director's Cut Monthly Report: could not be retrieved this run ({r.directors_cut_status})
                          </Typography>
                        )}
                      </Box>
                    )}
                    <Box sx={{ fontSize: 13 }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={reportMdComponents}>
                        {r.notes}
                      </ReactMarkdown>
                    </Box>

                    {r.run_id && (
                      <Accordion
                        disableGutters elevation={0} variant="outlined" sx={{ mt: 1.5 }}
                        onChange={(e, expanded) => { if (expanded) loadCandidates(r.run_id); }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            CRM Reconciliation Decisions
                            {typeof r.crm_candidates_logged === 'number' ? ` (${r.crm_candidates_logged})` : ''}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          {candidatesLoadingRun === r.run_id ? (
                            <Box sx={{ py: 1, display: 'flex', justifyContent: 'center' }}><CircularProgress size={16} /></Box>
                          ) : !candidatesByRun[r.run_id] ? null : candidatesByRun[r.run_id].length === 0 ? (
                            <Typography variant="body2" sx={{ color: c.muted }}>No candidate events were logged for this run.</Typography>
                          ) : (
                            candidatesByRun[r.run_id].map((cand) => (
                              <Paper key={cand.candidate_id} variant="outlined" sx={{ p: 1, mb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 0.5 }}>
                                  <Chip
                                    size="small"
                                    label={RECON_ACTION_LABELS[cand.recommended_action] || cand.recommended_action}
                                    sx={{ bgcolor: RECON_ACTION_COLORS[cand.recommended_action] || '#616161', color: '#fff' }}
                                  />
                                  {cand.company_name && <Chip size="small" variant="outlined" label={cand.company_name} />}
                                  {cand.confidence && <Typography variant="caption" sx={{ color: c.muted }}>{cand.confidence}</Typography>}
                                </Box>
                                <Typography sx={{ fontSize: 13 }}>{cand.source_event}</Typography>
                                {cand.justification && (
                                  <Typography variant="caption" sx={{ color: c.muted, display: 'block', mt: 0.5 }}>
                                    Why: {cand.justification}
                                  </Typography>
                                )}
                                {cand.source_url && (
                                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                                    <a href={cand.source_url} target="_blank" rel="noopener noreferrer" style={{ color: c.primary }}>
                                      {cand.source_url}
                                    </a>
                                  </Typography>
                                )}
                              </Paper>
                            ))
                          )}
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </>
        )}
      </Paper>

      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject proposal</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}>Optional reason (visible in the history below):</DialogContentText>
          <TextField autoFocus fullWidth multiline minRows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmReject}>Reject</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!bulkConfirm} onClose={() => setBulkConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{bulkConfirm === 'approve' ? 'Approve all pending?' : 'Deny all pending?'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {bulkConfirm === 'approve'
              ? `This will call the real CRM tool for all ${pendingCount} pending proposal(s), oldest first. This is the first point any of them touch real CRM data.`
              : `This will reject all ${pendingCount} pending proposal(s). No CRM tool is ever called for a denied proposal.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkConfirm(null)}>Cancel</Button>
          <Button
            variant="contained" color={bulkConfirm === 'approve' ? 'success' : 'error'}
            onClick={bulkConfirm === 'approve' ? runBulkApprove : runBulkDeny}
          >
            {bulkConfirm === 'approve' ? 'Approve All' : 'Deny All'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit proposal #{editTarget?.id}{editTarget ? ` -- ${editTarget.tool_name}` : ''}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Change any field below, then save -- this updates the proposal itself, it does not approve it.
          </DialogContentText>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.keys(editArgs).map((key) => {
              if (ROLE_ARRAY_FIELDS.has(key)) {
                const current = Array.isArray(editArgs[key]) ? editArgs[key] : [];
                return (
                  <Autocomplete
                    key={key}
                    multiple
                    disableCloseOnSelect
                    options={ROLE_OPTIONS}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(o, v) => o.value === v.value}
                    value={ROLE_OPTIONS.filter((o) => current.includes(o.value))}
                    onChange={(e, newVal) => setEditField(key, newVal.map((o) => o.value))}
                    renderOption={(props, option, { selected }) => (
                      <li {...props}>
                        <Checkbox checked={selected} size="small" sx={{ mr: 1 }} />
                        {option.label}
                      </li>
                    )}
                    renderInput={(params) => <TextField {...params} label={key} size="small" />}
                  />
                );
              }
              const value = editArgs[key];
              const displayValue = Array.isArray(value) ? value.join(', ') : (value ?? '');
              return (
                <TextField
                  key={key}
                  label={key}
                  size="small"
                  fullWidth
                  multiline={MULTILINE_FIELDS.has(key)}
                  minRows={MULTILINE_FIELDS.has(key) ? 3 : 1}
                  value={displayValue}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setEditField(key, Array.isArray(value) ? raw.split(',').map((s) => s.trim()).filter(Boolean) : raw);
                  }}
                />
              );
            })}
            {Object.keys(editArgs).length === 0 && (
              <Typography variant="body2" sx={{ color: c.muted }}>No editable fields.</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>Cancel</Button>
          <Button variant="contained" disabled={editBusy} onClick={saveEdit}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
