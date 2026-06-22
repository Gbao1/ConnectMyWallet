const CATEGORY_KEYWORDS = {
  profitAndLoss: [
    "revenue",
    "sales",
    "income",
    "expense",
    "cost",
    "cogs",
    "gross",
    "net",
    "profit",
    "loss",
    "operating"
  ],
  investments: [
    "investment",
    "equity",
    "stock",
    "bond",
    "portfolio",
    "capital gain",
    "dividend",
    "mutual fund",
    "asset"
  ]
};

function extractAmount(line) {
  const amountRegex = /[-+]?\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?|[-+]?\$?\s?\d+(?:\.\d+)?/g;
  const matches = line.match(amountRegex);
  if (!matches || matches.length === 0) return null;

  const parsed = Number(matches[matches.length - 1].replace(/[$,\s]/g, ""));
  return Number.isNaN(parsed) ? null : parsed;
}

function categorizeLine(rawLine) {
  const line = rawLine.toLowerCase();
  const profitMatch = CATEGORY_KEYWORDS.profitAndLoss.some((keyword) => line.includes(keyword));
  const investMatch = CATEGORY_KEYWORDS.investments.some((keyword) => line.includes(keyword));

  if (profitMatch) return "profitAndLoss";
  if (investMatch) return "investments";
  return "others";
}

function analyzeReport(reportText) {
  const lines = reportText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const result = {
    profitAndLoss: [],
    investments: [],
    others: [],
    totals: {
      profitAndLoss: 0,
      investments: 0,
      others: 0
    }
  };

  for (const line of lines) {
    const category = categorizeLine(line);
    const amount = extractAmount(line);
    result[category].push({ line, amount });
    if (amount !== null) {
      result.totals[category] += amount;
    }
  }

  return result;
}

module.exports = {
  analyzeReport
};
