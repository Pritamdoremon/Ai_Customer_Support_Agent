import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Result = {
  intent: { intent: string; confidence: number; reason: string };
  retrieved_cases: Array<{ customerMessage: string; historicalReply: string; similarity: number }>;
  reply: string;
  escalation: { decision: string; reason: string };
};

function App() {
  const [message, setMessage] = useState("My package has not arrived yet and delivery is late");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/support/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const rawBody = await response.text();
      let body: { error?: string } & Partial<Result> = {};
      try {
        body = JSON.parse(rawBody);
      } catch {
        body.error = `Request failed (${response.status})`;
      }
      if (!response.ok) throw new Error(body.error ?? "Analysis failed");
      setResult(body as Result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <header>
        <p className="eyebrow">AMAZONHELP / SUPPORT INTELLIGENCE</p>
        <h1>Customer support, with evidence.</h1>
        <p className="intro">Test a message against historical AmazonHelp conversations and inspect every decision the agent makes.</p>
      </header>

      <section className="composer panel">
        <label htmlFor="message">Customer message</label>
        <textarea id="message" value={message} onChange={(event) => setMessage(event.target.value)} />
        <button onClick={analyze} disabled={loading || !message.trim()}>{loading ? "Analyzing..." : "Analyze message"}</button>
        {error && <p className="error">{error}</p>}
      </section>

      {result && <section className="results">
        <div className="summary-grid">
          <article className="panel stat"><span>Intent</span><strong>{result.intent.intent.replace(/_/g, " ")}</strong><small>{Math.round(result.intent.confidence * 100)}% model confidence</small></article>
          <article className={`panel stat ${result.escalation.decision === "escalate" ? "warn" : "good"}`}><span>Decision</span><strong>{result.escalation.decision.replace("_", " ")}</strong><small>{result.escalation.reason}</small></article>
        </div>
        <div className="content-grid">
          <article className="panel"><div className="section-title"><span>Grounded reply</span><em>LLM draft</em></div><p className="reply">{result.reply}</p></article>
          <article className="panel"><div className="section-title"><span>Why this decision</span></div><p>{result.intent.reason}</p><p className="muted">{result.escalation.reason}</p></article>
        </div>
        <article className="panel evidence"><div className="section-title"><span>Historical evidence</span><em>{result.retrieved_cases.length} cases</em></div>{result.retrieved_cases.map((item, index) => <div className="case" key={`${item.customerMessage}-${index}`}><div className="case-top"><strong>Case {index + 1}</strong><span>rank {item.similarity.toFixed(2)}</span></div><p><b>Customer</b> {item.customerMessage}</p><p><b>AmazonHelp</b> {item.historicalReply}</p></div>)}</article>
      </section>}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);