// Main canvas — Direction 1 (Waybill) — the chosen direction for WelchFest.

function WelchFestCanvas() {
  return (
    <DesignCanvas>
      <DCPostIt x={40} y={40} w={360}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>WelchFest — Waybill</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>
          Photos as cargo. Memories on a manifest. The Welch mark sits where it
          belongs — top-left of every page, like a real form.
        </div>
        <div style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.4, fontStyle: 'italic', opacity: 0.85 }}>
          Seven artboards: Identity spec + six screens (Join, Live feed, Memento,
          Jukebox, DJ tablet dark mode, Big-screen wall).
        </div>
      </DCPostIt>
      <DCPostIt x={40} y={260} w={300} color="#cfe1ee">
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#164b75' }}>System notes</div>
        <div style={{ fontSize: 11.5, lineHeight: 1.45 }}>
          • Mark tinted via CSS mask — ink, blue, paper, or stamp red as needed<br/>
          • Welch blue (#2275b3) is the brand voice; stamp red (#b8412a) reserved for ceremony stamps (RECEIVED, USED)<br/>
          • Mono = IBM Plex Mono for metadata; Plex Sans for prose<br/>
          • Every screen is a numbered form, every photo is a numbered unit
        </div>
      </DCPostIt>

      <WaybillSection />
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<WelchFestCanvas />);
