export type Card = { term: string; definition: string };
export type StudySet = { id: string; title: string; source: string; cards: Card[]; createdAt: number };

const KEY = "houseparty-sets";

export function loadSets(): StudySet[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveSets(sets: StudySet[]) {
  localStorage.setItem(KEY, JSON.stringify(sets));
}

export function addSet(set: Omit<StudySet, "id" | "createdAt">): StudySet {
  const s = { ...set, id: crypto.randomUUID(), createdAt: Date.now() };
  saveSets([s, ...loadSets()]);
  return s;
}

export function deleteSet(id: string) {
  saveSets(loadSets().filter((s) => s.id !== id));
}

/** Parses Quizlet/StudyGo exported text: one card per line, term and definition split by tab, " - ", ";" or ",". */
export function parseExport(text: string): Card[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      for (const sep of ["\t", " - ", " = ", ";", ","]) {
        const i = line.indexOf(sep);
        if (i > 0) return { term: line.slice(0, i).trim(), definition: line.slice(i + sep.length).trim() };
      }
      return null;
    })
    .filter((c): c is Card => !!c && !!c.term && !!c.definition);
}
