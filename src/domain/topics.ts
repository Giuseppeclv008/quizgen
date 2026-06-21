import type { Quiz, Question } from "./schema";

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
