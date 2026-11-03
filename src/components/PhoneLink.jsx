import React from 'react';
import { Box, Link } from '@mui/material';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import { colors as c } from '../theme';

/**
 * Tap-to-call (and tap-to-text). Every phone number shown anywhere in this
 * app should go through this component (not a plain <Typography>) -- the
 * whole point of a phone-first field app per the original CRM_MOBILE_PLAN.md
 * is one-tap dialing/texting, not just a readable number.
 *
 * Two separate tap targets, not one combined link: there's no single URI
 * scheme that offers "call or text" as a choice on mobile web, so the
 * number itself is a tel: link and a small sms: icon sits next to it for
 * texting (AI-A task #433, 2026-11-03). sms: is handled only by the
 * device's native SMS app -- WhatsApp does not register as an sms: handler
 * (it uses its own wa.me/whatsapp:// scheme), so this never raises a
 * WhatsApp-vs-SMS picker, only an app-picker if the device has more than
 * one real SMS app installed.
 */
export default function PhoneLink({ value, sx }) {
  if (!value) return null;
  const digits = String(value).replace(/[^\d+]/g, '');
  if (!digits) return null;
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
      <Link
        href={`tel:${digits}`}
        underline="hover"
        onClick={(e) => e.stopPropagation()}
        sx={{ color: c.primary, fontWeight: 500, ...sx }}
      >
        {value}
      </Link>
      <Link
        href={`sms:${digits}`}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Text ${value}`}
        sx={{ color: c.muted, display: 'inline-flex', lineHeight: 0 }}
      >
        <SmsOutlinedIcon sx={{ fontSize: (sx && sx.fontSize) || 14 }} />
      </Link>
    </Box>
  );
}
