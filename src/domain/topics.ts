import type { Quiz, Question } from "./schema";
import { shuffle, type Rng } from "./shuffle";

export interface TopicGroup {
  topic: string;
  questions: Question[];
}

export interface SourceGroup {
  quizId: string;
  title: string;
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

export function collectSources(quizzes: Quiz[]): SourceGroup[] {
  return quizzes.map((q) => ({ quizId: q.id, title: q.title, questions: q.questions }));
}

// Round-robin water-fill: even split across groups + redistribute leftovers,
// capped at min(cap, pool). Returns the combined picked questions (unshuffled).
function pickEvenly(groups: { questions: Question[] }[], cap: number, rng: Rng): Question[] {
  const available = groups.map((g) => g.questions.length);
  const alloc = groups.map(() => 0);

  let remaining = Math.min(cap, available.reduce((a, b) => a + b, 0));
  while (remaining > 0) {
    let progressed = false;
    for (let i = 0; i < groups.length && remaining > 0; i++) {
      if (alloc[i] < available[i]) {
        alloc[i]++;
        remaining--;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  const picked: Question[] = [];
  groups.forEach((g, i) => {
    picked.push(...shuffle(g.questions, rng).slice(0, alloc[i]));
  });
  return picked;
}

function synthetic(title: string, questions: Question[]): Quiz {
  return {
    id: "combined",
    title,
    source: "combined",
    createdAt: new Date().toISOString().slice(0, 10),
    questions,
  };
}

export function assembleQuiz(
  groups: TopicGroup[],
  selectedTopics: string[],
  cap: number,
  rng: Rng = Math.random,
): Quiz {
  const selected = groups.filter((g) => selectedTopics.includes(g.topic));
  return synthetic(selectedTopics.join(", "), shuffle(pickEvenly(selected, cap, rng), rng));
}

export function assembleFromSources(
  sources: SourceGroup[],
  selectedQuizIds: string[],
  cap: number,
  rng: Rng = Math.random,
): Quiz {
  const selected = sources.filter((s) => selectedQuizIds.includes(s.quizId));
  return synthetic(selected.map((s) => s.title).join(", "), shuffle(pickEvenly(selected, cap, rng), rng));
}
