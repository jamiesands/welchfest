"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import WBLetterhead from "@/components/waybill/WBLetterhead";
import WBLabel from "@/components/waybill/WBLabel";

// Client-side passphrase gate shared by the admin tools. This is the same
// soft gate the app has always used (NEXT_PUBLIC_ADMIN_PASSPHRASE in
// sessionStorage) — it hides the UI. The real protection on writes is the
// moderator-cookie check that proxy.ts enforces on every /api/admin/* call,
// so log in at /moderate first if a save comes back unauthorized.
const ADMIN_PASSPHRASE = process.env.NEXT_PUBLIC_ADMIN_PASSPHRASE ?? "";
const AUTH_KEY = "admin_auth";

export default function AdminGate({
  subtitle,
  code,
  children,
}: {
  subtitle: string;
  code: string;
  children: ReactNode;
}) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(sessionStorage.getItem(AUTH_KEY) === "true");
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ADMIN_PASSPHRASE) {
      setError("NEXT_PUBLIC_ADMIN_PASSPHRASE not set on this build.");
      return;
    }
    if (passphrase === ADMIN_PASSPHRASE) {
      sessionStorage.setItem(AUTH_KEY, "true");
      setAuthed(true);
    } else {
      setError("Nope. Try again.");
    }
  }

  if (authed === null) return <main className="min-h-dvh bg-paper" />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col bg-paper font-sans text-ink">
      <WBLetterhead subtitle={subtitle} code={code} />
      {authed ? (
        children
      ) : (
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-3 px-[18px] py-5"
        >
          <WBLabel>Passphrase</WBLabel>
          <input
            type="password"
            autoFocus
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="·····"
            className="w-full border-b-[1.5px] border-ink bg-transparent py-1.5 font-mono text-lg text-ink outline-none"
          />
          {error && (
            <div
              role="alert"
              className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-stamp"
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            className="mt-2 cursor-pointer border-none bg-blue-deep px-3.5 py-3 font-mono text-xs font-semibold tracking-[0.18em] text-paper"
          >
            UNLOCK →
          </button>
        </form>
      )}
    </main>
  );
}
