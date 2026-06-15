"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import AdminGate from "@/components/admin/AdminGate";
import WBLabel from "@/components/waybill/WBLabel";
import { supabase } from "@/lib/supabase";

type Row = {
  id: string;
  player_name: string;
  depot: string | null;
  score: number;
};

const DEPOTS = ["", "DXF", "BED", "STI", "GUEST"];

export default function AdminLeaderboardPage() {
  return (
    <AdminGate subtitle="Penalty Shootout" code="Form W/PEN">
      <LeaderboardPanel />
    </AdminGate>
  );
}

function LeaderboardPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add-form state
  const [name, setName] = useState("");
  const [depot, setDepot] = useState("");
  const [score, setScore] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from("penalty_shootout")
      .select("id, player_name, depot, score")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true });
    if (data) setRows(data as unknown as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const scoreNum = Number(score);
    if (!name.trim() || !Number.isInteger(scoreNum) || scoreNum < 0) {
      setError("Need a name and a whole-number score.");
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/penalty", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          player_name: name.trim(),
          depot: depot || null,
          score: scoreNum,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Add failed — log in at /moderate first.");
      }
      setName("");
      setDepot("");
      setScore("");
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  }

  async function onSave(row: Row) {
    setError(null);
    const res = await fetch(`/api/admin/penalty/${row.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        player_name: row.player_name.trim(),
        depot: row.depot || null,
        score: row.score,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Save failed — log in at /moderate first.");
      return false;
    }
    await fetchAll();
    return true;
  }

  async function onDelete(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/penalty/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Delete failed — log in at /moderate first.");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-4 px-[18px] pb-8 pt-4">
      <p className="font-mono text-[11px] leading-relaxed tracking-[0.04em] text-faded">
        The public leaderboard appears as soon as one row exists, and hides
        again if you remove them all.
      </p>

      <form
        onSubmit={onAdd}
        className="flex flex-col gap-2 border-[1.5px] border-ink bg-card p-3"
      >
        <WBLabel>Add a score</WBLabel>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Player name"
          className="border-[1.5px] border-ink bg-paper px-2.5 py-2 font-mono text-sm text-ink outline-none"
        />
        <div className="flex gap-2">
          <select
            value={depot}
            onChange={(e) => setDepot(e.target.value)}
            className="flex-1 border-[1.5px] border-ink bg-paper px-2.5 py-2 font-mono text-sm text-ink"
          >
            {DEPOTS.map((d) => (
              <option key={d} value={d}>
                {d || "— depot —"}
              </option>
            ))}
          </select>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="Score"
            className="w-24 border-[1.5px] border-ink bg-paper px-2.5 py-2 font-mono text-sm text-ink outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="cursor-pointer border-none bg-blue-deep px-3 py-2.5 font-mono text-xs font-semibold tracking-[0.16em] text-paper disabled:opacity-50"
        >
          {adding ? "ADDING…" : "ADD →"}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="border-[1.5px] border-stamp bg-[#b8412a11] px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-stamp"
        >
          {error}
        </div>
      )}

      <WBLabel>Leaderboard · {rows.length}</WBLabel>

      {loading ? (
        <div className="py-8 text-center font-mono text-xs uppercase tracking-[0.16em] text-faded">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center font-mono text-xs uppercase tracking-[0.16em] text-faded">
          No scores yet. The public page is hidden.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <EditableRow
              key={row.id}
              row={row}
              rank={i + 1}
              onSave={onSave}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function EditableRow({
  row,
  rank,
  onSave,
  onDelete,
}: {
  row: Row;
  rank: number;
  onSave: (row: Row) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Row>(row);
  const [busy, setBusy] = useState(false);

  // Re-sync when the parent refetches (ordering may move this row).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(row);
  }, [row]);

  const dirty =
    draft.player_name !== row.player_name ||
    (draft.depot || "") !== (row.depot || "") ||
    draft.score !== row.score;

  return (
    <li className="flex items-center gap-2 border-[1.5px] border-ink bg-card p-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-card-deep font-mono text-xs font-bold tabular-nums">
        {rank}
      </span>
      <input
        type="text"
        value={draft.player_name}
        onChange={(e) => setDraft({ ...draft, player_name: e.target.value })}
        className="min-w-0 flex-1 border-b border-ink/40 bg-transparent px-1 py-1 font-sans text-sm font-bold outline-none"
      />
      <select
        value={draft.depot ?? ""}
        onChange={(e) => setDraft({ ...draft, depot: e.target.value || null })}
        className="border-[1.5px] border-ink bg-paper px-1 py-1 font-mono text-[11px]"
      >
        {DEPOTS.map((d) => (
          <option key={d} value={d}>
            {d || "—"}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={0}
        value={draft.score}
        onChange={(e) => setDraft({ ...draft, score: Number(e.target.value) })}
        className="w-16 border-[1.5px] border-ink bg-paper px-1.5 py-1 font-mono text-sm tabular-nums outline-none"
      />
      <button
        type="button"
        disabled={!dirty || busy}
        onClick={async () => {
          setBusy(true);
          await onSave(draft);
          setBusy(false);
        }}
        aria-label="Save row"
        className="cursor-pointer border-none bg-blue-deep px-2 py-1.5 font-mono text-[10px] font-bold tracking-[0.12em] text-paper disabled:opacity-40"
      >
        SAVE
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onDelete(row.id)}
        aria-label={`Delete ${row.player_name}`}
        className="cursor-pointer border-[1.5px] border-stamp bg-transparent px-2 py-1.5 font-mono text-[10px] font-bold text-stamp disabled:opacity-40"
      >
        ✕
      </button>
    </li>
  );
}
