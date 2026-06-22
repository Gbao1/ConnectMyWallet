import { useMemo, useState } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

const sections = [
  { key: "profitAndLoss", label: "Profit & Loss" },
  { key: "investments", label: "Investments" },
  { key: "others", label: "Others" }
];

function FinanceDashboardPage() {
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  const hasInput = useMemo(() => Boolean(file) || rawText.trim().length > 0, [file, rawText]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasInput) return;

    setLoading(true);
    setError("");
    setReport(null);

    try {
      const formData = new FormData();
      if (file) formData.append("report", file);
      if (rawText.trim()) formData.append("rawText", rawText);

      const response = await fetch(`${API_BASE}/api/reports/analyze`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to process report.");
      }

      setReport(data);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2">ConnectMyWallet</h1>
        <p className="text-slate-300 mb-8">
          Upload a messy finance report and automatically sort entries into Profit & Loss, Investments, and Others.
        </p>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
          <div>
            <label htmlFor="reportFile" className="block text-sm mb-2">Upload report (.txt, .csv, exported logs)</label>
            <input
              id="reportFile"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
          </div>

          <div>
            <label htmlFor="rawText" className="block text-sm mb-2">Or paste report text</label>
            <textarea
              id="rawText"
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3"
              placeholder="Revenue Q1: 12000\nOffice expense: 2200\nStock investment: 3500"
            />
          </div>

          <button
            type="submit"
            disabled={!hasInput || loading}
            className="px-4 py-2 rounded-md bg-emerald-500 text-slate-900 font-medium disabled:opacity-50"
          >
            {loading ? "Processing..." : "Process Report"}
          </button>

          {error ? <p className="text-red-400 text-sm">{error}</p> : null}
        </form>

        {report ? (
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {sections.map((section) => (
              <div key={section.key} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <h2 className="text-lg font-medium mb-2">{section.label}</h2>
                <p className="text-sm text-slate-300 mb-3">
                  Total: {Number(report.totals?.[section.key] || 0).toLocaleString()}
                </p>
                <ul className="space-y-2 text-sm">
                  {(report[section.key] || []).map((entry, idx) => (
                    <li key={`${section.key}-${idx}`} className="border-b border-slate-800 pb-2">
                      <div>{entry.line}</div>
                      <div className="text-slate-400">Amount: {entry.amount ?? "N/A"}</div>
                    </li>
                  ))}
                  {(report[section.key] || []).length === 0 ? <li className="text-slate-500">No items</li> : null}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default FinanceDashboardPage;
