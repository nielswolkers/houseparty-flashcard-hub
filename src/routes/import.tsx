import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { addSet, type Card } from "@/lib/sets";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Importing sets — Houseparty" },
      { name: "description", content: "Receiving your sets from Quizlet." },
      { property: "og:title", content: "Importing sets — Houseparty" },
      { property: "og:description", content: "Receiving your sets from Quizlet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportPage,
});

function ImportPage() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let done = false;
    const onMsg = (e: MessageEvent) => {
      if (done || !e.origin.endsWith("quizlet.com") || e.data?.type !== "houseparty-import") return;
      done = true;
      const sets = (e.data.sets ?? []) as { title: string; cards: Card[] }[];
      sets.forEach((s) => addSet({ title: String(s.title), source: "Quizlet", cards: s.cards }));
      setCount(sets.length);
    };
    window.addEventListener("message", onMsg);
    window.opener?.postMessage("houseparty-ready", "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-black text-primary">🎉 Houseparty</h1>
      <p className="text-lg">{count === null ? "Waiting for your Quizlet sets…" : `Imported ${count} Quizlet sets!`}</p>
      <Link to="/" className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">Go to my sets</Link>
    </div>
  );
}
