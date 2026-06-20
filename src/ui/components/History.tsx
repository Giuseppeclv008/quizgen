import type { Attempt } from "../../domain/models";

export interface HistoryProps {
  attempts: Attempt[];
}

export function History({ attempts }: HistoryProps) {
  if (attempts.length === 0) return <p>No past attempts yet.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        {attempts.map((a, i) => (
          <tr key={i}>
            <td>{new Date(a.timestamp).toLocaleString()}</td>
            <td>{a.pct.toFixed(0)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
