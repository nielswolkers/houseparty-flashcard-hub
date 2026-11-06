import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { loadSets, type StudySet } from "@/lib/sets";

export const Route = createFileRoute("/set/$id")({
  head: () => ({
    meta: [
      { title: "Study set — Houseparty" },
      { name: "description", content: "Study this set with flashcards and learn mode on Houseparty." },
      { property: "og:title", content: "Study set — Houseparty" },
      { property: "og:description", content: "Flashcards and learn mode." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SetPage,
});

function SetPage() {
  const { id } = Route.useParams();
  const [set, setSet] = useState<StudySet | null | undefined>(undefined);
  const [tab, setTab] = useState<"cards" | "learn">("cards");
  useEffect(() => setSet(loadSets().find((s) => s.id === id) ?? null), [id]);

  if (set === undefined) return null;
  if (!set) return <p className="p-8">Set not found. <Link to="/" className="text-primary">Home</Link></p>;

  return (
    <div className="mx-auto max-w-3xl p-4">
      <Link to="/" className="text-sm font-semibold text-primary">← Houseparty</Link>
      <h1 className="mt-2 text-3xl font-black">{set.title}</h1>
      <div className="my-4 flex gap-2">
        {(["cards", "learn"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-4 py-2 font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "border"}`}>{t === "cards" ? "Flashcards" : "Learn"}</button>
        ))}
      </div>
      {tab === "cards" ? <Flashcards set={set} /> : <Learn set={set} />}
      <h2 className="mb-2 mt-8 font-bold">Terms ({set.cards.length})</h2>
      <div className="divide-y rounded-xl border bg-card">
        {set.cards.map((c, i) => (
          <div key={i} className="grid grid-cols-2 gap-4 p-3"><span className="font-semibold">{c.term}</span><span>{c.definition}</span></div>
        ))}
      </div>
    </div>
  );
}

function Flashcards({ set }: { set: StudySet }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const c = set.cards[i];
  const go = (d: number) => { setFlip(false); setI((i + d + set.cards.length) % set.cards.length); };
  return (
    <div>
      <button onClick={() => setFlip(!flip)} className="flex h-64 w-full items-center justify-center rounded-2xl border bg-card p-6 text-center text-2xl font-semibold shadow-md">
        {flip ? c?.definition : c?.term}
      </button>
      <div className="mt-3 flex items-center justify-center gap-4">
        <button onClick={() => go(-1)} className="rounded-md border px-4 py-2">←</button>
        <span className="text-sm text-muted-foreground">{i + 1} / {set.cards.length}</span>
        <button onClick={() => go(1)} className="rounded-md border px-4 py-2">→</button>
      </div>
    </div>
  );
}

function Learn({ set }: { set: StudySet }) {
  const [q, setQ] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const order = useMemo(() => [...set.cards].sort(() => Math.random() - 0.5), [set]);
  const card = order[q];
  const options = useMemo(() => {
    if (!card) return [];
    const others = set.cards.filter((c) => c.definition !== card.definition).sort(() => Math.random() - 0.5).slice(0, 3).map((c) => c.definition);
    return [...others, card.definition].sort(() => Math.random() - 0.5);
  }, [card, set]);

  if (!card) return (
    <div className="rounded-2xl border bg-card p-6 text-center">
      <p className="text-2xl font-bold">Score: {score} / {order.length}</p>
      <button onClick={() => { setQ(0); setScore(0); }} className="mt-3 rounded-md bg-primary px-4 py-2 text-primary-foreground">Again</button>
    </div>
  );
  return (
    <div className="rounded-2xl border bg-card p-6">
      <p className="text-sm text-muted-foreground">Question {q + 1} / {order.length}</p>
      <p className="my-4 text-2xl font-bold">{card.term}</p>
      <div className="grid gap-2">
        {options.map((o) => (
          <button key={o} disabled={!!picked} onClick={() => { setPicked(o); if (o === card.definition) setScore(score + 1); }}
            className={`rounded-md border p-3 text-left ${picked && o === card.definition ? "border-primary bg-accent font-bold" : ""} ${picked === o && o !== card.definition ? "border-destructive text-destructive" : ""}`}>{o}</button>
        ))}
      </div>
      {picked && <button onClick={() => { setPicked(null); setQ(q + 1); }} className="mt-3 rounded-md bg-primary px-4 py-2 text-primary-foreground">Next</button>}
    </div>
  );
}
