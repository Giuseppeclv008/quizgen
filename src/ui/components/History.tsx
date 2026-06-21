import type { Attempt } from "../../domain/models";

export interface HistoryProps {
  attempts: Attempt[];
  showTitle?: boolean;
}

export function History({ attempts, showTitle = false }: HistoryProps) {
  if (attempts.length === 0) return <p className="muted">No past attempts yet.</p>;
  return (
    <table className="history">
      <thead>
        <tr>
          <th>Date</th>
          {showTitle && <th>Quiz</th>}
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        {attempts.map((a, i) => (
          <tr key={i}>
            <td>{new Date(a.timestamp).toLocaleString()}</td>
            {showTitle && <td>{a.quizTitle}</td>}
            <td>{a.pct.toFixed(0)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
