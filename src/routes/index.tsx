import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { importQuizletUrl, importStudyGo } from "@/lib/importers.functions";
import { addSet, deleteSet, loadSets, parseExport, type Card, type StudySet } from "@/lib/sets";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Houseparty — Study flashcards together" },
      { name: "description", content: "Make flashcard sets, study, quiz yourself and import from Quizlet or StudyGo." },
      { property: "og:title", content: "Houseparty — Study flashcards" },
      { property: "og:description", content: "Flashcards, learn mode and imports from Quizlet and StudyGo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

const STEPS: Record<string, string[]> = {
  Quizlet: [
    "Sign in on quizlet.com (opens in a new tab).",
    "Open your set, click the ⋯ menu, choose Export.",
    "Click “Copy text” and paste it below.",
  ],
  StudyGo: [
    "Sign in on studygo.com (opens in a new tab).",
    "Open your word list and select all words (or use Print/Export).",
    "Copy the list and paste it below — one word pair per line.",
  ],
};

function Home() {
  const [sets, setSets] = useState<StudySet[]>([]);
  const [mode, setMode] = useState<"" | "Quizlet" | "StudyGo" | "New">("");
  useEffect(() => setSets(loadSets()), []);

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <h1 className="text-2xl font-black tracking-tight text-primary">🎉 Houseparty</h1>
          <div className="flex gap-2">
            <button onClick={() => setMode("Quizlet")} className="rounded-md border px-3 py-2 text-sm font-semibold hover:bg-accent">Import from Quizlet</button>
            <button onClick={() => setMode("StudyGo")} className="rounded-md border px-3 py-2 text-sm font-semibold hover:bg-accent">Import from StudyGo</button>
            <button onClick={() => setMode("New")} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">+ New set</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        {mode && <Editor mode={mode} onClose={() => { setMode(""); setSets(loadSets()); }} />}
        <h2 className="mb-3 mt-6 text-lg font-bold">Your sets</h2>
        {sets.length === 0 ? (
          <p className="text-muted-foreground">No sets yet. Create one or import from Quizlet / StudyGo.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sets.map((s) => (
              <div key={s.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <Link to="/set/$id" params={{ id: s.id }} className="text-lg font-bold hover:text-primary">{s.title}</Link>
                <p className="text-sm text-muted-foreground">{s.cards.length} terms · {s.source}</p>
                <button onClick={() => { deleteSet(s.id); setSets(loadSets()); }} className="mt-2 text-xs text-destructive">Delete</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AutoImport({ mode, onDone }: { mode: string; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const run = async () => {
    setBusy(true);
    setMsg("");
    try {
      const sets = mode === "StudyGo"
        ? await importStudyGo({ data: { email, password } })
        : [await importQuizletUrl({ data: { url } })];
      sets.forEach((s) => addSet({ ...s, source: mode }));
      setMsg(`Imported ${sets.length} set(s)!`);
      setTimeout(onDone, 800);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Import failed");
    }
    setBusy(false);
  };
  return (
    <div className="mb-3 rounded-lg border-2 border-primary p-3">
      <p className="mb-2 font-bold">{mode === "StudyGo" ? "Sign in with StudyGo — imports all your lists" : "Auto-fetch a Quizlet set from its link"}</p>
      {mode === "StudyGo" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="StudyGo email" className="rounded-md border bg-background p-2" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="StudyGo password" className="rounded-md border bg-background p-2" />
        </div>
      ) : (
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://quizlet.com/123456789/..." className="w-full rounded-md border bg-background p-2" />
      )}
      <button disabled={busy} onClick={run} className="mt-2 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">{busy ? "Importing…" : mode === "StudyGo" ? "Sign in & import all" : "Fetch set"}</button>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
      {mode === "StudyGo" && <p className="mt-1 text-xs text-muted-foreground">Your password is sent straight to StudyGo and never stored.</p>}
    </div>
  );
}

function Editor({ mode, onClose }: { mode: string; onClose: () => void }) {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [cards, setCards] = useState<Card[]>([{ term: "", definition: "" }]);
  const isImport = mode !== "New";

  const save = () => {
    const final = isImport ? parseExport(text) : cards.filter((c) => c.term && c.definition);
    if (!title || final.length === 0) return alert("Add a title and at least one card.");
    const s = addSet({ title, source: isImport ? mode : "Houseparty", cards: final });
    onClose();
    nav({ to: "/set/$id", params: { id: s.id } });
  };

  return (
    <div className="mt-4 rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{isImport ? `Import from ${mode}` : "Create a new set"}</h2>
        <button onClick={onClose} className="text-sm text-muted-foreground">Close</button>
      </div>
      {isImport && <AutoImport mode={mode} onDone={onClose} />}
      {isImport && <p className="mb-2 mt-4 text-sm font-semibold">Or paste an export:</p>}
      {isImport && (
        <div className="mb-3 rounded-lg bg-accent p-3 text-sm">
          <a href={mode === "Quizlet" ? "https://quizlet.com/login" : "https://studygo.com/en/login"} target="_blank" rel="noreferrer" className="mb-2 inline-block rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground">Sign in to {mode} ↗</a>
          <ol className="list-decimal pl-5">{(STEPS[mode] ?? []).map((s) => <li key={s}>{s}</li>)}</ol>
        </div>
      )}
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Set title" className="mb-3 w-full rounded-md border bg-background p-2" />
      {isImport ? (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder={"term\tdefinition\nhond\tdog"} className="w-full rounded-md border bg-background p-2 font-mono text-sm" />
          <p className="text-sm text-muted-foreground">{parseExport(text).length} cards detected</p>
        </>
      ) : (
        <div className="space-y-2">
          {cards.map((c, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <input value={c.term} placeholder="Term" onChange={(e) => setCards(cards.map((x, j) => (j === i ? { ...x, term: e.target.value } : x)))} className="rounded-md border bg-background p-2" />
              <input value={c.definition} placeholder="Definition" onChange={(e) => setCards(cards.map((x, j) => (j === i ? { ...x, definition: e.target.value } : x)))} className="rounded-md border bg-background p-2" />
            </div>
          ))}
          <button onClick={() => setCards([...cards, { term: "", definition: "" }])} className="text-sm font-semibold text-primary">+ Add card</button>
        </div>
      )}
      <button onClick={save} className="mt-3 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">Save set</button>
    </div>
  );
}
