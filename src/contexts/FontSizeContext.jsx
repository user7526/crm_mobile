import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const FONT_SIZE_KEY = 'crmMobile_fontSize';
export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 26;
export const DEFAULT_FONT_SIZE = 14;

// Mirrors tdw_email's FontSizeContext.jsx (which itself mirrors
// ai_assistant's) -- same key shape, same bounds, same fs()/fsPx() pattern,
// just this app's own localStorage key so the setting is per-PWA, not
// shared (each is a separate home-screen icon/origin). Requested 2026-11-03
// ("same font size controls ... as the others").
//
// SCALE_BOOST exists as the same escape hatch tdw_email used when its own
// hardcoded literals ran smaller than AIW's equivalent text -- left at 1
// (no-op) here since crm_mobile's literals haven't been tuned against
// anything yet. Bump it later if a side-by-side comparison says this app's
// text reads small even at the slider's defaults.
const SCALE_BOOST = 1;

const FontSizeContext = createContext();

/**
 * Hook to read/adjust the app-wide base font size. The value feeds
 * `typography.fontSize` in the MUI theme (see App.jsx), which scales all
 * `rem`-based MUI component sizing without needing a per-component sweep.
 *
 * `fs`/`fsPx` are scaling helpers for literal sx-level font-size overrides,
 * which (unlike MUI variant text like `variant="body2"`) do NOT
 * automatically scale with `theme.typography.fontSize` -- that only drives
 * MUI's own coefficient (`fontSize / 14`) for its predefined variants. Any
 * hardcoded `fontSize: 14` (or similar) in this app should go through one
 * of these instead of a bare literal, so the font-size setting actually
 * affects it too.
 *   fs(remBase)  -> `${remBase * coef}rem`  -- pass the rem number you'd have hardcoded.
 *   fsPx(pxBase) -> `${pxBase * coef}px`    -- pass the px number you'd have hardcoded.
 *
 * Returns { fontSize, setFontSize, MIN_FONT_SIZE, MAX_FONT_SIZE, DEFAULT_FONT_SIZE, fs, fsPx }
 */
export const useFontSize = () => {
  const ctx = useContext(FontSizeContext);
  if (!ctx) throw new Error('useFontSize must be used within a FontSizeProvider');
  return ctx;
};

export const FontSizeProvider = ({ children }) => {
  const [fontSize, setFontSize] = useState(() => {
    const stored = localStorage.getItem(FONT_SIZE_KEY);
    return stored ? Number(stored) : DEFAULT_FONT_SIZE;
  });

  useEffect(() => {
    localStorage.setItem(FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  const coef = (fontSize / DEFAULT_FONT_SIZE) * SCALE_BOOST;
  const fs = useCallback((remBase) => `${remBase * coef}rem`, [coef]);
  const fsPx = useCallback((pxBase) => `${pxBase * coef}px`, [coef]);

  const value = useMemo(
    () => ({ fontSize, setFontSize, MIN_FONT_SIZE, MAX_FONT_SIZE, DEFAULT_FONT_SIZE, fs, fsPx }),
    [fontSize, fs, fsPx]
  );

  return (
    <FontSizeContext.Provider value={value}>
      {children}
    </FontSizeContext.Provider>
  );
};
