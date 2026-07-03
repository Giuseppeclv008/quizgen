import { useState } from "react";
import type { TopicGroup, SourceGroup } from "../../domain/topics";
import type { LoadError } from "../../data/QuizRepository";
import { TopicSelector } from "./TopicSelector";
import { PdfSelector } from "./PdfSelector";

export interface QuizMenuProps {
  title?: string;
  topics: TopicGroup[];
  sources: SourceGroup[];
  errors: LoadError[];
  onShowHistory: () => void;
  onStartTopics: (selectedTopics: string[], max: number) => void;
  onStartPdfs: (selectedQuizIds: string[], max: number) => void;
}

export function QuizMenu({
  title,
  topics,
  sources,
  errors,
  onShowHistory,
  onStartTopics,
  onStartPdfs,
}: QuizMenuProps) {
  const [tab, setTab] = useState<"pdf" | "topic">("pdf");

  return (
    <main className="menu">
      <h1>{title ?? "Quiz Generator"}</h1>
      <p className="lede">Pick a source and how many questions to practice.</p>
      <button className="ghost" onClick={onShowHistory}>Past attempts</button>
      {sources.length === 0 ? (
        <div className="empty">
          <p>No quizzes found.</p>
          <p className="muted">Drop a quiz JSON into <code>src/quizzes/</code> and reload.</p>
        </div>
      ) : (
        <>
          <div className="tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === "pdf"}
              className={tab === "pdf" ? "tab is-active" : "tab"}
              onClick={() => setTab("pdf")}
            >
              By PDF
            </button>
            <button
              role="tab"
              aria-selected={tab === "topic"}
              className={tab === "topic" ? "tab is-active" : "tab"}
              onClick={() => setTab("topic")}
            >
              By topic
            </button>
          </div>
          {tab === "pdf" ? (
            <PdfSelector sources={sources} onStart={onStartPdfs} />
          ) : (
            <TopicSelector topics={topics} onStart={onStartTopics} />
          )}
        </>
      )}
      {errors.length > 0 && (
        <div className="errors">
          <p>Some files could not be loaded:</p>
          <ul>
            {errors.map((e) => (
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
