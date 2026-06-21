import type { Quiz, Question } from "./schema";
import { shuffle, type Rng } from "./shuffle";

export interface TopicGroup {
  topic: string;
  questions: Question[];
}

export function collectTopics(quizzes: Quiz[]): TopicGroup[] {
  const byTopic = new Map<string, Question[]>();
  for (const quiz of quizzes) {
    for (const question of quiz.questions) {
      const bucket = byTopic.get(question.topic);
      if (bucket) bucket.push(question);
      else byTopic.set(question.topic, [question]);
    }
  }
  return [...byTopic.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([topic, questions]) => ({ topic, questions }));
}

export function assembleQuiz(
  groups: TopicGroup[],
  selectedTopics: string[],
  cap: number,
  rng: Rng = Math.random,
): Quiz {
  const selected = groups.filter((g) => selectedTopics.includes(g.topic));
  const available = selected.map((g) => g.questions.length);
  const alloc = selected.map(() => 0);

  let remaining = Math.min(cap, available.reduce((a, b) => a + b, 0));
  while (remaining > 0) {
    let progressed = false;
    for (let i = 0; i < selected.length && remaining > 0; i++) {
      if (alloc[i] < available[i]) {
        alloc[i]++;
        remaining--;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  const picked: Question[] = [];
  selected.forEach((g, i) => {
    picked.push(...shuffle(g.questions, rng).slice(0, alloc[i]));
  });

  return {
    id: "combined",
    title: selectedTopics.join(", "),
    source: "combined",
    createdAt: new Date().toISOString().slice(0, 10),
    questions: shuffle(picked, rng),
  };
}
