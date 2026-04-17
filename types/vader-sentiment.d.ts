declare module "vader-sentiment" {
  const SentimentIntensityAnalyzer: {
    polarity_scores(text: string): {
      compound: number;
      pos: number;
      neg: number;
      neu: number;
    };
  };
  export default { SentimentIntensityAnalyzer };
}
