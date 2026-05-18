import WBLetterhead from "@/components/waybill/WBLetterhead";
import WBLabel from "@/components/waybill/WBLabel";

type Search = Promise<{ error?: string; next?: string }>;

export default async function ModerateLogin({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { error, next } = await searchParams;
  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-md mx-auto">
      <WBLetterhead subtitle="Moderation Login" code="Form W/MOD" />
      <form
        action="/api/moderate/login"
        method="post"
        className="flex-1 flex flex-col"
        style={{ padding: "18px 18px 0" }}
      >
        <WBLabel style={{ marginBottom: 6 }}>01 · Authorised Key</WBLabel>
        <div
          style={{
            borderBottom: "1.5px solid var(--color-ink)",
            paddingBottom: 5,
            marginBottom: 12,
          }}
        >
          <input
            type="password"
            name="key"
            autoFocus
            autoComplete="off"
            aria-label="Moderator key"
            className="w-full bg-transparent outline-none"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 18,
              fontWeight: 500,
              color: "var(--color-ink)",
            }}
          />
        </div>
        {next && <input type="hidden" name="next" value={next} />}

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 10,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-stamp)",
              border: "1.5px solid var(--color-stamp)",
              background: "#b8412a11",
              padding: "6px 10px",
              fontWeight: 700,
            }}
          >
            Wrong key — try again.
          </div>
        )}

        <div style={{ marginTop: "auto", marginBottom: 12, paddingTop: 12 }}>
          <button
            type="submit"
            style={{
              background: "var(--color-blue-deep)",
              color: "var(--color-paper)",
              padding: "13px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.18em",
              fontSize: 12,
              fontWeight: 600,
              width: "100%",
              border: "none",
              cursor: "pointer",
            }}
          >
            <span>UNLOCK</span>
            <span aria-hidden>→</span>
          </button>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--color-faded)",
              letterSpacing: "0.1em",
            }}
          >
            <span>FILE COPY · MOD</span>
            <span>REV. 04</span>
          </div>
        </div>
      </form>
    </main>
  );
}
