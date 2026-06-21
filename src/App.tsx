import { useEffect, useMemo, useState } from "react";
import type { Quiz } from "./domain/schema";
import { collectTopics, assembleQuiz, type TopicGroup } from "./domain/topics";
import { GlobQuizRepository, type QuizModuleMap } from "./data/GlobQuizRepository";
import { createAttemptRepository } from "./data/createAttemptRepository";
import type { LoadError } from "./data/QuizRepository";
import { QuizMenu } from "./ui/components/QuizMenu";
import { QuizRunner } from "./ui/components/QuizRunner";

export function App() {
  const repository = useMemo(() => {
    const modules = import.meta.glob("./quizzes/*.json") as QuizModuleMap;
    return new GlobQuizRepository(modules);
  }, []);
  const attemptRepo = useMemo(() => createAttemptRepository(), []);

  const [topics, setTopics] = useState<TopicGroup[] | null>(null);
  const [errors, setErrors] = useState<LoadError[]>([]);
  const [active, setActive] = useState<Quiz | null>(null);

  useEffect(() => {
    let alive = true;
    repository.list().then((listing) => {
      if (!alive) return;
      setTopics(collectTopics(listing.quizzes));
      setErrors(listing.errors);
    });
    return () => {
      alive = false;
    };
  }, [repository]);

  if (active) {
    return <QuizRunner quiz={active} attemptRepo={attemptRepo} onExit={() => setActive(null)} />;
  }
  if (!topics) return <p className="loading">Loading…</p>;

  return (
    <QuizMenu
      topics={topics}
      errors={errors}
      onStart={(selectedTopics, max) => setActive(assembleQuiz(topics, selectedTopics, max))}
    />
  );
}
