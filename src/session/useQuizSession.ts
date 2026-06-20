import { useReducer } from "react";
import type { Quiz } from "../domain/schema";
import { initSession, sessionReducer, type QuizSessionState, type SessionAction } from "./QuizSession";

export function useQuizSession(quiz: Quiz): {
  state: QuizSessionState;
  dispatch: React.Dispatch<SessionAction>;
} {
  const [state, dispatch] = useReducer(sessionReducer, quiz, (q) => initSession(q));
  return { state, dispatch };
}
