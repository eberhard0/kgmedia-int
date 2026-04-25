// Entity extraction — pulls named entities (people, orgs, places) out of
// Kompas article titles and bodies. Two backends:
//   - Heuristic (default, free): consecutive capitalized tokens with Indonesian
//     stopword filtering. Works well on news headlines where most entities are
//     proper-noun phrases.
//   - AI (activated when ANTHROPIC_API_KEY is set): a Claude Haiku call that
//     catches entities the heuristic misses (lower-cased ministry names,
//     multi-word place names, role-based references like "Dubes Rusia").

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

const STOPWORDS = new Set([
  "dan", "di", "yang", "untuk", "dari", "dengan", "ini", "itu", "pada",
  "adalah", "ke", "tidak", "akan", "juga", "sudah", "bisa", "ada", "oleh",
  "saat", "telah", "atau", "dalam", "lebih", "baru", "harus", "bahwa",
  "seperti", "karena", "mereka", "kami", "kita", "atas", "hingga", "setelah",
  "masih", "antara", "secara", "menjadi", "lagi", "tahun", "kata", "bagi",
  "tersebut", "serta", "namun", "tetapi", "sedang", "melalui", "terhadap",
  "kepada", "the", "a", "an", "and", "or", "of", "for", "to", "in", "on",
  "at", "is", "was", "by", "with", "as", "from", "that", "this",
  // overly common headline words that would generate noise
  "tak", "tetap", "kembali", "tengah", "usulan", "ambang", "batas",
  // generic place / demographic terms — too broad to act as entities alone
  "indonesia", "jakarta", "indonesian", "parents", "runners",
  // common marketing / section words
  "sports", "news", "sport", "premium", "terkini", "populer", "solusi",
]);

const MAX_ENTITY_WORDS = 4;
const MIN_ENTITY_WORDS = 1;

const TITLE_PREFIXES = new Set([
  "presiden", "menteri", "wakil", "ketua", "gubernur", "bupati", "walikota",
  "dubes", "duta", "kepala", "direktur", "komandan", "jenderal", "kapolri",
  "pdi", "pks", "pkb", "psi",
]);

export function isAiEntityExtractionEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function extractEntitiesHeuristic(text: string): string[] {
  const tokens = text.split(/\s+/);
  const entities: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const words = current;
    const entity = words.join(" ").trim();
    const allGeneric = words.every((w) => STOPWORDS.has(w.toLowerCase()));
    if (
      entity.length >= 3 &&
      words.length >= MIN_ENTITY_WORDS &&
      words.length <= MAX_ENTITY_WORDS &&
      !(words.length === 1 && words[0].length < 4) &&
      !allGeneric
    ) {
      entities.push(entity);
    }
    current = [];
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const clean = t.replace(/[^\p{L}\p{N}]/gu, "");
    if (clean.length === 0) {
      flush();
      continue;
    }
    const lower = clean.toLowerCase();
    const isCap = /^\p{Lu}/u.test(clean);
    const isStop = STOPWORDS.has(lower);
    const isTitlePrefix = TITLE_PREFIXES.has(lower);
    const isFirstWord = i === 0;

    if (isFirstWord && isCap && !isTitlePrefix) {
      const next = tokens[i + 1]?.replace(/[^\p{L}\p{N}]/gu, "") || "";
      const nextCap = /^\p{Lu}/u.test(next);
      if (!nextCap) {
        flush();
        continue;
      }
    }

    if ((isCap && !isStop && clean.length >= 3) || isTitlePrefix) {
      current.push(clean);
    } else {
      flush();
    }
  }
  flush();

  const seen = new Set<string>();
  return entities.filter((e) => {
    const key = e.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface AiEntityResponse {
  entities: Array<{ name: string; type: string }>;
}

const SYSTEM_PROMPT = [
  "Extract named entities from the given Indonesian or English news text.",
  "Include people (full names), organizations, government bodies, companies,",
  "foreign nations, ministries, and notable places. Skip generic terms",
  "(e.g. \"Pemerintah\", \"Indonesia\", \"Jakarta\" alone).",
  "Respond with strict JSON only — no markdown, no commentary.",
  "Format: {\"entities\":[{\"name\":\"...\",\"type\":\"person|org|gov|company|country|ministry|place\"}]}",
].join(" ");

export async function extractEntitiesAI(text: string): Promise<string[]> {
  if (!isAiEntityExtractionEnabled()) return [];
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: text.slice(0, 4000) }],
      }),
    });
    if (!res.ok) {
      console.warn(`Claude entity extraction returned ${res.status}`);
      return [];
    }
    const data = (await res.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    const block = data.content.find((b) => b.type === "text");
    if (!block) return [];
    const cleaned = block.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const json = JSON.parse(cleaned) as AiEntityResponse;
    return (json.entities || [])
      .map((e) => e.name)
      .filter((n) => typeof n === "string" && n.length >= 3);
  } catch (err) {
    console.warn("Claude entity extraction threw:", err);
    return [];
  }
}

export async function extractEntities(text: string): Promise<string[]> {
  if (isAiEntityExtractionEnabled()) {
    const aiEntities = await extractEntitiesAI(text);
    if (aiEntities.length > 0) return aiEntities;
  }
  return extractEntitiesHeuristic(text);
}
