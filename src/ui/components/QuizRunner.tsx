import { useEffect, useRef } from "react";
import type { Quiz } from "../../domain/schema";
import type { Attempt } from "../../domain/models";
import type { AttemptRepository } from "../../data/AttemptRepository";
import { useQuizSession } from "../../session/useQuizSession";
import { answeredCount } from "../../session/QuizSession";
import { QuestionView } from "./QuestionView";
import { Results } from "./Results";
import { History } from "./History";

export interface QuizRunnerProps {
  quiz: Quiz;
  attemptRepo: AttemptRepository;
  onExit: () => void;
}

export function QuizRunner({ quiz, attemptRepo, onExit }: QuizRunnerProps) {
  const { state, dispatch } = useQuizSession(quiz);
  const saved = useRef(false);

  useEffect(() => {
    if (state.submitted && state.result && !saved.current) {
      saved.current = true;
      const attempt: Attempt = {
        quizId: quiz.id,
        quizTitle: quiz.title,
        timestamp: new Date().toISOString(),
        rawScore: state.result.rawScore,
        total: state.result.total,
        pct: state.result.pct,
        byDifficulty: state.result.byDifficulty,
      };
      attemptRepo.save(attempt);
    }
  }, [state.submitted, state.result, quiz, attemptRepo]);

  if (state.submitted && state.result) {
    return (
      <main className="results-screen">
        <Results quiz={state.quiz} answers={state.answers} result={state.result} onBackToMenu={onExit} />
        <h3>Past attempts</h3>
        <History attempts={attemptRepo.listByQuiz(quiz.id)} />
      </main>
    );
  }

  const total = state.quiz.questions.length;
  const question = state.quiz.questions[state.currentIndex];
  const isLast = state.currentIndex === total - 1;
  const progressPct = ((state.currentIndex + 1) / total) * 100;

  return (
    <main className="runner">
      <div className="progress-head">
        <span>Question {state.currentIndex + 1} of {total}</span>
        <span>{answeredCount(state)}/{total} answered</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <QuestionView
        question={question}
        answer={state.answers[question.id]}
        onAnswer={(answer) => dispatch({ kind: "answer", questionId: question.id, answer })}
      />
      <div className="nav-row">
        <button className="ghost" onClick={() => dispatch({ kind: "prev" })} disabled={state.currentIndex === 0}>
          Previous
        </button>
        <span className="spacer" />
        <button className="ghost" onClick={onExit}>Quit</button>
        {!isLast && <button className="primary" onClick={() => dispatch({ kind: "next" })}>Next</button>}
        {isLast && <button className="primary" onClick={() => dispatch({ kind: "submit" })}>Submit</button>}
      </div>
    </main>
  );
}
