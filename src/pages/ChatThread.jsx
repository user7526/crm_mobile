import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Typography, IconButton, TextField, CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useParams, useNavigate } from 'react-router-dom';
import { colors as c } from '../theme';
import { useMessaging } from '../contexts/MessagingContext';
import messagingApi from '../api/messagingApi';

const ACCEPTED_EXTENSIONS = ['.pdf', '.xlsx', '.xls', '.csv', '.docx', '.doc', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.webp'];

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function Attachment({ conversationId, message, mine }) {
  const mime = message.attachment_mime || '';
  const isImage = mime.startsWith('image/');
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!isImage) return undefined;
    let revoked = null;
    messagingApi.getAttachmentBlobUrl(conversationId, message.message_id)
      .then((u) => { revoked = u; setUrl(u); })
      .catch(() => {});
    return () => { if (revoked) URL.revokeObjectURL(revoked); };
  }, [conversationId, message.message_id, isImage]);

  const openFile = async () => {
    try {
      const blobUrl = await messagingApi.getAttachmentBlobUrl(conversationId, message.message_id);
      window.open(blobUrl, '_blank');
    } catch {
      // eslint-disable-next-line no-alert
      alert('Failed to load attachment');
    }
  };

  if (isImage) {
    return (
      <Box
        component="img" src={url} alt={message.attachment_original_name}
        onClick={openFile}
        sx={{ maxWidth: 200, maxHeight: 200, borderRadius: 1, cursor: 'pointer', display: 'block', mt: message.body ? 0.5 : 0 }}
      />
    );
  }
  return (
    <Box
      onClick={openFile}
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', mt: message.body ? 0.5 : 0,
        color: mine ? '#fff' : c.primary, textDecoration: 'underline', fontSize: 13,
      }}
    >
      <InsertDriveFileIcon fontSize="small" />
      {message.attachment_original_name || 'Attachment'}
    </Box>
  );
}

export default function ChatThread() {
  const { conversationId } = useParams();
  const convId = Number(conversationId);
  const navigate = useNavigate();
  const { currentUserId, subscribeToMessages, setActiveConversationId, refreshConversations, conversations } = useMessaging();

  const [title, setTitle] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await messagingApi.getMessages(convId);
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [convId]);

  useEffect(() => {
    setActiveConversationId(convId);
    load();
    messagingApi.markRead(convId).then(() => refreshConversations()).catch(() => {});
    return () => setActiveConversationId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId]);

  // Try to derive a title from the conversation list (already loaded in the
  // messaging context by the time this screen is reached in the normal flow).
  useEffect(() => {
    const cv = conversations.find((c2) => c2.conversation_id === convId);
    if (cv) setTitle(cv.title);
  }, [conversations, convId]);

  useEffect(() => {
    const unsubscribe = subscribeToMessages(convId, (message) => {
      setMessages((prev) => (prev.some((m) => m.message_id === message.message_id) ? prev : [...prev, message]));
      messagingApi.markRead(convId, message.message_id).catch(() => {});
    });
    return unsubscribe;
  }, [convId, subscribeToMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const pickFile = () => fileInputRef.current?.click();
  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ok = ACCEPTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!ok) {
      // eslint-disable-next-line no-alert
      alert('File type not supported');
      e.target.value = '';
      return;
    }
    setFile(f);
    e.target.value = '';
  };

  const send = async () => {
    const body = text.trim();
    if (!body && !file) return;
    setSending(true);
    try {
      const msg = await messagingApi.sendMessage(convId, body, file);
      setMessages((prev) => (prev.some((m) => m.message_id === msg.message_id) ? prev : [...prev, msg]));
      setText('');
      setFile(null);
      refreshConversations();
    } catch {
      // eslint-disable-next-line no-alert
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.25, borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
        <IconButton size="small" onClick={() => navigate('/chat')}><ArrowBackIcon /></IconButton>
        <Typography sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title || 'Conversation'}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={22} /></Box>
        ) : messages.length === 0 ? (
          <Typography sx={{ color: c.muted, fontSize: 13, textAlign: 'center', mt: 2 }}>
            No messages yet. Say hello!
          </Typography>
        ) : (
          messages.map((msg) => {
            const mine = msg.sender_user_id === currentUserId;
            return (
              <Box key={msg.message_id} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <Box sx={{ maxWidth: '78%' }}>
                  <Box sx={{
                    bgcolor: mine ? c.primary : c.surface, color: mine ? '#fff' : c.text,
                    borderRadius: 2, px: 1.25, py: 0.75, fontSize: 14, wordBreak: 'break-word',
                  }}>
                    {msg.body}
                    {msg.attachment_filename && <Attachment conversationId={convId} message={msg} mine={mine} />}
                  </Box>
                  <Typography sx={{ fontSize: 10, color: c.muted, mt: 0.25, textAlign: mine ? 'right' : 'left' }}>
                    {formatTime(msg.created_at)}
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
        <div ref={bottomRef} />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.75, p: 1, borderTop: `1px solid ${c.border}`, flexShrink: 0 }}>
        <input ref={fileInputRef} type="file" hidden onChange={onFileChange} accept={ACCEPTED_EXTENSIONS.join(',')} />
        <IconButton size="small" onClick={pickFile}><AttachFileIcon fontSize="small" /></IconButton>
        <Box sx={{ flex: 1 }}>
          {file && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, fontSize: 12, color: c.muted }}>
              <InsertDriveFileIcon fontSize="small" /> {file.name}
              <Box component="span" onClick={() => setFile(null)} sx={{ cursor: 'pointer', ml: 0.5, color: c.danger }}>✕</Box>
            </Box>
          )}
          <TextField
            size="small" fullWidth multiline maxRows={4} placeholder="Message..."
            value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown}
          />
        </Box>
        <IconButton size="small" color="primary" disabled={sending || (!text.trim() && !file)} onClick={send}>
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
