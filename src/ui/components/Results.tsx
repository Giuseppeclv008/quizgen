import type { Quiz, Question, Difficulty } from "../../domain/schema";
import type { Answer, QuizResult } from "../../domain/models";

export interface ResultsProps {
  quiz: Quiz;
  answers: Record<string, Answer>;
  result: QuizResult;
  onBackToMenu: () => void;
}

function optionText(question: Question, id: string): string {
  if (question.type === "true_false") return id;
  return question.options.find((o) => o.id === id)?.text ?? id;
}

function formatUserAnswer(question: Question, answer: Answer | undefined): string {
  if (!answer) return "(no answer)";
  if (answer.type === "single_choice") return answer.optionId ? optionText(question, answer.optionId) : "(no answer)";
  if (answer.type === "multi_select") return answer.optionIds.length ? answer.optionIds.map((id) => optionText(question, id)).join(", ") : "(no answer)";
  return answer.value === null ? "(no answer)" : answer.value ? "True" : "False";
}

function formatCorrectAnswer(question: Question): string {
  if (question.type === "single_choice") return optionText(question, question.correctOptionId);
  if (question.type === "multi_select") return question.correctOptionIds.map((id) => optionText(question, id)).join(", ");
  return question.correctValue ? "True" : "False";
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export function Results({ quiz, answers, result, onBackToMenu }: ResultsProps) {
  const resultById = new Map(result.perQuestion.map((r) => [r.questionId, r]));
  return (
    <div className="results">
      <h2>Results — {quiz.title}</h2>
      <div className="score-card">
        <span className="score-pct">{result.pct.toFixed(0)}%</span>
        <span className="score-raw">
          Score: {result.rawScore.toFixed(2)} / {result.total}
        </span>
      </div>
      <ul className="difficulty-row">
        {DIFFICULTIES.filter((d) => result.byDifficulty[d].total > 0).map((d) => (
          <li key={d}>
            {d}: {result.byDifficulty[d].score.toFixed(2)} / {result.byDifficulty[d].total}
          </li>
        ))}
      </ul>
      {quiz.questions.map((q) => {
        const r = resultById.get(q.id);
        const tone = r?.correct ? "is-correct" : r && r.score > 0 ? "is-partial" : "is-wrong";
        const status = r?.correct ? "✓ correct" : r && r.score > 0 ? `partial (${r.score.toFixed(2)})` : "✗ wrong";
        return (
          <div key={q.id} className={`review-item ${tone}`}>
            <p className="review-q">
              <span className={`difficulty difficulty-${q.difficulty}`}>{q.difficulty}</span>
              <strong>{q.prompt}</strong> — <span className="review-status">{status}</span>
            </p>
            <p className="review-line">Your answer: {formatUserAnswer(q, answers[q.id])}</p>
            <p className="review-line">Correct answer: {formatCorrectAnswer(q)}</p>
            <p className="review-explain">{q.explanation}</p>
          </div>
        );
      })}
      <div className="results-actions">
        <button className="primary" onClick={onBackToMenu}>Back to menu</button>
      </div>
    </div>
  );
}
