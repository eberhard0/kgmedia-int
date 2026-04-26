// Voyage AI embeddings — dormant until VOYAGE_API_KEY is set.
// When active, replaces Jaccard token-overlap clustering with cosine
// similarity over semantic embeddings. voyage-3-lite is multilingual
// and handles Indonesian + English mixed content cheaply.

const EMBED_MODEL = "voyage-3-lite";
const EMBED_DIM = 512;
const VOYAGE_BATCH_MAX = 500;

export const SEMANTIC_CLUSTER_THRESHOLD = 0.65;

export function isEmbeddingsEnabled(): boolean {
  return !!process.env.VOYAGE_API_KEY;
}

async function embedChunk(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: texts,
      input_type: "document",
    }),
  });
  if (!res.ok) {
    console.warn(`Voyage embeddings returned ${res.status}`);
    return texts.map(() => new Array(EMBED_DIM).fill(0));
  }
  const json = (await res.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
  };
  const ordered = new Array<number[]>(texts.length);
  for (const d of json.data) ordered[d.index] = d.embedding;
  return ordered.map((e) => e || new Array(EMBED_DIM).fill(0));
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!isEmbeddingsEnabled() || texts.length === 0) return [];
  const trimmed = texts.map((t) => (t || "").slice(0, 8000));
  try {
    const out: number[][] = [];
    for (let i = 0; i < trimmed.length; i += VOYAGE_BATCH_MAX) {
      const slice = trimmed.slice(i, i + VOYAGE_BATCH_MAX);
      const embeds = await embedChunk(slice);
      out.push(...embeds);
    }
    return out;
  } catch (err) {
    console.warn("Voyage embeddings threw:", err);
    return texts.map(() => new Array(EMBED_DIM).fill(0));
  }
}

export function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
