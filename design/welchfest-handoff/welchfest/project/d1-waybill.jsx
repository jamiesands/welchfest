// Direction 1 — WAYBILL (v2 · Welch brand applied)
// Concept: Photos as cargo. Memories on a manifest.
// Now incorporating the Welch Group mark and Welch blue as the brand accent.
// Six screens: Join, Live feed, Memento, Jukebox, DJ tablet (dark), Big-screen
// wall (landscape).

const WB = {
  paper:    '#efe8d4',
  card:     '#f7f1de',
  cardDeep: '#e8dfc4',
  ink:      '#1e1b16',
  rule:     '#1e1b16',
  blue:     '#2275b3',   // Welch blue (brand primary)
  blueDeep: '#164b75',   // Welch blue deep
  blueSoft: '#cfe1ee',
  carbon:   '#b8412a',   // stamp red — reserved for RECEIVED
  olive:    '#384a2f',
  faded:    '#7b7367',
  mono:     'IBM Plex Mono, ui-monospace, monospace',
  sans:     'IBM Plex Sans, system-ui, sans-serif',
};

function WBStamp({ children, color = WB.carbon, rotate = -6, style }) {
  return (
    <div style={{
      display: 'inline-block', border: `2px solid ${color}`, color, padding: '4px 10px',
      borderRadius: 4, fontFamily: WB.mono, fontWeight: 700, fontSize: 11,
      letterSpacing: '0.18em', textTransform: 'uppercase', transform: `rotate(${rotate}deg)`,
      background: `${color}11`, lineHeight: 1, ...style,
    }}>{children}</div>
  );
}

function WBPerfBar({ color = WB.ink, opacity = 0.4 }) {
  return (
    <svg width="100%" height="6" viewBox="0 0 200 6" preserveAspectRatio="none" style={{ display: 'block', opacity }}>
      <line x1="0" y1="3" x2="200" y2="3" stroke={color} strokeWidth="1" strokeDasharray="3 3"/>
    </svg>
  );
}

function WBLabel({ children, style, color = WB.faded }) {
  return <div style={{
    fontFamily: WB.mono, fontSize: 9, letterSpacing: '0.18em',
    textTransform: 'uppercase', color, fontWeight: 600, ...style,
  }}>{children}</div>;
}

// A round "stamp ring" wrapping the mark — like a postmark.
function WBPostmark({ children, color = WB.blue, size = 86, rotate = -4 }) {
  return (
    <div style={{
      position: 'relative', width: size, height: size, transform: `rotate(${rotate}deg)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <path id="wbring" d="M 50,50 m -42,0 a 42,42 0 1,1 84,0 a 42,42 0 1,1 -84,0"/>
        </defs>
        <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="1.2"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke={color} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.7"/>
        <text fontFamily="IBM Plex Mono" fontSize="6" letterSpacing="3" fill={color} fontWeight="600">
          <textPath href="#wbring" startOffset="0">
            WELCH GROUP · DISPATCH · WELCHFEST · MMXXV ·
          </textPath>
        </text>
      </svg>
      <div style={{ width: size * 0.46, height: size * 0.46, position: 'relative' }}>
        <WelchMark size={size * 0.46} color={color} />
      </div>
    </div>
  );
}

function WBLetterhead({ subtitle = 'Dispatch Note', code = 'Form W/MEM-25', date = '22·08·25' }) {
  return (
    <div style={{ padding: '12px 18px 10px', borderBottom: `1.5px solid ${WB.ink}`, background: WB.card }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <WelchMark size={26} color={WB.blue} />
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: WB.mono, fontWeight: 700, fontSize: 9.5, letterSpacing: '0.32em',
            color: WB.ink, marginBottom: 2,
          }}>WELCH GROUP · EST. 1934</div>
          <div style={{
            fontFamily: WB.sans, fontWeight: 700, fontSize: 19, lineHeight: 1, letterSpacing: '-0.01em',
          }}>{subtitle}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <WBLabel>{code}</WBLabel>
          <div style={{ fontFamily: WB.mono, fontSize: 10, marginTop: 2 }}>{date}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Identity ─────────────────────────────────────────────────────────────
function WaybillIdentity() {
  return (
    <IdentityCard
      number="01 / 06"
      name="Waybill"
      concept="Photos as cargo. Memories logged like freight. The Welch mark sits where it belongs — top-left of every page, like a real form."
      bg={WB.paper}
      fg={WB.ink}
      accentBg={WB.blueDeep}
      accentFg={WB.paper}
      displayFont="IBM Plex Sans, sans-serif"
      bodyFont="IBM Plex Sans, sans-serif"
      palette={[
        { hex: '#efe8d4', role: 'paper' },
        { hex: '#1e1b16', role: 'ink' },
        { hex: '#2275b3', role: 'Welch blue' },
        { hex: '#164b75', role: 'deep' },
        { hex: '#b8412a', role: 'stamp red' },
        { hex: '#384a2f', role: 'seal' },
      ]}
      typePair={{
        display: { name: 'IBM Plex Sans Bold' },
        body:    { name: 'IBM Plex Mono / Plex Sans' },
      }}
      motif="The mark is treated like a brand stamp — appears in postmarks, letterhead, watermarks. Welch blue is the brand voice; stamp red is reserved for ceremony (RECEIVED, USED, FILED)."
      why="The mark is the company's signature on paperwork going back decades. Putting it on a dispatch-note-shaped party app lands instantly — and the brand-blue makes it unmistakably Welch."
      signature={
        <div style={{
          width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
          background: WB.ink, color: WB.paper, padding: 12, boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <WelchMark size={44} color={WB.blue} />
            <div>
              <div style={{ fontFamily: WB.mono, fontSize: 9, letterSpacing: '0.2em', opacity: 0.6 }}>MANIFEST №</div>
              <div style={{ fontFamily: WB.mono, fontSize: 18, fontWeight: 600, letterSpacing: '0.08em' }}>WF·000147</div>
            </div>
          </div>
          <WBStamp color={WB.carbon} rotate={4} style={{ background: 'transparent' }}>RECEIVED</WBStamp>
        </div>
      }
    />
  );
}

// ─── Screen A — Join ──────────────────────────────────────────────────────
function WaybillJoin() {
  return (
    <Phone bg={WB.paper} statusTone="dark" notchTone={WB.ink}>
      <div style={{ padding: 0, fontFamily: WB.sans, color: WB.ink, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <WBLetterhead />
        <div style={{ padding: '14px 18px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <WBLabel style={{ marginBottom: 6 }}>Document Title</WBLabel>
              <div style={{
                fontFamily: WB.sans, fontSize: 25, fontWeight: 700, lineHeight: 1.04, letterSpacing: '-0.02em',
              }}>Manifest of<br/>Memories</div>
              <div style={{ fontFamily: WB.mono, fontSize: 10, marginTop: 6, color: WB.faded, letterSpacing: '0.06em' }}>
                Welchfest · 22 Aug 2025 · The Drift
              </div>
            </div>
            <WBPostmark color={WB.blue} size={76} rotate={-6} />
          </div>

          <div style={{ height: 1, background: WB.ink, opacity: 0.2, margin: '14px 0' }} />

          <WBLabel style={{ marginBottom: 6 }}>01 · Consignee</WBLabel>
          <div style={{
            borderBottom: `1.5px solid ${WB.ink}`, paddingBottom: 5, marginBottom: 12,
            fontFamily: WB.sans, fontSize: 18, fontWeight: 500,
          }}>
            Marta Kowalska
            <span style={{ borderRight: `1.5px solid ${WB.blue}`, marginLeft: 2, animation: 'wbcaret 1s steps(1) infinite' }}>&nbsp;</span>
          </div>

          <WBLabel style={{ marginBottom: 8 }}>02 · Origin Depot</WBLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
            {[
              { d: 'Duxford', n: 'DXF', sel: true },
              { d: 'Bedford', n: 'BED', sel: false },
              { d: 'St Ives', n: 'STI', sel: false },
            ].map(o => (
              <div key={o.d} style={{
                border: `1.5px solid ${WB.ink}`, padding: '8px 6px',
                background: o.sel ? WB.ink : 'transparent', color: o.sel ? WB.paper : WB.ink,
                position: 'relative',
              }}>
                <div style={{ fontFamily: WB.mono, fontSize: 9, opacity: 0.7, letterSpacing: '0.1em' }}>CODE</div>
                <div style={{ fontFamily: WB.mono, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', marginTop: 2, color: o.sel ? WB.blueSoft : WB.blue }}>{o.n}</div>
                <div style={{ fontFamily: WB.sans, fontSize: 11, marginTop: 4 }}>{o.d}</div>
                {o.sel && (
                  <div style={{ position: 'absolute', top: 4, right: 4, fontFamily: WB.mono, fontSize: 10, color: WB.blue }}>✕</div>
                )}
              </div>
            ))}
          </div>

          <WBLabel style={{ marginBottom: 6 }}>03 · Acknowledgement</WBLabel>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 14, height: 14, border: `1.5px solid ${WB.ink}`, marginTop: 1, position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', left: 1, top: -3, fontSize: 16, fontFamily: WB.mono, color: WB.blue }}>✓</div>
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.4 }}>
              I consent to my likeness being entered into the official manifest.
              Light moderation applies. Copy retained: <span style={{ color: WB.blue, fontWeight: 600 }}>Guest</span>.
            </div>
          </div>

          <div style={{ marginTop: 'auto', marginBottom: 12 }}>
            <div style={{
              background: WB.blueDeep, color: WB.paper, padding: '13px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontFamily: WB.mono, letterSpacing: '0.18em', fontSize: 12, fontWeight: 600,
            }}>
              <span>SIGN &amp; ENTER</span>
              <span>→</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: WB.mono, fontSize: 9, color: WB.faded, letterSpacing: '0.1em' }}>
              <span>FILE COPY · GUEST</span>
              <span>REV. 04</span>
            </div>
          </div>
        </div>
        <style>{`@keyframes wbcaret{50%{opacity:0}}`}</style>
      </div>
    </Phone>
  );
}

// ─── Screen B — Live feed ─────────────────────────────────────────────────
function WaybillFeed() {
  const entries = [
    { n: 147, t: '21:04', who: 'Sully',     dep: 'BED', kind: 'PHOTO', tone: ['#cbb89b','#d8c8a8'], cap: 'Convoy in.' },
    { n: 146, t: '21:02', who: 'Joel',      dep: 'DXF', kind: '360°',  tone: ['#a8b0a4','#bcc4b8'], cap: '' },
    { n: 145, t: '20:55', who: 'Iqbal',     dep: 'DXF', kind: 'PHOTO', tone: ['#c2a08a','#d4b29d'], cap: 'Dispatch took the floor.' },
    { n: 144, t: '20:41', who: 'Beth O.',   dep: 'DXF', kind: 'PHOTO', tone: ['#9ea4b0','#b4bac6'], cap: '' },
    { n: 143, t: '20:33', who: 'Reece D.',  dep: 'STI', kind: 'PHOTO', tone: ['#b89a73','#cbb087'], cap: 'New guy survived round 1.' },
  ];
  return (
    <Phone bg={WB.paper} statusTone="dark" notchTone={WB.ink}>
      <div style={{ fontFamily: WB.sans, color: WB.ink, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px 12px', borderBottom: `1.5px solid ${WB.ink}`, background: WB.card, display: 'flex', alignItems: 'center', gap: 10 }}>
          <WelchMark size={28} color={WB.blue} />
          <div style={{ flex: 1 }}>
            <WBLabel>Manifest in progress</WBLabel>
            <div style={{ fontFamily: WB.sans, fontWeight: 700, fontSize: 18, lineHeight: 1, marginTop: 2 }}>Tonight's log</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <WBLabel>Units</WBLabel>
            <div style={{ fontFamily: WB.mono, fontSize: 22, fontWeight: 700, lineHeight: 1, marginTop: 2, color: WB.blueDeep }}>147</div>
          </div>
        </div>
        <div style={{ display: 'flex', borderBottom: `1.5px solid ${WB.ink}`, fontFamily: WB.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {['All','Photo','360°','Mine'].map((t,i) => (
            <div key={t} style={{
              flex: 1, textAlign: 'center', padding: '8px 0',
              background: i===0 ? WB.ink : 'transparent', color: i===0 ? WB.paper : WB.ink,
              borderRight: i<3 ? `1.5px solid ${WB.ink}` : 'none', fontWeight: 600,
            }}>{t}</div>
          ))}
        </div>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {entries.map((e, i) => (
            <div key={e.n} style={{ display: 'flex', borderBottom: `1px dashed ${WB.ink}44`, padding: '10px 12px', alignItems: 'flex-start', gap: 10, background: i===0 ? '#fffaeb55' : 'transparent' }}>
              <div style={{ width: 36, flexShrink: 0 }}>
                <div style={{ fontFamily: WB.mono, fontSize: 9, color: WB.faded, letterSpacing: '0.1em' }}>NO.</div>
                <div style={{ fontFamily: WB.mono, fontSize: 14, fontWeight: 700 }}>{String(e.n).padStart(3,'0')}</div>
              </div>
              <PhotoTile tone={e.tone} style={{ width: 64, height: 64, borderRadius: 2, border: `1px solid ${WB.ink}33`, flexShrink: 0 }}>
                {e.kind === '360°' && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SpinIcon size={24} color="#fff" />
                  </div>
                )}
              </PhotoTile>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: WB.mono, fontSize: 9, color: WB.faded, letterSpacing: '0.06em' }}>
                  <span>{e.t}</span>
                  <span style={{ color: e.kind === '360°' ? WB.blue : WB.faded, fontWeight: 700 }}>{e.kind}</span>
                </div>
                <div style={{ fontFamily: WB.sans, fontSize: 13, fontWeight: 600, marginTop: 2 }}>{e.who} <span style={{ fontFamily: WB.mono, fontSize: 10, color: WB.blue, marginLeft: 4 }}>{e.dep}</span></div>
                {e.cap && <div style={{ fontSize: 11, marginTop: 2, color: WB.ink, opacity: 0.75, lineHeight: 1.3 }}>{e.cap}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1.5px solid ${WB.ink}`, background: WB.card, display: 'flex', padding: '10px 14px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 18, fontFamily: WB.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            <span style={{ fontWeight: 700, borderBottom: `2px solid ${WB.blueDeep}`, paddingBottom: 2 }}>Manifest</span>
            <span style={{ opacity: 0.55 }}>Songs</span>
            <span style={{ opacity: 0.55 }}>Awards</span>
          </div>
          <div style={{
            background: WB.blueDeep, color: WB.paper, padding: '8px 10px', borderRadius: 4,
            fontFamily: WB.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            boxShadow: `2px 2px 0 ${WB.ink}`,
          }}>+ LOG</div>
        </div>
      </div>
    </Phone>
  );
}

// ─── Screen C — Memento ────────────────────────────────────────────────────
function WaybillMemento() {
  return (
    <Phone bg={WB.paper} statusTone="dark" notchTone={WB.ink}>
      <div style={{ fontFamily: WB.sans, color: WB.ink, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Watermark mark */}
        <div style={{ position: 'absolute', right: -40, bottom: 80, opacity: 0.06, pointerEvents: 'none' }}>
          <WelchMark size={300} color={WB.ink} />
        </div>
        <WBLetterhead subtitle="Final Manifest" code="Vol. 2025·IV" />
        <div style={{ padding: '14px 18px 0', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <WBLabel>Volume</WBLabel>
              <div style={{ fontFamily: WB.sans, fontSize: 28, fontWeight: 700, lineHeight: 0.95, letterSpacing: '-0.02em', marginTop: 2 }}>
                Manifest<br/><span style={{ fontFamily: WB.mono, fontSize: 20, letterSpacing: '0.06em', color: WB.blueDeep }}>2025·IV</span>
              </div>
            </div>
            <WBStamp color={WB.olive} rotate={6}>Delivery<br/>Complete</WBStamp>
          </div>

          <div style={{ margin: '6px 0 12px' }}><WBPerfBar /></div>

          <div style={{ border: `1.5px solid ${WB.ink}`, background: WB.card }}>
            {[
              { l: 'Units logged',  v: '312', s: 'photos + 360°', c: WB.ink },
              { l: 'Songs played',  v: '84',  s: '146 votes cast', c: WB.blueDeep },
              { l: 'Awards issued', v: '06',  s: 'peer-voted', c: WB.ink },
            ].map((r, i, arr) => (
              <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: i < arr.length-1 ? `1px dashed ${WB.ink}55` : 'none' }}>
                <div>
                  <WBLabel>{r.l}</WBLabel>
                  <div style={{ fontSize: 11, color: WB.faded, marginTop: 2 }}>{r.s}</div>
                </div>
                <div style={{ fontFamily: WB.mono, fontSize: 22, fontWeight: 700, color: r.c }}>{r.v}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <WBLabel style={{ marginBottom: 6 }}>Top of the wall</WBLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {[
                ['#cbb89b','#d8c8a8'],['#a8b0a4','#bcc4b8'],['#c2a08a','#d4b29d'],['#9ea4b0','#b4bac6'],
                ['#b89a73','#cbb087'],['#c8b8a4','#dcccb4'],['#a4a098','#bcb8b0'],['#b3a08c','#c8b59e'],
              ].map((t, i) => (
                <PhotoTile key={i} tone={t} style={{ aspectRatio: '1/1', border: `1px solid ${WB.ink}44` }}>
                  <div style={{ position: 'absolute', bottom: 2, left: 3, fontFamily: WB.mono, fontSize: 7, color: 'rgba(0,0,0,0.55)' }}>{String(140+i).padStart(3,'0')}</div>
                </PhotoTile>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto', marginBottom: 12 }}>
            <div style={{
              background: WB.ink, color: WB.paper, padding: '13px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontFamily: WB.mono, letterSpacing: '0.18em', fontSize: 12, fontWeight: 600,
            }}>
              <span>OPEN MANIFEST</span>
              <span style={{ color: WB.blue }}>→</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: WB.mono, fontSize: 9, color: WB.faded, letterSpacing: '0.1em' }}>
              <span>FILED 23·08·25 · 02:47</span>
              <span>VOL. 2025·IV</span>
            </div>
          </div>
        </div>
      </div>
    </Phone>
  );
}

// ─── Screen D — Jukebox (song queue) ──────────────────────────────────────
function WaybillJukebox() {
  const queue = [
    { rank: 1, t: 'Common People',       a: 'Pulp',                  votes: 41, dep: 'BED', mine: true },
    { rank: 2, t: 'Move On Up',          a: 'Curtis Mayfield',       votes: 38, dep: 'DXF' },
    { rank: 3, t: 'Two Tribes',          a: 'Frankie Goes to Hollywood', votes: 27, dep: 'STI' },
    { rank: 4, t: 'Pure Shores',         a: 'All Saints',            votes: 22, dep: 'DXF' },
    { rank: 5, t: 'Free',                a: 'Ultra Naté',            votes: 18, dep: 'BED' },
  ];
  return (
    <Phone bg={WB.paper} statusTone="dark" notchTone={WB.ink}>
      <div style={{ fontFamily: WB.sans, color: WB.ink, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <WBLetterhead subtitle="Loading Sheet" code="Cargo of the night" />

        {/* Now playing */}
        <div style={{ background: WB.blueDeep, color: WB.paper, padding: '14px 16px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 2, background: WB.blue, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)' }}>
              <div style={{
                position: 'absolute', inset: 4,
                background: `repeating-linear-gradient(135deg, ${WB.blueDeep} 0 3px, transparent 3px 6px)`,
              }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: WB.paper, zIndex: 1 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <WBLabel color="rgba(239,232,212,0.55)">Now departing</WBLabel>
              <div style={{ fontFamily: WB.sans, fontSize: 14, fontWeight: 700, marginTop: 2 }}>Move On Up</div>
              <div style={{ fontFamily: WB.mono, fontSize: 10, opacity: 0.7, marginTop: 1 }}>Curtis Mayfield · 02:43 / 09:14</div>
            </div>
            <div style={{ fontFamily: WB.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em' }}>♪♪</div>
          </div>
          {/* Progress */}
          <div style={{ marginTop: 10, height: 2, background: 'rgba(255,255,255,0.18)' }}>
            <div style={{ width: '30%', height: '100%', background: WB.paper }} />
          </div>
        </div>

        {/* Queue header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: `1.5px solid ${WB.ink}` }}>
          <div>
            <WBLabel>Queue · in line</WBLabel>
            <div style={{ fontFamily: WB.sans, fontSize: 14, fontWeight: 700, marginTop: 2 }}>By votes ↓</div>
          </div>
          <div style={{ display: 'flex', gap: 6, fontFamily: WB.mono, fontSize: 9, letterSpacing: '0.12em' }}>
            <span style={{ padding: '3px 7px', border: `1px solid ${WB.ink}`, background: WB.ink, color: WB.paper, fontWeight: 700 }}>VOTES</span>
            <span style={{ padding: '3px 7px', border: `1px solid ${WB.ink}` }}>NEW</span>
          </div>
        </div>

        {/* Queue rows */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {queue.map((s, i) => (
            <div key={s.rank} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: `1px dashed ${WB.ink}33`, gap: 10, background: s.mine ? WB.cardDeep : 'transparent' }}>
              <div style={{ width: 26, flexShrink: 0, fontFamily: WB.mono, fontSize: 16, fontWeight: 700, color: i === 0 ? WB.blueDeep : WB.ink, fontVariantNumeric: 'tabular-nums' }}>
                {String(s.rank).padStart(2,'0')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: WB.sans, fontSize: 13, fontWeight: 600, lineHeight: 1.15 }}>
                  {s.t}
                  {s.mine && <span style={{ fontFamily: WB.mono, fontSize: 8.5, padding: '1px 4px', marginLeft: 6, background: WB.carbon, color: WB.paper, letterSpacing: '0.12em', fontWeight: 700 }}>YOURS</span>}
                </div>
                <div style={{ fontFamily: WB.mono, fontSize: 10, color: WB.faded, marginTop: 1 }}>{s.a} · req. {s.dep}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{ fontFamily: WB.mono, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.votes}</div>
                <div style={{
                  width: 24, height: 24, border: `1.5px solid ${WB.blueDeep}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: WB.mono, fontSize: 14, fontWeight: 700, color: WB.blueDeep,
                  background: s.mine ? WB.blueDeep : 'transparent',
                }}>
                  <span style={{ color: s.mine ? WB.paper : WB.blueDeep }}>↑</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Request bar */}
        <div style={{ borderTop: `1.5px solid ${WB.ink}`, background: WB.card, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, border: `1.5px solid ${WB.ink}`, background: WB.paper, padding: '8px 10px', fontFamily: WB.mono, fontSize: 10, color: WB.faded, letterSpacing: '0.08em' }}>
            Request a track…
          </div>
          <div style={{
            background: WB.blueDeep, color: WB.paper, padding: '8px 10px',
            fontFamily: WB.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            boxShadow: `2px 2px 0 ${WB.ink}`,
          }}>+ ADD</div>
        </div>
      </div>
    </Phone>
  );
}

// ─── Screen E — DJ Tablet (dark mode, landscape) ──────────────────────────
function WaybillDJ() {
  const TABLET_W = 560;
  const TABLET_H = 420;
  const queue = [
    { rank: 1, t: 'Common People',  a: 'Pulp',                   votes: 41, dep: 'BED', dur: '5:51' },
    { rank: 2, t: 'Move On Up',     a: 'Curtis Mayfield',        votes: 38, dep: 'DXF', dur: '9:14', playing: true },
    { rank: 3, t: 'Two Tribes',     a: 'Frankie Goes to H\'wood',votes: 27, dep: 'STI', dur: '8:36' },
    { rank: 4, t: 'Pure Shores',    a: 'All Saints',             votes: 22, dep: 'DXF', dur: '4:23' },
    { rank: 5, t: 'Free',           a: 'Ultra Naté',             votes: 18, dep: 'BED', dur: '7:12' },
    { rank: 6, t: 'A Little Respect', a: 'Erasure',              votes: 15, dep: 'STI', dur: '3:36' },
  ];
  return (
    <div style={{
      width: TABLET_W, height: TABLET_H,
      background: '#0e1116', color: '#e8e3d3', fontFamily: WB.sans,
      borderRadius: 20, overflow: 'hidden', position: 'relative',
      boxShadow: '0 0 0 1px rgba(0,0,0,0.4), 0 18px 50px -20px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#161a22' }}>
        <WelchMark size={28} color={WB.blue} />
        <div style={{ marginLeft: 12 }}>
          <div style={{ fontFamily: WB.mono, fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.55)' }}>DJ CONSOLE · WF·25</div>
          <div style={{ fontFamily: WB.sans, fontWeight: 700, fontSize: 17, marginTop: 2 }}>Tonight's Loading Sheet</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 18, alignItems: 'center', fontFamily: WB.mono, fontSize: 11, letterSpacing: '0.1em' }}>
          <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>QUEUED</span> <span style={{ color: WB.blue, fontWeight: 700, fontSize: 14 }}>84</span></div>
          <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>PLAYED</span> <span style={{ fontWeight: 700, fontSize: 14 }}>27</span></div>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: WB.carbon, boxShadow: `0 0 8px ${WB.carbon}` }} />
          <span style={{ color: WB.carbon, fontWeight: 700 }}>LIVE</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, minHeight: 0 }}>
        {/* Now playing pane */}
        <div style={{ padding: '16px 20px', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: WB.mono, fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.45)' }}>NOW DEPARTING</div>
          <div style={{ fontFamily: WB.sans, fontWeight: 700, fontSize: 24, marginTop: 6, lineHeight: 1.1 }}>Move On Up</div>
          <div style={{ fontFamily: WB.mono, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Curtis Mayfield · req. DXF · 38 votes</div>

          {/* Vinyl placeholder + waveform */}
          <div style={{ marginTop: 14, height: 90, background: '#1a1f2a', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
            <svg width="100%" height="100%" viewBox="0 0 280 90" preserveAspectRatio="none">
              {Array.from({ length: 80 }).map((_, i) => {
                const h = 8 + Math.abs(Math.sin(i * 0.6) * 26) + (i % 7) * 2;
                return <rect key={i} x={i * 3.5} y={(90 - h) / 2} width="2" height={h} fill={i < 24 ? WB.blue : 'rgba(255,255,255,0.35)'} />;
              })}
            </svg>
            <div style={{ position: 'absolute', left: '30%', top: 0, bottom: 0, width: 2, background: WB.paper }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: WB.mono, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
            <span>02:43</span><span>09:14</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14 }}>
            {['SKIP', 'CUE', 'BLOCK'].map((b, i) => (
              <div key={b} style={{
                padding: '10px 0', textAlign: 'center', fontFamily: WB.mono, fontSize: 11, letterSpacing: '0.14em', fontWeight: 700,
                background: i === 0 ? WB.blueDeep : i === 2 ? 'transparent' : '#1a1f2a',
                color: i === 2 ? WB.carbon : '#e8e3d3',
                border: i === 2 ? `1.5px solid ${WB.carbon}` : 'none',
                borderRadius: 3,
              }}>{b}</div>
            ))}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px dashed rgba(255,255,255,0.15)', fontFamily: WB.mono, fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em' }}>
            UP NEXT · TWO TRIBES · FRANKIE GOES TO HOLLYWOOD
          </div>
        </div>

        {/* Queue */}
        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', padding: '8px 18px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontFamily: WB.mono, fontSize: 9, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.45)' }}>
            <span style={{ width: 30 }}>#</span>
            <span style={{ flex: 1 }}>TRACK / ARTIST</span>
            <span style={{ width: 60 }}>DEPOT</span>
            <span style={{ width: 50 }}>VOTES</span>
            <span style={{ width: 44 }}>LEN</span>
          </div>
          {queue.map(s => (
            <div key={s.rank} style={{
              display: 'flex', padding: '10px 18px', alignItems: 'center',
              background: s.playing ? '#1a1f2a' : 'transparent',
              borderBottom: '1px dashed rgba(255,255,255,0.08)',
              borderLeft: s.playing ? `3px solid ${WB.blue}` : '3px solid transparent',
            }}>
              <span style={{ width: 30, fontFamily: WB.mono, fontSize: 13, color: s.playing ? WB.blue : 'rgba(255,255,255,0.65)', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{String(s.rank).padStart(2,'0')}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: WB.sans, fontSize: 13, fontWeight: 600 }}>
                  {s.t}
                  {s.playing && <span style={{ fontFamily: WB.mono, fontSize: 9, marginLeft: 8, color: WB.blue, letterSpacing: '0.14em', fontWeight: 700 }}>▶ PLAYING</span>}
                </div>
                <div style={{ fontFamily: WB.mono, fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>{s.a}</div>
              </span>
              <span style={{ width: 60, fontFamily: WB.mono, fontSize: 11, color: WB.blue, fontWeight: 700 }}>{s.dep}</span>
              <span style={{ width: 50, fontFamily: WB.mono, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.votes}</span>
              <span style={{ width: 44, fontFamily: WB.mono, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{s.dur}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Screen F — Big-Screen Wall (landscape, venue projector) ──────────────
function WaybillWall() {
  const W = 720, H = 405;
  const tiles = [
    ['#cbb89b','#d8c8a8'],['#a8b0a4','#bcc4b8'],['#c2a08a','#d4b29d'],['#9ea4b0','#b4bac6'],['#b89a73','#cbb087'],
    ['#9aa0a8','#aeb4bc'],['#c8b8a4','#dcccb4'],['#b3a08c','#c8b59e'],['#aab2a0','#bec6b4'],['#a4a098','#bcb8b0'],
  ];
  return (
    <div style={{
      width: W, height: H, background: WB.paper, color: WB.ink,
      borderRadius: 8, overflow: 'hidden', position: 'relative',
      boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 18px 50px -20px rgba(0,0,0,0.25)',
      fontFamily: WB.sans, display: 'flex', flexDirection: 'column',
    }}>
      {/* Top letterhead bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 22px', borderBottom: `2px solid ${WB.ink}`, background: WB.card, gap: 18 }}>
        <WelchMark size={42} color={WB.blue} />
        <div>
          <div style={{ fontFamily: WB.mono, fontWeight: 700, fontSize: 11, letterSpacing: '0.32em' }}>WELCH GROUP · DISPATCH</div>
          <div style={{ fontFamily: WB.sans, fontWeight: 700, fontSize: 24, lineHeight: 1, marginTop: 2, letterSpacing: '-0.01em' }}>The Manifest, live.</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: WB.mono, fontSize: 10, letterSpacing: '0.22em', color: WB.faded }}>UNITS LOGGED</div>
          <div style={{ fontFamily: WB.sans, fontSize: 44, fontWeight: 800, lineHeight: 0.95, color: WB.blueDeep, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>147</div>
        </div>
      </div>

      {/* Body — auto-scrolling row + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', flex: 1, minHeight: 0 }}>
        {/* Scrolling photo strip area */}
        <div style={{ padding: '14px 0 14px 22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontFamily: WB.mono, fontSize: 10, letterSpacing: '0.22em', color: WB.faded, marginBottom: 8 }}>NOW BOARDING THE WALL · NO. 140 — 149</div>
          <div style={{ display: 'flex', gap: 10, height: 'calc(100% - 18px)' }}>
            {tiles.map((t, i) => {
              const n = 140 + i;
              return (
                <div key={i} style={{ width: 130, height: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  <PhotoTile tone={t} style={{ flex: 1, border: `1px solid ${WB.ink}44`, borderRadius: 2, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 4, left: 4, fontFamily: WB.mono, fontSize: 8, padding: '2px 5px', background: WB.paper, color: WB.ink, fontWeight: 700, letterSpacing: '0.08em' }}>№{String(n).padStart(3,'0')}</div>
                    {i % 4 === 1 && (
                      <div style={{ position: 'absolute', top: 4, right: 4, padding: '2px 5px', background: WB.blue, color: WB.paper, fontFamily: WB.mono, fontSize: 8, fontWeight: 700, letterSpacing: '0.08em' }}>360°</div>
                    )}
                  </PhotoTile>
                  <div style={{ marginTop: 6, fontFamily: WB.mono, fontSize: 9, color: WB.ink, letterSpacing: '0.06em' }}>
                    <span style={{ color: WB.blue, fontWeight: 700 }}>{['DXF','BED','STI','DXF','BED','STI','DXF','DXF','BED','STI'][i]}</span>
                    {' · '}
                    {['20:14','20:21','20:33','20:41','20:48','20:55','21:00','21:02','21:04','21:07'][i]}
                  </div>
                </div>
              );
            })}
          </div>
          {/* fade to right edge */}
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 60, background: `linear-gradient(to right, transparent, ${WB.paper})`, pointerEvents: 'none' }} />
        </div>

        {/* Sidebar — postmark + headlines */}
        <div style={{ background: WB.card, borderLeft: `2px solid ${WB.ink}`, padding: 18, display: 'flex', flexDirection: 'column' }}>
          <WBPostmark color={WB.blue} size={92} rotate={-5} />
          <WBLabel style={{ marginTop: 16 }}>Right now</WBLabel>
          <div style={{ fontFamily: WB.sans, fontSize: 14, fontWeight: 700, lineHeight: 1.2, marginTop: 4 }}>Sully (BED) loaded a 360° of the convoy.</div>

          <WBLabel style={{ marginTop: 14 }}>Top stamp · live</WBLabel>
          <div style={{ marginTop: 6, padding: '8px 10px', background: WB.paper, border: `1.5px solid ${WB.ink}` }}>
            <div style={{ fontFamily: WB.mono, fontSize: 9, letterSpacing: '0.18em', color: WB.faded }}>UNIT 089 · BED</div>
            <div style={{ fontFamily: WB.sans, fontWeight: 700, fontSize: 13, marginTop: 2 }}>Pat M.'s table shot</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontFamily: WB.mono, fontSize: 10 }}>
              <span style={{ color: WB.faded }}>VOTES</span>
              <span style={{ color: WB.blueDeep, fontWeight: 700 }}>41 ↑</span>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: `1px dashed ${WB.ink}44`, fontFamily: WB.mono, fontSize: 9.5, color: WB.faded, letterSpacing: '0.1em' }}>
            QR ENTRY · WELCHFEST.WELCHGROUP.CO.UK/JOIN
          </div>
        </div>
      </div>
    </div>
  );
}

function WaybillSection() {
  return (
    <DCSection id="d1-waybill" title="01 · Waybill" subtitle="Photos as cargo. Now with the Welch mark + brand blue.">
      <DCArtboard id="d1-id"     label="Identity"          width={CARD_W}  height={PHONE_H}><WaybillIdentity /></DCArtboard>
      <DCArtboard id="d1-a"      label="A · Join"          width={PHONE_W} height={PHONE_H}><WaybillJoin /></DCArtboard>
      <DCArtboard id="d1-b"      label="B · Live feed"     width={PHONE_W} height={PHONE_H}><WaybillFeed /></DCArtboard>
      <DCArtboard id="d1-c"      label="C · Memento"       width={PHONE_W} height={PHONE_H}><WaybillMemento /></DCArtboard>
      <DCArtboard id="d1-d"      label="D · Jukebox"       width={PHONE_W} height={PHONE_H}><WaybillJukebox /></DCArtboard>
      <DCArtboard id="d1-e"      label="E · DJ tablet (dark)" width={560}  height={420}><WaybillDJ /></DCArtboard>
      <DCArtboard id="d1-f"      label="F · Big-screen wall"  width={720}  height={405}><WaybillWall /></DCArtboard>
    </DCSection>
  );
}

Object.assign(window, { WaybillSection });
