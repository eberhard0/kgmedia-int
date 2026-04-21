// OpenAI embeddings — dormant until OPENAI_API_KEY is set.
// When active, replaces Jaccard token-overlap clustering with cosine
// similarity over semantic embeddings. Better at catching "same story,
// different wording" that keyword overlap misses.

const EMBED_MODEL = "text-embedding-3-small";
const EMBED_DIM = 1536;
export const SEMANTIC_CLUSTER_THRESHOLD = 0.75;

export function isEmbeddingsEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!isEmbeddingsEnabled() || texts.length === 0) return [];
  const trimmed = texts.map((t) => (t || "").slice(0, 8000));
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: trimmed }),
    });
    if (!res.ok) {
      console.warn(`OpenAI embeddings returned ${res.status}`);
      return texts.map(() => new Array(EMBED_DIM).fill(0));
    }
    const json = (await res.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    return json.data.map((d) => d.embedding);
  } catch (err) {
    console.warn("OpenAI embeddings threw:", err);
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
