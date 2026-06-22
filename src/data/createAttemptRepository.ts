import type { AttemptRepository } from "./AttemptRepository";
import { HttpAttemptRepository } from "./HttpAttemptRepository";
import { LocalStorageAttemptRepository } from "./LocalStorageAttemptRepository";
import { NullAttemptRepository } from "./NullAttemptRepository";

/**
 * In development the app talks to the local attempts API server (SQLite).
 * Production static builds (e.g. GitHub Pages) have no backend, so attempts
 * are persisted in the browser via localStorage instead.
 */
export function createAttemptRepository(): AttemptRepository {
  if (import.meta.env.DEV) {
    return new HttpAttemptRepository();
  }
  try {
    const probe = "__quizgen_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return new LocalStorageAttemptRepository(window.localStorage);
  } catch {
    return new NullAttemptRepository();
  }
}
