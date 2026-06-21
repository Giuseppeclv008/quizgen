import { useEffect, useMemo, useState } from "react";
import type { Quiz } from "./domain/schema";
import {
  collectTopics,
  collectSources,
  assembleQuiz,
  assembleFromSources,
  type TopicGroup,
  type SourceGroup,
} from "./domain/topics";
import { GlobQuizRepository, type QuizModuleMap } from "./data/GlobQuizRepository";
import { createAttemptRepository } from "./data/createAttemptRepository";
import type { LoadError } from "./data/QuizRepository";
import { QuizMenu } from "./ui/components/QuizMenu";
import { QuizRunner } from "./ui/components/QuizRunner";
import { HistoryScreen } from "./ui/components/HistoryScreen";

export function App() {
  const repository = useMemo(() => {
    const modules = import.meta.glob("./quizzes/*.json") as QuizModuleMap;
    return new GlobQuizRepository(modules);
  }, []);
  const attemptRepo = useMemo(() => createAttemptRepository(), []);

  const [topics, setTopics] = useState<TopicGroup[] | null>(null);
  const [sources, setSources] = useState<SourceGroup[]>([]);
  const [errors, setErrors] = useState<LoadError[]>([]);
  const [active, setActive] = useState<Quiz | null>(null);
  const [view, setView] = useState<"menu" | "history">("menu");

  useEffect(() => {
    let alive = true;
    repository.list().then((listing) => {
      if (!alive) return;
      setTopics(collectTopics(listing.quizzes));
      setSources(collectSources(listing.quizzes));
      setErrors(listing.errors);
    }).catch(() => {
      if (alive) setTopics([]);
    });
    return () => {
      alive = false;
    };
  }, [repository]);

  if (active) {
    return <QuizRunner quiz={active} attemptRepo={attemptRepo} onExit={() => setActive(null)} />;
  }
  if (!topics) return <p className="loading">Loading…</p>;
  if (view === "history") {
    return <HistoryScreen groups={attemptRepo.allByQuiz()} onBack={() => setView("menu")} />;
  }

  return (
    <QuizMenu
      topics={topics}
      sources={sources}
      errors={errors}
      onShowHistory={() => setView("history")}
      onStartTopics={(selectedTopics, max) => setActive(assembleQuiz(topics, selectedTopics, max))}
      onStartPdfs={(selectedQuizIds, max) => setActive(assembleFromSources(sources, selectedQuizIds, max))}
    />
  );
}
