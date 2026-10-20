import React from 'react';
import { Link } from '@mui/material';
import { colors as c } from '../theme';

/**
 * Tap-to-call. Every phone number shown anywhere in this app should go
 * through this component (not a plain <Typography>) -- the whole point of
 * a phone-first field app per the original CRM_MOBILE_PLAN.md is one-tap
 * dialing, not just a readable number.
 */
export default function PhoneLink({ value, sx }) {
  if (!value) return null;
  const digits = String(value).replace(/[^\d+]/g, '');
  if (!digits) return null;
  return (
    <Link
      href={`tel:${digits}`}
      underline="hover"
      onClick={(e) => e.stopPropagation()}
      sx={{ color: c.primary, fontWeight: 500, ...sx }}
    >
      {value}
    </Link>
  );
}
