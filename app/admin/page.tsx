"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import WBLetterhead from "@/components/waybill/WBLetterhead";
import WBLabel from "@/components/waybill/WBLabel";

const ADMIN_PASSPHRASE = process.env.NEXT_PUBLIC_ADMIN_PASSPHRASE ?? "";
const AUTH_KEY = "admin_auth";

type Tool = {
  href: string;
  title: string;
  blurb: string;
  tag: string;
  external?: boolean;
};

const ADMIN_TOOLS: Tool[] = [
  {
    href: "/admin/trucks",
    title: "Truck entries",
    blurb: "Pre-populate the Best Truck lineup before guests arrive.",
    tag: "BEST TRUCK",
  },
  {
    href: "/admin/360",
    title: "360 uploader",
    blurb: "Upload equirectangular spheres straight to the feed.",
    tag: "SPHERES",
  },
];

const LIVE_TOOLS: Tool[] = [
  {
    href: "/dj",
    title: "DJ console",
    blurb: "Cue, play next, skip, block, mark-played. Live queue.",
    tag: "JUKEBOX",
  },
  {
    href: "/wall",
    title: "Photo wall",
    blurb: "Big-screen autoscrolling manifest. Add ?speed=slow|normal|fast.",
    tag: "VENUE",
  },
  {
    href: "/moderate",
    title: "Photo moderation",
    blurb: "Hide a bad photo after the fact. (Has its own login.)",
    tag: "MOD",
  },
];

const FINAL_TOOLS: Tool[] = [
  {
    href: "/results",
    title: "Final results",
    blurb: "Winners and full tally for the closing announcement.",
    tag: "RESULTS",
  },
];

const GUEST_PREVIEWS: Tool[] = [
  { href: "/feed", title: "/feed", blurb: "Manifest", tag: "GUEST" },
  { href: "/songs", title: "/songs", blurb: "Jukebox", tag: "GUEST" },
  { href: "/awards", title: "/awards", blurb: "Best Truck", tag: "GUEST" },
  { href: "/designs", title: "/designs", blurb: "Design a Lorry", tag: "GUEST" },
];

export default function AdminIndexPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(sessionStorage.getItem(AUTH_KEY) === "true");
  }, []);

  function onSubmitAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ADMIN_PASSPHRASE) {
      setAuthError("NEXT_PUBLIC_ADMIN_PASSPHRASE not set on this build.");
      return;
    }
    if (passphrase === ADMIN_PASSPHRASE) {
      sessionStorage.setItem(AUTH_KEY, "true");
      setAuthed(true);
    } else {
      setAuthError("Nope. Try again.");
    }
  }

  function lock() {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthed(false);
    setPassphrase("");
  }

  if (authed === null) {
    return <main className="min-h-dvh bg-paper" />;
  }

  return (
    <main className="min-h-dvh bg-paper text-ink font-sans flex flex-col w-full max-w-xl mx-auto">
      <WBLetterhead subtitle="Control Room" code="Form W/ADM" />
      {authed ? (
        <ToolsList onLock={lock} />
      ) : (
        <form
          onSubmit={onSubmitAuth}
          style={{
            padding: "20px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <WBLabel>Passphrase</WBLabel>
          <input
            type="password"
            autoFocus
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="·····"
            className="w-full bg-transparent outline-none"
            style={{
              borderBottom: "1.5px solid var(--color-ink)",
              fontFamily: "var(--font-mono)",
              fontSize: 18,
              padding: "6px 0",
              color: "var(--color-ink)",
            }}
          />
          {authError && (
            <div
              role="alert"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-stamp)",
                fontWeight: 700,
              }}
            >
              {authError}
            </div>
          )}
          <button
            type="submit"
            style={{
              background: "var(--color-blue-deep)",
              color: "var(--color-paper)",
              padding: "12px 14px",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.18em",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              marginTop: 8,
            }}
          >
            UNLOCK →
          </button>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--color-faded)",
              letterSpacing: "0.08em",
              lineHeight: 1.5,
              marginTop: 6,
            }}
          >
            Single sign-on for /admin/360 and /admin/trucks — unlocking
            here unlocks both for the session.
          </p>
        </form>
      )}
    </main>
  );
}

function ToolsList({ onLock }: { onLock: () => void }) {
  return (
    <div
      style={{
        padding: "14px 18px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <Section title="Setup" subtitle="Before guests arrive">
        {ADMIN_TOOLS.map((t) => (
          <ToolCard key={t.href} tool={t} />
        ))}
      </Section>

      <Section title="On the day" subtitle="Live during the event">
        {LIVE_TOOLS.map((t) => (
          <ToolCard key={t.href} tool={t} />
        ))}
      </Section>

      <Section title="End of night" subtitle="Ceremony">
        {FINAL_TOOLS.map((t) => (
          <ToolCard key={t.href} tool={t} />
        ))}
      </Section>

      <Section title="Guest views" subtitle="Sanity check what they see">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 8,
          }}
        >
          {GUEST_PREVIEWS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              style={{
                border: "1.5px solid var(--color-ink)",
                background: "var(--color-card)",
                padding: "10px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "var(--color-ink)",
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <span style={{ color: "var(--color-blue-deep)" }}>{t.title}</span>
              <span
                style={{
                  fontSize: 9,
                  color: "var(--color-faded)",
                  letterSpacing: "0.14em",
                }}
              >
                {t.blurb.toUpperCase()}
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <button
        type="button"
        onClick={onLock}
        style={{
          alignSelf: "flex-start",
          marginTop: 10,
          background: "transparent",
          border: "1.5px solid var(--color-ink)",
          padding: "6px 12px",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.16em",
          color: "var(--color-ink)",
          cursor: "pointer",
        }}
      >
        ← LOCK SESSION
      </button>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          borderBottom: "1.5px solid var(--color-ink)",
          paddingBottom: 4,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 16,
            fontWeight: 700,
            margin: 0,
            lineHeight: 1,
          }}
        >
          {title}
        </h2>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
            color: "var(--color-faded)",
            textTransform: "uppercase",
          }}
        >
          {subtitle}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </section>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={tool.href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        border: "1.5px solid var(--color-ink)",
        background: "var(--color-card)",
        textDecoration: "none",
        color: "var(--color-ink)",
        boxShadow: "2px 2px 0 rgba(30,27,22,0.18)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {tool.title}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--color-faded)",
            letterSpacing: "0.06em",
            marginTop: 2,
            lineHeight: 1.4,
          }}
        >
          {tool.blurb}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--color-blue-deep)",
            letterSpacing: "0.16em",
            marginTop: 4,
          }}
        >
          {tool.href}
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.22em",
          color: "var(--color-paper)",
          background: "var(--color-ink)",
          padding: "3px 6px",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {tool.tag}
      </div>
      <span
        aria-hidden
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 16,
          color: "var(--color-blue-deep)",
          flexShrink: 0,
        }}
      >
        →
      </span>
    </Link>
  );
}
