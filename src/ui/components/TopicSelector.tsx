import { useState } from "react";
import type { TopicGroup } from "../../domain/topics";

export interface TopicSelectorProps {
  topics: TopicGroup[];
  onStart: (selectedTopics: string[], max: number) => void;
}

export function TopicSelector({ topics, onStart }: TopicSelectorProps) {
  const total = topics.reduce((n, t) => n + t.questions.length, 0);
  const [selected, setSelected] = useState<string[]>([]);
  const [max, setMax] = useState(total);

  function toggle(topic: string) {
    setSelected((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
  }

  function start() {
    onStart(selected, Math.min(Math.max(1, max || 1), total));
  }

  return (
    <div className="selector">
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
    </div>
  );
}
