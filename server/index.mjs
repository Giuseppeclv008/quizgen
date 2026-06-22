import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;

const db = new DatabaseSync(join(__dirname, "attempts.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quizId TEXT NOT NULL,
    quizTitle TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    rawScore REAL NOT NULL,
    total INTEGER NOT NULL,
    pct REAL NOT NULL,
    byDifficulty TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON attempts (quizId);
`);

const insertStmt = db.prepare(
  `INSERT INTO attempts (quizId, quizTitle, timestamp, rawScore, total, pct, byDifficulty)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
);
const byQuizStmt = db.prepare(
  `SELECT * FROM attempts WHERE quizId = ? ORDER BY timestamp ASC`,
);
const allStmt = db.prepare(`SELECT * FROM attempts ORDER BY timestamp ASC`);

function toAttempt(row) {
  return {
    quizId: row.quizId,
    quizTitle: row.quizTitle,
    timestamp: row.timestamp,
    rawScore: row.rawScore,
    total: row.total,
    pct: row.pct,
    byDifficulty: JSON.parse(row.byDifficulty),
  };
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(json);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const { pathname } = url;

  if (req.method === "OPTIONS") return send(res, 204, {});

  try {
    if (req.method === "POST" && pathname === "/api/attempts") {
      const a = JSON.parse(await readBody(req));
      insertStmt.run(
        String(a.quizId),
        String(a.quizTitle),
        String(a.timestamp),
        Number(a.rawScore),
        Number(a.total),
        Number(a.pct),
        JSON.stringify(a.byDifficulty),
      );
      return send(res, 201, { ok: true });
    }

    if (req.method === "GET" && pathname === "/api/attempts") {
      const grouped = {};
      for (const row of allStmt.all()) {
        (grouped[row.quizId] ??= []).push(toAttempt(row));
      }
      return send(res, 200, grouped);
    }

    const match = pathname.match(/^\/api\/attempts\/(.+)$/);
    if (req.method === "GET" && match) {
      const quizId = decodeURIComponent(match[1]);
      return send(res, 200, byQuizStmt.all(quizId).map(toAttempt));
    }

    return send(res, 404, { error: "not found" });
  } catch (err) {
    return send(res, 500, { error: String(err?.message || err) });
  }
});

server.listen(PORT, () => {
  console.log(`quizgen attempts API listening on http://localhost:${PORT}`);
});
