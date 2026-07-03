import type { Attempt } from "../../domain/models";
import { History } from "./History";

export interface HistoryScreenProps {
  groups: Record<string, Attempt[]>;
  onBack: () => void;
}

function sortedDesc(attempts: Attempt[]): Attempt[] {
  return [...attempts].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function headingFor(quizId: string, rows: Attempt[]): string {
  if (quizId === "combined" || quizId.startsWith("combined:")) return "Combined quizzes";
  return rows[0]?.quizTitle || quizId;
}

export function HistoryScreen({ groups, onBack }: HistoryScreenProps) {
  const sections = Object.entries(groups)
    .map(([quizId, attempts]) => ({ quizId, rows: sortedDesc(attempts) }))
    .filter((s) => s.rows.length > 0)
    .sort((a, b) => b.rows[0].timestamp.localeCompare(a.rows[0].timestamp));

  return (
    <main className="history-screen">
      <h1>Past attempts</h1>
      {sections.length === 0 ? (
        <p className="muted">No past attempts yet.</p>
      ) : (
        sections.map((s) => (
          <section key={s.quizId} className="history-group">
            <h2>{headingFor(s.quizId, s.rows)}</h2>
            <History attempts={s.rows} showTitle />
          </section>
        ))
      )}
      <div className="results-actions">
        <button className="ghost" onClick={onBack}>Back</button>
      </div>
    </main>
  );
}
