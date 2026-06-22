import type { AttemptRepository } from "./AttemptRepository";
import { HttpAttemptRepository } from "./HttpAttemptRepository";

export function createAttemptRepository(): AttemptRepository {
  return new HttpAttemptRepository();
}
