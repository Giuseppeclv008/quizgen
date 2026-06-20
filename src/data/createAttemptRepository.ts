import type { AttemptRepository } from "./AttemptRepository";
import { LocalStorageAttemptRepository } from "./LocalStorageAttemptRepository";
import { NullAttemptRepository } from "./NullAttemptRepository";

export function createAttemptRepository(): AttemptRepository {
  try {
    const probe = "__quizgen_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return new LocalStorageAttemptRepository(window.localStorage);
  } catch {
    return new NullAttemptRepository();
  }
}
