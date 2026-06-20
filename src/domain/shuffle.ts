import type { Quiz } from "./schema";

export type Rng = () => number; // returns [0, 1)

export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffleQuizOptions(quiz: Quiz, rng: Rng = Math.random): Quiz {
  return {
    ...quiz,
    questions: quiz.questions.map((q) =>
      q.type === "true_false" ? q : { ...q, options: shuffle(q.options, rng) },
    ),
  };
}
