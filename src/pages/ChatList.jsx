import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, List, ListItemButton, ListItemAvatar, ListItemText, Avatar, Badge,
  IconButton, CircularProgress, Dialog, DialogTitle, DialogContent, TextField, ListItem,
} from '@mui/material';
import AddCommentIcon from '@mui/icons-material/AddComment';
import ForumIcon from '@mui/icons-material/Forum';
import { useNavigate } from 'react-router-dom';
import { colors as c } from '../theme';
import { useMessaging } from '../contexts/MessagingContext';
import messagingApi from '../api/messagingApi';

function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || name[0].toUpperCase();
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatList() {
  const navigate = useNavigate();
  const { conversations, loadingConversations, refreshConversations, onlineUserIds, currentUserId } = useMessaging();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { refreshConversations(); }, [refreshConversations]);

  const openPicker = useCallback(async () => {
    setPickerOpen(true);
    try {
      const data = await messagingApi.listUsers();
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    }
  }, []);

  const startChat = useCallback(async (userId) => {
    setCreating(true);
    try {
      const convo = await messagingApi.createConversation({ type: 'direct', participantIds: [userId] });
      setPickerOpen(false);
      refreshConversations();
      if (convo?.conversation_id) navigate(`/chat/${convo.conversation_id}`);
    } catch {
      // eslint-disable-next-line no-alert
      alert('Failed to start conversation');
    } finally {
      setCreating(false);
    }
  }, [navigate, refreshConversations]);

  const filteredUsers = users.filter((u) =>
    !userSearch.trim() || (u.name || u.email || '').toLowerCase().includes(userSearch.trim().toLowerCase()));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
        <Typography sx={{ fontWeight: 700, flex: 1 }}>Messages</Typography>
        <IconButton size="small" onClick={openPicker}><AddCommentIcon /></IconButton>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loadingConversations && conversations.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={28} /></Box>
        ) : conversations.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.6, p: 2 }}>
            <ForumIcon sx={{ fontSize: 36, color: c.muted, mb: 1 }} />
            <Typography sx={{ color: c.muted, fontSize: 13, textAlign: 'center' }}>
              No conversations yet. Tap + to start one.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {conversations.map((cv) => {
              const other = cv.type === 'direct'
                ? (cv.participants || []).find((p) => p.user_id !== currentUserId)
                : null;
              const online = other ? onlineUserIds.includes(other.user_id) : false;
              const lm = cv.last_message;
              const lmText = lm ? (lm.body || (lm.attachment_original_name ? `📎 ${lm.attachment_original_name}` : '')) : '';
              const preview = lm ? `${lm.sender_user_id === currentUserId ? 'You: ' : ''}${lmText}` : 'No messages yet';
              return (
                <ListItemButton key={cv.conversation_id} divider onClick={() => navigate(`/chat/${cv.conversation_id}`)} sx={{ py: 1 }}>
                  <ListItemAvatar>
                    <Badge
                      overlap="circular" variant="dot" invisible={cv.type !== 'direct'}
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      sx={{ '& .MuiBadge-dot': { bgcolor: online ? '#4caf50' : c.border } }}
                    >
                      <Avatar sx={{ width: 36, height: 36, fontSize: 14, bgcolor: c.primary }}>{initials(cv.title)}</Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={cv.title}
                    secondary={preview}
                    primaryTypographyProps={{ fontWeight: cv.unread_count ? 700 : 500, noWrap: true }}
                    secondaryTypographyProps={{ fontSize: 12, noWrap: true, sx: { color: c.muted } }}
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', ml: 1, minWidth: 36 }}>
                    <Typography sx={{ fontSize: 10, color: c.muted }}>
                      {formatTime(cv.last_message?.created_at || cv.last_message_at)}
                    </Typography>
                    {cv.unread_count > 0 && (
                      <Box sx={{ mt: 0.5, bgcolor: c.primary, color: '#fff', borderRadius: 8, px: 0.75, fontSize: 11, fontWeight: 700, lineHeight: '18px', minWidth: 18, textAlign: 'center' }}>
                        {cv.unread_count}
                      </Box>
                    )}
                  </Box>
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>

      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Start a conversation</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ px: 2, pt: 1, pb: 1 }}>
            <TextField
              size="small" fullWidth autoFocus placeholder="Search people..."
              value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
            />
          </Box>
          <List dense sx={{ maxHeight: 360, overflow: 'auto' }}>
            {filteredUsers.map((u) => (
              <ListItemButton key={u.user_id} disabled={creating} onClick={() => startChat(u.user_id)}>
                <ListItemAvatar>
                  <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: c.primary }}>{initials(u.name || u.email)}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={u.name || u.email} secondary={u.name ? u.email : null} />
              </ListItemButton>
            ))}
            {filteredUsers.length === 0 && (
              <ListItem><ListItemText primary="No matching users" sx={{ color: c.muted, textAlign: 'center' }} /></ListItem>
            )}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
