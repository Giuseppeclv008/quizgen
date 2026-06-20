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

  if (!listing) return <p>Loading…</p>;

  return (
    <div>
      <h1>Quiz Generator</h1>
      {listing.quizzes.length === 0 ? (
        <p>No quizzes found. Drop a quiz JSON into <code>src/quizzes/</code> and reload.</p>
      ) : (
        <ul>
          {listing.quizzes.map((q) => (
            <li key={q.id} style={{ marginBottom: "0.5rem" }}>
              <button onClick={() => onSelect(q)}>
                {q.title} ({q.questions.length} questions)
              </button>
            </li>
          ))}
        </ul>
      )}
      {listing.errors.length > 0 && (
        <div style={{ marginTop: "1rem", color: "crimson" }}>
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
    </div>
  );
}
