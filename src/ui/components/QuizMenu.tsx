import { useEffect, useState } from "react";
import type { Quiz } from "../../domain/schema";
import type { QuizRepository, QuizListing } from "../../data/QuizRepository";

export interface QuizMenuProps {
  repository: QuizRepository;
  onSelect: (quiz: Quiz) => void;
}

export function QuizMenu({ repository, onSelect }: QuizMenuProps) {
  const [listing, setListing] = useState<QuizListing | null>(null);

  useEffect(() => {
    let active = true;
    repository.list().then((l) => {
      if (active) setListing(l);
    });
    return () => {
      active = false;
    };
  }, [repository]);

  if (!listing) return <p className="loading">Loading…</p>;

  return (
    <main className="menu">
      <h1>Quiz Generator</h1>
      <p className="lede">Pick a set and test what you know.</p>
      {listing.quizzes.length === 0 ? (
        <div className="empty">
          <p>No quizzes found.</p>
          <p className="muted">Drop a quiz JSON into <code>src/quizzes/</code> and reload.</p>
        </div>
      ) : (
        <ul className="quiz-list">
          {listing.quizzes.map((q) => (
            <li key={q.id}>
              <button className="quiz-card" onClick={() => onSelect(q)}>
                <span className="q-title">{q.title}</span>
                <span className="q-count">{q.questions.length} questions</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {listing.errors.length > 0 && (
        <div className="errors">
          <p>Some files could not be loaded:</p>
          <ul>
            {listing.errors.map((e) => (
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
