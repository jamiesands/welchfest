// Shared helpers for WelchFest direction mocks.
// Phone, IdentityCard, swatches, and a reasonable list of guest data.

const PHONE_W = 320;
const PHONE_H = 680;
const CARD_W = 460;

// A guest data pool that each direction can dip into (consistent across mocks
// makes the variation feel like 'same product, different identity').
const GUESTS = [
  { name: 'Marta K.',    depot: 'Duxford' },
  { name: 'Sully',       depot: 'Bedford' },
  { name: 'Reece D.',    depot: 'St Ives' },
  { name: 'Iqbal',       depot: 'Duxford' },
  { name: 'Pat M.',      depot: 'Bedford' },
  { name: 'Hannah W.',   depot: 'St Ives' },
  { name: 'Joel',        depot: 'Duxford' },
  { name: 'Nadia',       depot: 'Bedford' },
  { name: 'Tomek',       depot: 'St Ives' },
  { name: 'Beth O.',     depot: 'Duxford' },
  { name: 'Maxine',      depot: 'Bedford' },
  { name: 'Dele',        depot: 'St Ives' },
];

const MOMENTS_FEED = [
  { type: 'photo', who: 'Sully',     where: 'Bedford', t: '20:14', cap: 'Convoy in.' },
  { type: '360',   who: 'Marta K.',  where: 'Duxford', t: '20:21', cap: 'Whole yard. Spin it.' },
  { type: 'photo', who: 'Reece D.',  where: 'St Ives', t: '20:33', cap: 'New guy survived round 1.' },
  { type: 'photo', who: 'Beth O.',   where: 'Duxford', t: '20:41', cap: '' },
  { type: 'photo', who: 'Iqbal',     where: 'Duxford', t: '20:55', cap: 'Dispatch took the floor.' },
  { type: '360',   who: 'Joel',      where: 'Duxford', t: '21:02', cap: '' },
];

// A simple striped placeholder for "guest photo" — keeps mocks honest about not
// having real imagery. Every direction skins it differently.
function PhotoTile({ tone = ['#d6cfbf', '#ece5d3'], label = '', children, style }) {
  const [a, b] = tone;
  return (
    <div style={{
      position: 'relative',
      background: `repeating-linear-gradient(45deg, ${a} 0 8px, ${b} 8px 16px)`,
      overflow: 'hidden',
      ...style,
    }}>
      {label && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.08em',
          color: 'rgba(0,0,0,0.45)', textTransform: 'uppercase', textAlign: 'center', padding: 8,
        }}>{label}</div>
      )}
      {children}
    </div>
  );
}

// 360° marker corner overlay — every direction can use it on a tile.
function ThreeSixtyBadge({ color = '#1a1a1a', bg = '#fff', style }) {
  return (
    <div style={{
      position: 'absolute', top: 8, left: 8, padding: '2px 6px', borderRadius: 3,
      background: bg, color, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 600,
      letterSpacing: '0.04em', ...style,
    }}>360°</div>
  );
}

// A device-shape wrapper: rounded card, soft inner shadow, status bar slot,
// home indicator. Each direction passes its own background + status bar tone.
function Phone({ children, statusTone = 'dark', bg = '#fff', notchTone = '#0a0a0a', style }) {
  const fg = statusTone === 'dark' ? '#0a0a0a' : '#f6f4ef';
  return (
    <div style={{
      width: PHONE_W, height: PHONE_H,
      background: bg,
      borderRadius: 36,
      overflow: 'hidden',
      position: 'relative',
      boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 18px 50px -20px rgba(0,0,0,0.25)',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: fg,
      display: 'flex', flexDirection: 'column',
      ...style,
    }}>
      {/* Status bar */}
      <div style={{
        flex: '0 0 auto', height: 36, padding: '10px 22px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
        color: fg, fontFamily: 'system-ui, sans-serif',
        position: 'relative', zIndex: 2,
      }}>
        <span>21:04</span>
        <div style={{
          position: 'absolute', left: '50%', top: 8, transform: 'translateX(-50%)',
          width: 88, height: 22, background: notchTone, borderRadius: 12,
        }} />
        <span style={{ display: 'flex', gap: 4, alignItems: 'center', opacity: 0.9 }}>
          <span style={{ fontSize: 10 }}>●●●○</span>
          <span style={{ fontSize: 10 }}>5G</span>
          <span style={{
            display: 'inline-block', width: 20, height: 9,
            border: `1px solid ${fg}`, borderRadius: 2, position: 'relative',
          }}>
            <span style={{
              position: 'absolute', inset: 1, right: '30%', background: fg, borderRadius: 1,
            }} />
          </span>
        </span>
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {children}
      </div>
      {/* Home indicator */}
      <div style={{ flex: '0 0 auto', height: 22, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 6 }}>
        <div style={{ width: 110, height: 4, background: statusTone === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)', borderRadius: 2 }} />
      </div>
    </div>
  );
}

// Identity spec card — left column for each direction.
function IdentityCard({
  number, name, concept, palette, typePair, motif, why,
  bg = '#fbf9f3', fg = '#1a1814', accentBg = '#1a1814', accentFg = '#fbf9f3',
  displayFont, bodyFont,
  signature, // a tiny chrome graphic that previews the motif
}) {
  return (
    <div style={{
      width: CARD_W, height: PHONE_H,
      background: bg, color: fg,
      padding: 28, boxSizing: 'border-box',
      borderRadius: 16,
      display: 'flex', flexDirection: 'column', gap: 18,
      boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 18px 50px -20px rgba(0,0,0,0.18)',
      fontFamily: bodyFont || 'Inter, system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 14,
        borderBottom: `1px solid ${fg}22`, paddingBottom: 14,
      }}>
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600,
          padding: '4px 8px', background: accentBg, color: accentFg, borderRadius: 4,
          letterSpacing: '0.06em',
        }}>{number}</div>
        <div style={{
          fontFamily: displayFont || 'Inter Tight, sans-serif',
          fontSize: 30, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em',
        }}>{name}</div>
      </div>

      <div style={{ fontSize: 15, lineHeight: 1.45, fontWeight: 500, color: fg }}>
        {concept}
      </div>

      {signature && (
        <div style={{
          flex: '0 0 auto', height: 72, borderRadius: 8,
          background: accentBg, color: accentFg, overflow: 'hidden', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{signature}</div>
      )}

      <div>
        <SpecHead>Palette</SpecHead>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${palette.length}, 1fr)`, gap: 6 }}>
          {palette.map((p, i) => (
            <div key={i}>
              <div style={{ background: p.hex, height: 36, borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }} />
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8.5, marginTop: 4, color: fg, opacity: 0.85, lineHeight: 1.2 }}>
                {p.hex}<br /><span style={{ opacity: 0.65 }}>{p.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SpecHead>Type</SpecHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: displayFont, fontSize: 24, lineHeight: 1, letterSpacing: '-0.01em', fontWeight: 700 }}>
            {typePair.display.name}
          </div>
          <div style={{ fontFamily: bodyFont, fontSize: 13, lineHeight: 1.3, opacity: 0.85 }}>
            {typePair.body.name} · The cargo of the night, all 147 moments of it.
          </div>
        </div>
      </div>

      <div>
        <SpecHead>Signature motif</SpecHead>
        <div style={{ fontSize: 13, lineHeight: 1.4, opacity: 0.88 }}>{motif}</div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: `1px solid ${fg}22`, fontSize: 12, lineHeight: 1.45, fontStyle: 'italic', opacity: 0.8 }}>
        {why}
      </div>
    </div>
  );
}

function SpecHead({ children }) {
  return <div style={{
    fontFamily: 'IBM Plex Mono, monospace', fontSize: 9.5, letterSpacing: '0.18em',
    textTransform: 'uppercase', opacity: 0.55, marginBottom: 6, fontWeight: 600,
  }}>{children}</div>;
}

// Welch Group mark.
// mode="mask"  → tints the mark with `color` via CSS mask-image (good for stamps,
//                ink-on-paper treatments, anywhere we want the mark in a single tone).
// mode="real"  → uses the original full-colour PNG.
// mode="shape" → uses the white-on-transparent variant for dark backgrounds.
function WelchMark({ size = 32, color = '#1e1b16', style, mode = 'mask' }) {
  const src = mode === 'shape' ? 'assets/welch-shape.png' : 'assets/welch-mark.png';
  if (mode === 'real') {
    return <img src={src} alt="Welch Group" width={size} height={size} style={{ display: 'block', ...style }} />;
  }
  if (mode === 'shape') {
    return <img src={src} alt="Welch Group" width={size} height={size} style={{ display: 'block', ...style }} />;
  }
  return (
    <div style={{
      width: size, height: size,
      background: color,
      WebkitMaskImage: 'url(assets/welch-mark.png)',
      maskImage: 'url(assets/welch-mark.png)',
      WebkitMaskSize: 'contain', maskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center', maskPosition: 'center',
      flexShrink: 0,
      ...style,
    }} />
  );
}

// 360° spin indicator (used on a tile)
function SpinIcon({ size = 14, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="12" rx="9" ry="4" stroke={color} strokeWidth="1.5"/>
      <path d="M12 5 L12 19" stroke={color} strokeWidth="1.5" strokeDasharray="2 2"/>
    </svg>
  );
}

Object.assign(window, { PHONE_W, PHONE_H, CARD_W, GUESTS, MOMENTS_FEED, Phone, IdentityCard, SpecHead, PhotoTile, ThreeSixtyBadge, SpinIcon, WelchMark });
