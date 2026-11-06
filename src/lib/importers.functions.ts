import { createServerFn } from "@tanstack/react-start";

type Card = { term: string; definition: string };
type Imported = { title: string; cards: Card[] };

const API = "https://api.wrts.nl/api/v3";

// Pull term/definition pairs out of StudyGo's list JSON, whatever shape it uses.
function cardsFromList(list: any): Card[] {
  const rows: any[] = list?.word_queries ?? list?.words ?? list?.items ?? [];
  return rows
    .map((r) => {
      const w = r?.words ?? r?.word_queries ?? r;
      if (Array.isArray(w) && w.length >= 2) return { term: String(w[0]?.word ?? w[0]), definition: String(w[1]?.word ?? w[1]) };
      if (r?.term) return { term: String(r.term), definition: String(r.definition ?? "") };
      return null;
    })
    .filter((c): c is Card => !!c && !!c.term && !!c.definition);
}

export const importStudyGo = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) => {
    if (!d?.email || !d?.password) throw new Error("Email and password required");
    return d;
  })
  .handler(async ({ data }): Promise<Imported[]> => {
    const login = await fetch(`${API}/auth/get_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email, password: data.password }),
    });
    if (!login.ok) throw new Error(login.status === 401 ? "Wrong StudyGo email or password" : `StudyGo login failed (${login.status})`);
    const { auth_token } = (await login.json()) as { auth_token?: string };
    if (!auth_token) throw new Error("StudyGo did not return a session");
    const h = { "x-auth-token": auth_token };

    const res = await fetch(`${API}/lists`, { headers: h });
    if (!res.ok) throw new Error(`Could not read your StudyGo lists (${res.status})`);
    const body: any = await res.json();
    const lists: any[] = Array.isArray(body) ? body : body.lists ?? body.results ?? [];

    const out: Imported[] = [];
    for (const l of lists.slice(0, 100)) {
      let cards = cardsFromList(l);
      if (!cards.length && l.id) {
        const d = await fetch(`${API}/lists/${l.id}`, { headers: h });
        if (d.ok) cards = cardsFromList(await d.json());
      }
      if (cards.length) out.push({ title: String(l.title ?? l.name ?? "StudyGo list"), cards });
    }
    return out;
  });

export const importQuizletUrl = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) => {
    const m = d?.url?.match(/quizlet\.com\/(?:[a-z]{2}\/)?(\d+)/);
    if (!m) throw new Error("Paste a Quizlet set link like quizlet.com/123456/...");
    return { id: m[1] };
  })
  .handler(async ({ data }): Promise<Imported> => {
    const res = await fetch(
      `https://quizlet.com/webapi/3.4/studiable-item-documents?filters%5BstudiableContainerId%5D=${data.id}&filters%5BstudiableContainerType%5D=1&perPage=1000`,
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`Quizlet blocked the automatic fetch (${res.status}). Use “Paste export” instead.`);
    const j: any = await res.json();
    const items: any[] = j?.responses?.[0]?.models?.studiableItem ?? [];
    const cards = items
      .map((it) => {
        const sides = it.cardSides ?? [];
        const t = sides[0]?.media?.[0]?.plainText;
        const d = sides[1]?.media?.[0]?.plainText;
        return t && d ? { term: t, definition: d } : null;
      })
      .filter((c): c is Card => !!c);
    if (!cards.length) throw new Error("No cards found in that Quizlet set");
    return { title: `Quizlet set ${data.id}`, cards };
  });
