import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type Db = Database.Database;

export function openDb(dbPath: string) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  migrate(db);
  return db;
}

function migrate(db: Db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const getVer = db.prepare("SELECT value FROM meta WHERE key='schemaVersion'").get() as
    | { value: string }
    | undefined;
  const current = getVer ? Number(getVer.value) : 0;
  const target = 1;

  if (Number.isNaN(current)) throw new Error("invalid schemaVersion");

  if (current < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        desiredOutcome TEXT NOT NULL,
        acceptanceCriteriaJson TEXT NOT NULL,
        suggestedPlanJson TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        tagsJson TEXT NOT NULL,
        dueAt TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        assignedAgentId TEXT NOT NULL,
        sessionKey TEXT,
        lastTransitionReason TEXT,
        lastTransitionAt TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_updatedAt ON tasks(updatedAt);

      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL,
        number INTEGER NOT NULL,
        status TEXT NOT NULL,
        startedAt TEXT,
        endedAt TEXT,
        outcome TEXT,
        error TEXT,
        gatewayRunId TEXT,
        FOREIGN KEY(taskId) REFERENCES tasks(id)
      );

      CREATE INDEX IF NOT EXISTS idx_runs_taskId ON runs(taskId);

      CREATE TABLE IF NOT EXISTS run_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskId TEXT NOT NULL,
        runId TEXT NOT NULL,
        ts TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        FOREIGN KEY(taskId) REFERENCES tasks(id),
        FOREIGN KEY(runId) REFERENCES runs(id)
      );

      CREATE INDEX IF NOT EXISTS idx_run_logs_runId ON run_logs(runId);

      INSERT OR REPLACE INTO meta(key,value) VALUES('schemaVersion','1');
    `);
  }

  const finalVer = db
    .prepare("SELECT value FROM meta WHERE key='schemaVersion'")
    .get() as { value: string };
  const finalNum = Number(finalVer.value);

  // Allow running against a newer schema (ex: leftover dev db from a prior version).
  // We only guarantee that the minimum required schema is present.
  if (finalNum < target) {
    throw new Error(`schema migration failed (expected >=${target}, got ${finalVer.value})`);
  }
}
