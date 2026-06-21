import { useState } from "react";
import type { SourceGroup } from "../../domain/topics";

export interface PdfSelectorProps {
  sources: SourceGroup[];
  onStart: (selectedQuizIds: string[], max: number) => void;
}

export function PdfSelector({ sources, onStart }: PdfSelectorProps) {
  const total = sources.reduce((n, s) => n + s.questions.length, 0);
  const [selected, setSelected] = useState<string[]>([]);
  const [max, setMax] = useState(total);

  function toggle(quizId: string) {
    setSelected((prev) =>
      prev.includes(quizId) ? prev.filter((id) => id !== quizId) : [...prev, quizId],
    );
  }

  function start() {
    onStart(selected, Math.min(Math.max(1, max || 1), total));
  }

  return (
    <div className="selector">
      <ul className="pdf-list">
        {sources.map((s) => (
          <li key={s.quizId}>
            <label className="topic-row">
              <input
                type="checkbox"
                checked={selected.includes(s.quizId)}
                onChange={() => toggle(s.quizId)}
              />
              <span className="t-name">{s.title}</span>
              <span className="t-count">{s.questions.length} questions</span>
            </label>
          </li>
        ))}
      </ul>
      <label className="max-field">
        Max questions
        <input
          type="number"
          min={1}
          max={total}
          value={max}
          onChange={(e) => setMax(Number(e.target.value))}
        />
      </label>
      <button className="primary" disabled={selected.length === 0} onClick={start}>
        Start quiz
      </button>
    </div>
  );
}
