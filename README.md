# ConnectMyWallet

ConnectMyWallet is a finance management application with a strict rule-based document processing pipeline.

Users upload messy reports and the system automatically classifies lines into:
- Profit & Loss
- Investments
- Others

No AI/LLM/model inference is used in processing. Categorization is deterministic and keyword-rule driven.

## Project Structure

```
ConnectMyWallet/
  backend/
    index.js
    routes/reportRoutes.js
    services/reportCategorizer.js
  frontend/
    src/App.js
    src/pages/FinanceDashboardPage.js
  README.md
```

## How It Works

1. Upload a report file or paste raw text in the frontend dashboard.
2. Backend endpoint `POST /api/reports/analyze` parses report lines.
3. Rule engine applies category keywords and extracts numeric amounts.
4. Frontend displays categorized entries and totals.

## Rules (No AI)

- `profitAndLoss` keywords include: revenue, sales, income, expense, cost, cogs, gross, net, profit, loss, operating.
- `investments` keywords include: investment, equity, stock, bond, portfolio, capital gain, dividend, mutual fund, asset.
- Any unmatched line goes to `others`.
- Amounts are parsed from numeric tokens in each line.

## Run Locally

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend default URL: `http://localhost:4000`

### Frontend

```bash
cd frontend
npm install
npm start
```

Frontend default URL: `http://localhost:3000`

Set API URL if needed:

```bash
REACT_APP_API_URL=http://localhost:4000
```

## API

### POST `/api/reports/analyze`

Accepts multipart form-data:
- `report` (file) or
- `rawText` (text)

Example response:

```json
{
  "message": "Report processed successfully.",
  "profitAndLoss": [{ "line": "Revenue Q1 12000", "amount": 12000 }],
  "investments": [{ "line": "Stock purchase 3000", "amount": 3000 }],
  "others": [{ "line": "Misc note", "amount": null }],
  "totals": {
    "profitAndLoss": 12000,
    "investments": 3000,
    "others": 0
  }
}
```
