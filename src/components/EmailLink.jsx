import React from 'react';
import { Link } from '@mui/material';
import { colors as c } from '../theme';
import { getAiwDesktopOrigin } from '../config';

/**
 * Tap-to-compose. This app doesn't have its own email compose UI (that
 * stays desktop-only, same reasoning as skipping Supply Intel here) -- an
 * email address opens AIW desktop's existing `/email/compose` page in a new
 * tab instead, pre-filled with `to`. The desktop origin is same-site (same
 * host, sibling port) so the shared AIW login cookie carries over and the
 * compose page just works without a second sign-in.
 */
export default function EmailLink({ value, partyId, contactId, sx }) {
  if (!value) return null;
  const openCompose = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const params = new URLSearchParams({ to: value });
    if (partyId) params.set('crm_party_id', String(partyId));
    if (contactId) params.set('crm_contact_id', String(contactId));
    window.open(`${getAiwDesktopOrigin()}/email/compose?${params}`, '_blank');
  };
  return (
    <Link href="#" underline="hover" onClick={openCompose} sx={{ color: c.primary, fontWeight: 500, ...sx }}>
      {value}
    </Link>
  );
}
