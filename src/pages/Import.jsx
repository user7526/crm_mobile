import React, { useCallback, useMemo, useState } from 'react';
import {
  Box, Typography, TextField, Paper, Chip, CircularProgress, Button,
  Accordion, AccordionSummary, AccordionDetails, Alert, IconButton, Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { previewChatGptImport, commitChatGptImport } from '../api/crmApi';
import { colors as c } from '../theme';

// Kept in sync by hand with ai_ui_react/src/pages/CrmChatGptImport.js's
// CHATGPT_IMPORT_FORMAT_INSTRUCTIONS -- same format string, same backend
// endpoints, so a report pasted here imports identically to desktop. If
// that constant changes there, copy the change here too.
const CHATGPT_IMPORT_FORMAT_INSTRUCTIONS = `Please also output today's report as CSV, using exactly this format (one header row, then one row per item):

type,name,role,status,lead_status,linked_to,relationship,confidence,title,phone,email,products,location,primary_link,source_link,source_date,next_action,notes,task_id,owner,due

Column meanings:
- type: COMPANY, PROJECT, CONTACT, or TASK (required)
- name: the company/organization name, the project name, the contact's full name, or (for TASK rows) the task's short title (required)
- role: for COMPANY rows only -- vendor_prospect (default if blank), customer, end_user, other, or event. Leave blank for PROJECT/CONTACT rows.
- status: PROJECT rows -- the project's current phase: proposed, active, on_hold, or completed. TASK rows -- the task's status: open, on_hold, or closed. Leave blank for COMPANY/CONTACT rows.
- lead_status: COMPANY rows only -- how far along this prospect is: identified, qualified, or contacted. Leave blank if unknown or not a prospect.
- linked_to: for COMPANY/PROJECT rows, the name of another company or project row in this same report that this one relates to. For CONTACT rows, the name of the company/org they work at. For TASK rows, required only when creating a brand-new task -- leave blank on an update (via task_id) to keep the task's current party; set it only to deliberately move the task to a different party.
- relationship: only when linked_to is set on a COMPANY/PROJECT row -- one of: related_to, participates_in, contractor_on, operator_of, supplier_to, customer_to, parent_of, sponsor_of, organizes, developer_of, owner_of, engineer_on, purchasing_for. Leave blank otherwise.
- confidence: only when linked_to/relationship is set -- confirmed, likely, or unverified. Leave blank if not stated.
- title: the contact's job title (CONTACT rows only).
- phone, email: as given in the report.
- products: for COMPANY rows -- a short list of what they sell/make relevant to us.
- location: city/state or region, for COMPANY or PROJECT rows.
- primary_link: the main homepage / vendor-registration / program page link for a COMPANY or PROJECT row.
- source_link: the citation link for where this information came from.
- source_date: the date of the underlying source document/article, if different from today.
- next_action: a specific, concrete follow-up step for us to take. Becomes an open task, separate from the narrative note.
- notes: the narrative paragraph you'd normally write about this item. For TASK rows, this is the task's detail text.
- task_id: TASK rows only -- if I shared a "Detailed" export with you earlier, copy that task's "Activity ID" here to UPDATE that exact task instead of creating a duplicate. Leave blank for a brand-new task.
- owner: TASK rows only -- "chatgpt" or a staff member's name. Leave blank for unassigned.
- due: TASK rows only -- a due date in YYYY-MM-DD format. Leave blank to leave an existing due date untouched.

TASK rows only use: type, name (title), linked_to (required only when creating a new task), status, owner, task_id, due, notes. Leave all other columns blank on a TASK row.

Important: write out every link as a full literal URL, not just as a citation name.

If an item spans multiple rows, give each its own row and link them via linked_to/relationship.`;

function apiErrorMessage(data) {
  if (!data) return 'Request failed';
  if (typeof data.detail === 'string') return data.detail;
  return 'Request failed';
}

const ACTION_COLOR = {
  create: 'success', update: 'info', needs_review: 'warning',
  create_task: 'success', update_task: 'info',
};

export default function Import() {
  const [csvText, setCsvText] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [committed, setCommitted] = useState(null);
  const [error, setError] = useState('');

  const resultRows = preview?.results || [];
  const needsReviewCount = useMemo(() => resultRows.filter((r) => r.needs_review).length, [resultRows]);

  const runPreview = useCallback(async () => {
    if (!csvText.trim()) { setError('Paste the CSV text first'); return; }
    setError('');
    setPreviewing(true);
    setCommitted(null);
    try {
      const data = await previewChatGptImport(csvText);
      setPreview(data);
    } catch (e) {
      setError(e.message || 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  }, [csvText]);

  // Mobile v1 simplification: ambiguous fuzzy-matched rows (needs_review)
  // default to "create new" on commit, same as desktop when the user
  // doesn't manually resolve them -- there's no per-row override picker
  // here yet. Resolve ambiguous matches on desktop CRM's Import tab first
  // if that matters for a given report.
  const runCommit = useCallback(async () => {
    setError('');
    setCommitting(true);
    try {
      const rowOverrides = preview?.recommended_overrides || [];
      const data = await commitChatGptImport(csvText, rowOverrides);
      setCommitted(data);
      setPreview(null);
    } catch (e) {
      setError(e.message || 'Import failed');
    } finally {
      setCommitting(false);
    }
  }, [csvText, preview]);

  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
      <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Import from ChatGPT</Typography>
      <Typography variant="body2" sx={{ color: c.muted, mb: 1.5 }}>
        Paste a CSV export of a ChatGPT market-research report to upsert it into CRM.
      </Typography>

      <Accordion sx={{ mb: 1.5 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Format to give ChatGPT</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Tooltip title="Copy to clipboard">
              <IconButton size="small" onClick={() => navigator.clipboard.writeText(CHATGPT_IMPORT_FORMAT_INSTRUCTIONS)}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box component="pre" sx={{
            whiteSpace: 'pre-wrap', fontSize: 11, fontFamily: 'monospace',
            bgcolor: c.surface, p: 1.25, borderRadius: 1, m: 0,
          }}>
            {CHATGPT_IMPORT_FORMAT_INSTRUCTIONS}
          </Box>
        </AccordionDetails>
      </Accordion>

      <Paper variant="outlined" sx={{ p: 1.25, mb: 1.5 }}>
        <TextField
          multiline minRows={6} maxRows={14} fullWidth
          placeholder="Paste CSV text here..."
          value={csvText}
          onChange={(e) => { setCsvText(e.target.value); setPreview(null); setCommitted(null); }}
          sx={{ mb: 1, '& textarea': { fontFamily: 'monospace', fontSize: 12 } }}
        />
        <Button size="small" variant="outlined" onClick={runPreview} disabled={previewing} fullWidth sx={{ mb: 1 }}>
          {previewing ? <CircularProgress size={18} /> : 'Preview'}
        </Button>
        {preview && (
          <Button size="small" variant="contained" onClick={runCommit} disabled={committing} fullWidth>
            {committing ? <CircularProgress size={18} /> : `Import ${resultRows.length} row(s)${needsReviewCount ? ` (${needsReviewCount} ambiguous -> create new)` : ''}`}
          </Button>
        )}
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{apiErrorMessage({ detail: error })}</Alert>}

      {preview && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Preview ({resultRows.length} rows)</Typography>
          {(preview.warnings || []).map((w, i) => (
            <Alert key={i} severity="warning" sx={{ mb: 0.5 }}>{w}</Alert>
          ))}
          {resultRows.map((r) => (
            <Paper key={r.row_index} variant="outlined" sx={{ p: 1, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip size="small" label={r.action} color={ACTION_COLOR[r.action] || 'default'} variant="outlined" sx={{ height: 20, fontSize: 11 }} />
              <Typography variant="body2" sx={{ flex: 1 }}>{r.name || r.subject}</Typography>
            </Paper>
          ))}
        </Box>
      )}

      {committed && (
        <Alert severity="success">Imported {committed.results?.length ?? 0} row(s).</Alert>
      )}
    </Box>
  );
}
