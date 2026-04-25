// Entity extraction — pulls named entities (people, orgs, places) out of
// Kompas article titles and bodies. Two backends:
//   - Heuristic (default, free): consecutive capitalized tokens with Indonesian
//     stopword filtering. Works well on news headlines where most entities are
//     proper-noun phrases.
//   - AI (activated when OPENAI_API_KEY is set): a structured extraction call
//     that catches entities the heuristic misses (lower-cased ministry names,
//     multi-word place names, role-based references like "Dubes Rusia").

import { isEmbeddingsEnabled } from "./embeddings";

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
  "ini", "tak", "akan", "bisa", "harus", "tetap", "kembali",
]);

// Common Indonesian title prefixes that imply an entity follows: keep them
// part of the entity instead of dropping them.
const TITLE_PREFIXES = new Set([
  "presiden", "menteri", "wakil", "ketua", "gubernur", "bupati", "walikota",
  "dubes", "duta", "kepala", "direktur", "komandan", "jenderal", "kapolri",
  "pdi", "pks", "pkb", "psi",
]);

export function isAiEntityExtractionEnabled(): boolean {
  return isEmbeddingsEnabled(); // OPENAI_API_KEY also drives entity extraction
}

export function extractEntitiesHeuristic(text: string): string[] {
  const tokens = text.split(/\s+/);
  const entities: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length > 0) {
      const entity = current.join(" ").trim();
      // Reject single-token entities that are too generic
      if (entity.length >= 3 && !(current.length === 1 && current[0].length < 4)) {
        entities.push(entity);
      }
      current = [];
    }
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

    // First word is always capitalized in headlines — only include if it
    // looks like a name (followed by another capitalized word) or is a
    // title prefix.
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

  // Dedup, preserving order
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

export async function extractEntitiesAI(text: string): Promise<string[]> {
  if (!isAiEntityExtractionEnabled()) return [];
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Extract named entities from the Indonesian/English news text. Include: people (full names), organizations, government bodies, companies, foreign nations, ministries. Skip generic terms (e.g. 'Pemerintah', 'Indonesia', 'Jakarta' alone). Return strict JSON: {\"entities\":[{\"name\":\"...\",\"type\":\"person|org|gov|company|country|ministry\"}]}",
          },
          { role: "user", content: text.slice(0, 4000) },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const json = JSON.parse(data.choices[0].message.content) as AiEntityResponse;
    return (json.entities || []).map((e) => e.name).filter((n) => n.length >= 3);
  } catch {
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
