import { useState } from "react";
import type { TopicGroup } from "../../domain/topics";
import type { LoadError } from "../../data/QuizRepository";

export interface QuizMenuProps {
  topics: TopicGroup[];
  errors: LoadError[];
  onStart: (selectedTopics: string[], max: number) => void;
}

export function QuizMenu({ topics, errors, onStart }: QuizMenuProps) {
  const total = topics.reduce((n, t) => n + t.questions.length, 0);
  const [selected, setSelected] = useState<string[]>([]);
  const [max, setMax] = useState(total);

  function toggle(topic: string) {
    setSelected((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
  }

  function start() {
    const clamped = Math.min(Math.max(1, max || 1), total);
    onStart(selected, clamped);
  }

  return (
    <main className="menu">
      <h1>Quiz Generator</h1>
      <p className="lede">Pick topics and how many questions to practice.</p>
      {topics.length === 0 ? (
        <div className="empty">
          <p>No quizzes found.</p>
          <p className="muted">Drop a quiz JSON into <code>src/quizzes/</code> and reload.</p>
        </div>
      ) : (
        <>
          <ul className="topic-list">
            {topics.map((t) => (
              <li key={t.topic}>
                <label className="topic-row">
                  <input
                    type="checkbox"
                    checked={selected.includes(t.topic)}
                    onChange={() => toggle(t.topic)}
                  />
                  <span className="t-name">{t.topic}</span>
                  <span className="t-count">{t.questions.length} questions</span>
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
        </>
      )}
      {errors.length > 0 && (
        <div className="errors">
          <p>Some files could not be loaded:</p>
          <ul>
            {errors.map((e) => (
              <li key={e.source}>
                {e.source}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
