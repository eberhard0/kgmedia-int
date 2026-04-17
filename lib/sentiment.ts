import vader from "vader-sentiment";

interface SentimentResult {
  compound_score: number;
  pos_score: number;
  neg_score: number;
  neu_score: number;
  sentiment_label: string;
  analyzer: string;
}

function labelFromCompound(score: number): string {
  if (score >= 0.05) return "positive";
  if (score <= -0.05) return "negative";
  return "neutral";
}

function scoreVader(text: string): SentimentResult {
  const scores = vader.SentimentIntensityAnalyzer.polarity_scores(text);
  return {
    compound_score: scores.compound,
    pos_score: scores.pos,
    neg_score: scores.neg,
    neu_score: scores.neu,
    sentiment_label: labelFromCompound(scores.compound),
    analyzer: "vader",
  };
}

const INDONESIAN_STOPWORDS = new Set([
  "dan", "di", "yang", "untuk", "dari", "dengan", "ini", "itu", "pada",
  "adalah", "ke", "tidak", "akan", "juga", "sudah", "bisa", "ada", "oleh",
  "saat", "telah", "atau", "dalam", "lebih", "baru", "harus", "bahwa",
  "seperti", "karena", "mereka", "kami", "kita", "atas", "hingga", "setelah",
  "masih", "antara", "secara", "menjadi", "lagi", "tahun", "kata", "bagi",
  "tersebut", "serta", "namun", "tetapi", "sedang", "pemerintah", "negara",
  "indonesia", "jakarta", "presiden", "rakyat", "harga", "pemilu", "pilkada",
  "terkait", "mengenai", "tentang", "sementara", "selama", "sebelum",
  "kemudian", "dimana", "bagaimana", "mengapa", "siapa", "berapa",
  "sangat", "begitu", "demikian", "yakni", "melalui", "terhadap",
  "kepada", "menteri", "gubernur", "wakil", "ketua", "komisi",
]);

const INDONESIAN_PATTERNS = /(?:nya|kan|lah|kah|tah|pun)(?:\s|$|-)|(?:^|\s)(?:meng|meny|mem|men|peng|peny|pem|pen|ber|ter|per|se|ke|di)\w{3,}/i;

function isIndonesian(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  if (words.length === 0) return false;

  const stopwordCount = words.filter((w) => INDONESIAN_STOPWORDS.has(w)).length;
  if (stopwordCount / words.length > 0.12) return true;

  if (INDONESIAN_PATTERNS.test(text)) return true;

  const idSuffixes = words.filter((w) =>
    w.endsWith("nya") || w.endsWith("kan") || w.endsWith("kan,") ||
    w.endsWith("asi") || w.endsWith("nya,") || w.endsWith("nya.")
  ).length;
  if (idSuffixes >= 2) return true;

  return false;
}

function getHFHeaders(): Record<string, string> {
  const hfToken = process.env.HF_TOKEN || "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (hfToken) {
    headers["Authorization"] = `Bearer ${hfToken}`;
  }
  return headers;
}

async function scoreFinBERT(text: string): Promise<SentimentResult> {
  try {
    const res = await fetch(
      "https://router.huggingface.co/hf-inference/models/ProsusAI/finbert",
      {
        method: "POST",
        headers: getHFHeaders(),
        body: JSON.stringify({ inputs: text.slice(0, 512) }),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.warn(`FinBERT API error ${res.status}, falling back to VADER`);
      return scoreVader(text);
    }

    const data = await res.json();
    const predictions: Array<{ label: string; score: number }> =
      Array.isArray(data[0]) ? data[0] : data;

    let posScore = 0, negScore = 0, neuScore = 0;
    let topLabel = "neutral", topScore = 0;

    for (const p of predictions) {
      const label = p.label.toLowerCase();
      if (label === "positive") posScore = p.score;
      else if (label === "negative") negScore = p.score;
      else neuScore = p.score;
      if (p.score > topScore) { topScore = p.score; topLabel = label; }
    }

    const compound = posScore - negScore;
    return {
      compound_score: Math.round(compound * 1000) / 1000,
      pos_score: Math.round(posScore * 1000) / 1000,
      neg_score: Math.round(negScore * 1000) / 1000,
      neu_score: Math.round(neuScore * 1000) / 1000,
      sentiment_label: topLabel,
      analyzer: "finbert",
    };
  } catch (err) {
    console.warn("FinBERT failed, falling back to VADER:", err);
    return scoreVader(text);
  }
}

async function scoreIndoBERT(text: string): Promise<SentimentResult> {
  try {
    const res = await fetch(
      "https://router.huggingface.co/hf-inference/models/w11wo/indonesian-roberta-base-sentiment-classifier",
      {
        method: "POST",
        headers: getHFHeaders(),
        body: JSON.stringify({ inputs: text.slice(0, 512) }),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.warn(`IndoBERT API error ${res.status}, falling back to VADER`);
      return scoreVader(text);
    }

    const data = await res.json();
    const predictions: Array<{ label: string; score: number }> =
      Array.isArray(data[0]) ? data[0] : data;

    let posScore = 0, negScore = 0, neuScore = 0;
    let topLabel = "neutral", topScore = 0;

    for (const p of predictions) {
      const label = p.label.toLowerCase();
      if (label === "positive") posScore = p.score;
      else if (label === "negative") negScore = p.score;
      else neuScore = p.score;
      if (p.score > topScore) { topScore = p.score; topLabel = label; }
    }

    const compound = posScore - negScore;
    return {
      compound_score: Math.round(compound * 1000) / 1000,
      pos_score: Math.round(posScore * 1000) / 1000,
      neg_score: Math.round(negScore * 1000) / 1000,
      neu_score: Math.round(neuScore * 1000) / 1000,
      sentiment_label: topLabel,
      analyzer: "indobert",
    };
  } catch (err) {
    console.warn("IndoBERT failed, falling back to VADER:", err);
    return scoreVader(text);
  }
}

const USE_FINBERT = process.env.USE_FINBERT === "true";

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  if (USE_FINBERT) {
    if (isIndonesian(text)) {
      return scoreIndoBERT(text);
    }
    return scoreFinBERT(text);
  }
  return scoreVader(text);
}
