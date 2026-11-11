// Prediction market snapshot. Prices move by the minute: update `readAt` with every refresh.
export const readAt = "October 12, 2026";

export const national = [
  { race: "U.S. House control", rows: [
    { venue: "Kalshi", dem: 90, rep: 11, volume: "$53.4M traded, per CoinStats", url: "https://kalshi.com/markets/controlh/house-winner/controlh-2026" },
    { venue: "Polymarket", dem: 91, rep: 10, volume: "$17M traded", url: "https://polymarket.com/predictions/midterms" },
  ] },
  { race: "U.S. Senate control", rows: [
    { venue: "Kalshi", dem: 62, rep: 38, volume: "Volume not checked", url: "https://kalshi.com/markets/controls/senate-winner/controls-2026" },
    { venue: "Polymarket", dem: 64, rep: 38, volume: "$6M traded", url: "https://polymarket.com/predictions/midterms" },
  ] },
];

export const utah = [
  { race: "Utah's 1st Congressional District", rows: [
    { venue: "Kalshi", dem: 98, rep: 2, volume: "$12.1K traded in total, per PredictionEdge", url: "https://kalshi.com/markets/kxhouseut01/which-party-will-win-the-house-race-for-ut01/kxhouseut01-26" },
  ] },
];
export const utahNotes = [
  "Ben McAdams is the Democratic candidate and Riley Owen the Republican. Two other candidates are on the ballot.",
  "On Oct 5, Polymarket's market on the winning margin in this district had $3,453 traded in total. A market that small can move on one person's trade.",
  "No market was found on a Utah U.S. Senate race, a legislative race or a county race. Utah's other three House districts were not checked.",
];

export const forecasters = {
  line: "For comparison, the Cook Political Report rates races by hand rather than by price. On Oct 9 it moved 18 House races toward Democrats, leaving 21 toss-ups, and was reported to expect a Democratic gain of 9 to 19 seats. A majority is 218. On Sept 23 it rated 7 of the 35 Senate races as toss-ups.",
  sources: [
    { label: "Cook House ratings", url: "https://www.cookpolitical.com/ratings/house-race-ratings" },
    { label: "Political.org, Oct 9, 2026", url: "https://political.org/2026/10/09/cook-political-report-shifts-18-house-races-toward-democrats-as-gop-midterm-outlook-darkens/" },
    { label: "Cook Senate ratings", url: "https://www.cookpolitical.com/ratings/senate-race-ratings" },
  ],
};

export const explain = [
  { head: "A price is a trade, not a poll.", text: "A contract trading at 90 cents is shown as a 90% chance. It reflects where people with money on the line have settled, not a survey of voters.", url: "https://kalshi.com/markets/controlh/house-winner/controlh-2026", label: "Kalshi House market" },
  { head: "It is real money.", text: "Kalshi trades in dollars. Polymarket trades in a dollar-linked cryptocurrency. Both charge trading fees.", url: "https://docs.polymarket.com/polymarket-learn/trading/fees", label: "Polymarket fee page" },
  { head: "Big traders can move a price.", text: "In 2024 one trader put about $30 million on a single presidential outcome across several accounts, and reporting at the time said it skewed the odds.", url: "https://fortune.com/2024/11/02/french-whale-polymarket-30-million-donald-trump-election-bet-kamala-harris", label: "Fortune, Nov 2, 2024" },
  { head: "The research is mixed.", text: "A long-run study of the Iowa Electronic Markets found the market closer than polls to the result 74% of the time across five presidential elections. A 2025 Vanderbilt study of about 2,500 markets scored Polymarket at 67% accuracy and Kalshi at 78%, and found signs of herd trading. Kalshi disputes that study's method.", url: "https://iemweb.biz.uiowa.edu/about-iem/research/prediction-market-accuracy-in-the-long-run/", label: "Iowa study", url2: "https://www.dlnews.com/articles/markets/polymarket-kalshi-prediction-markets-not-so-reliable-says-study", label2: "DL News on the Vanderbilt study" },
  { head: "Utah is fighting these markets in court.", text: "A 2026 Utah law widened the state's definition of gambling. Kalshi sued, a federal judge ruled for Utah on Aug 5, and an appeals court denied Kalshi's emergency request in September. This page reports prices as information. It is not a suggestion to trade.", url: "https://www.fox13now.com/news/politics/utah-may-crack-down-on-kalshi-after-emergency-injunction-rejected", label: "FOX 13, Sept 9, 2026" },
];

export const venues = [
  { name: "Polymarket midterms", url: "https://polymarket.com/predictions/midterms", about: "A trading platform." },
  { name: "Kalshi midterms", url: "https://kalshi.com/category/elections/midterms", about: "A trading platform overseen by the federal commodities regulator." },
  { name: "Sikt Intelligence", url: "https://siktintelligence.com/odds/2026-midterm-election-odds", about: "A site that republishes Kalshi and Polymarket prices. It names no operator." },
];
