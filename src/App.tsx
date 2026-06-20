import { useMemo, useState } from "react";
import type { Quiz } from "./domain/schema";
import { GlobQuizRepository, type QuizModuleMap } from "./data/GlobQuizRepository";
import { createAttemptRepository } from "./data/createAttemptRepository";
import { QuizMenu } from "./ui/components/QuizMenu";
import { QuizRunner } from "./ui/components/QuizRunner";

export function App() {
  const repository = useMemo(() => {
    const modules = import.meta.glob("./quizzes/*.json") as QuizModuleMap;
    return new GlobQuizRepository(modules);
  }, []);
  const attemptRepo = useMemo(() => createAttemptRepository(), []);
  const [active, setActive] = useState<Quiz | null>(null);

  if (active) {
    return <QuizRunner quiz={active} attemptRepo={attemptRepo} onExit={() => setActive(null)} />;
  }
  return <QuizMenu repository={repository} onSelect={setActive} />;
}
