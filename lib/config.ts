export const SCRAPE_INTERVAL_MINUTES = 30;
export const ESCALATION_WINDOW_HOURS = 24;
export const SENTIMENT_THRESHOLD_ALERT = -0.3;
export const SLOPE_THRESHOLD_ESCALATION = -0.05;
export const SLOPE_THRESHOLD_DEESCALATION = 0.05;
export const SLOPE_THRESHOLD_CRITICAL = -0.1;
export const NUM_ARTICLES_PER_FEED = 30;
export const FETCH_DELAY_MS = 1500;

// Kompas Gramedia internal monitoring: news channels, social media, chat groups
export const TRACKED_TOPICS = [
  {
    name: "Kompas.id - Headline",
    queries: [],
    directFeeds: ["https://cds.kompas.id/rss/v1/article/list"],
  },
  {
    name: "Kompas.com - Nasional",
    queries: ["Kompas Indonesia nasional"],
    directFeeds: ["https://rss.kompas.com/nasional"],
  },
  {
    name: "Kompas.com - Regional",
    queries: ["Kompas regional Indonesia"],
    directFeeds: ["https://rss.kompas.com/regional"],
  },
  {
    name: "Kompas.com - Internasional",
    queries: ["Kompas internasional"],
    directFeeds: ["https://rss.kompas.com/internasional"],
  },
  {
    name: "Kompas.com - Bisnis",
    queries: ["Kompas bisnis ekonomi"],
    directFeeds: ["https://rss.kompas.com/bisnisekonomi"],
  },
  {
    name: "Kompas.com - Tekno",
    queries: ["Kompas teknologi"],
    directFeeds: ["https://rss.kompas.com/tekno"],
  },
  {
    name: "Kompas.com - Olahraga",
    queries: ["Kompas olahraga"],
    directFeeds: ["https://rss.kompas.com/olahraga"],
  },
  {
    name: "Kontan - Business",
    queries: ["Kontan ekonomi bisnis"],
    directFeeds: ["https://www.kontan.co.id/rss"],
  },
  {
    name: "Tribunnews",
    queries: ["Tribunnews Indonesia"],
    directFeeds: ["https://www.tribunnews.com/rss"],
  },
  {
    name: "Kompasiana (Citizen)",
    queries: ["Kompasiana opini"],
    directFeeds: [],
  },
  {
    name: "Social - Twitter/X",
    queries: ["@kompascom", "@kompas_tv", "Kompas Gramedia twitter"],
    directFeeds: [],
  },
  {
    name: "Social - Instagram/Facebook",
    queries: ["\"kompas.com\" instagram", "\"Kompas Gramedia\" facebook"],
    directFeeds: [],
  },
  {
    name: "Reddit & Forums",
    queries: ["Kompas Gramedia reddit", "Indonesia media forum"],
    directFeeds: ["https://www.reddit.com/search.rss?q=Kompas+Gramedia"],
  },
];
