"use client";

import { useCallback, useEffect, useState } from "react";
import AdminGate from "@/components/admin/AdminGate";
import WBLabel from "@/components/waybill/WBLabel";
import { supabase } from "@/lib/supabase";
import { thumbUrl } from "@/lib/images";

type Design = {
  id: string;
  name: string;
  employee_name: string | null;
  image_url: string;
  is_winner: boolean;
};

export default function AdminDesignsPage() {
  return (
    <AdminGate subtitle="Design a Lorry" code="Form W/DSG">
      <DesignsPanel />
    </AdminGate>
  );
}

function DesignsPanel() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from("lorry_designs")
      .select("id, name, employee_name, image_url, is_winner")
      .order("is_winner", { ascending: false })
      .order("created_at", { ascending: true });
    if (data) setDesigns(data as unknown as Design[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  async function setWinner(target: Design, makeWinner: boolean) {
    setBusyId(target.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/designs/${target.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_winner: makeWinner }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Save failed — log in at /moderate first.");
      }
      setDesigns((prev) =>
        prev.map((d) =>
          d.id === target.id
            ? { ...d, is_winner: makeWinner }
            : makeWinner
              ? { ...d, is_winner: false }
              : d
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-[18px] pb-8 pt-4">
      <p className="font-mono text-[11px] leading-relaxed tracking-[0.04em] text-faded">
        Pick the single winning design. Setting a winner clears the previous one.
      </p>

      {error && (
        <div
          role="alert"
          className="border-[1.5px] border-stamp bg-[#b8412a11] px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-stamp"
        >
          {error}
        </div>
      )}

      <WBLabel>Designs · {designs.length}</WBLabel>

      {loading ? (
        <div className="py-10 text-center font-mono text-xs uppercase tracking-[0.16em] text-faded">
          Loading…
        </div>
      ) : designs.length === 0 ? (
        <div className="py-10 text-center font-mono text-xs uppercase tracking-[0.16em] text-faded">
          No designs on file.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {designs.map((d) => {
            const thumb = thumbUrl(d.image_url, { width: 400, quality: 65 }) ?? d.image_url;
            const busy = busyId === d.id;
            return (
              <li
                key={d.id}
                className={`flex flex-col border bg-card ${
                  d.is_winner ? "border-blue-deep ring-2 ring-blue-deep" : "border-ink"
                }`}
              >
                <div className="aspect-square overflow-hidden bg-card-deep">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb}
                    alt={d.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-2">
                  <div className="truncate font-sans text-sm font-bold leading-tight">
                    {d.name}
                  </div>
                  {d.employee_name && (
                    <div className="truncate font-mono text-[10px] tracking-[0.08em] text-blue">
                      ✦ {d.employee_name}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setWinner(d, !d.is_winner)}
                    disabled={busy}
                    className={`mt-2 cursor-pointer border-none px-2 py-2 font-mono text-[10px] font-bold tracking-[0.14em] disabled:opacity-50 ${
                      d.is_winner
                        ? "bg-blue-deep text-paper"
                        : "bg-transparent text-blue-deep outline outline-[1.5px] outline-blue-deep"
                    }`}
                  >
                    {busy ? "…" : d.is_winner ? "WINNER ✓" : "SET WINNER"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
