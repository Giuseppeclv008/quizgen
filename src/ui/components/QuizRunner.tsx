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
      <div>
        <Results quiz={state.quiz} answers={state.answers} result={state.result} onBackToMenu={onExit} />
        <h3>Past attempts</h3>
        <History attempts={attemptRepo.listByQuiz(quiz.id)} />
      </div>
    );
  }

  const question = state.quiz.questions[state.currentIndex];
  const isLast = state.currentIndex === state.quiz.questions.length - 1;

  return (
    <div>
      <p>
        Question {state.currentIndex + 1} of {state.quiz.questions.length} · answered{" "}
        {answeredCount(state)}/{state.quiz.questions.length}
      </p>
      <QuestionView
        question={question}
        answer={state.answers[question.id]}
        onAnswer={(answer) => dispatch({ kind: "answer", questionId: question.id, answer })}
      />
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <button onClick={() => dispatch({ kind: "prev" })} disabled={state.currentIndex === 0}>
          Previous
        </button>
        {!isLast && <button onClick={() => dispatch({ kind: "next" })}>Next</button>}
        {isLast && <button onClick={() => dispatch({ kind: "submit" })}>Submit</button>}
        <button onClick={onExit}>Quit</button>
      </div>
    </div>
  );
}
