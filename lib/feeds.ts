const INDONESIAN_KEYWORDS = [
  "indonesia",
  "harga",
  "kebijakan",
  "pemilu",
  "pilkada",
  "ktt",
  "krisis",
  "laut",
];

export function googleNewsRss(
  query: string,
  lang: string = "en",
  country: string = "ID"
): string {
  const hl = lang === "id" ? "id" : "en";
  const ceid = `${country}:${hl}`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${country}&ceid=${ceid}`;
}

export function getFeedUrls(queries: string[]): string[] {
  const urls: string[] = [];
  for (const q of queries) {
    urls.push(googleNewsRss(q, "en"));
    const lower = q.toLowerCase();
    if (INDONESIAN_KEYWORDS.some((w) => lower.includes(w))) {
      urls.push(googleNewsRss(q, "id"));
    }
  }
  return urls;
}
