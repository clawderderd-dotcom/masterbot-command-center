import fs from "node:fs";
import path from "node:path";

function ymd(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ensureDailyBackup(opts: {
  dbPath: string;
  backupDir: string;
  keepDays: number;
}) {
  fs.mkdirSync(opts.backupDir, { recursive: true });
  const stamp = ymd();
  const backupPath = path.join(opts.backupDir, `mcc-${stamp}.sqlite3`);

  if (!fs.existsSync(opts.dbPath)) return;

  if (!fs.existsSync(backupPath)) {
    // atomic-ish copy: copy to tmp then rename
    const tmp = `${backupPath}.tmp`;
    fs.copyFileSync(opts.dbPath, tmp);
    fs.renameSync(tmp, backupPath);
  }

  pruneBackups(opts.backupDir, opts.keepDays);
}

function pruneBackups(dir: string, keepDays: number) {
  const entries = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sqlite3") && f.startsWith("mcc-"))
    .sort();

  const max = Math.max(keepDays, 1);
  const toDelete = entries.length > max ? entries.slice(0, entries.length - max) : [];
  for (const f of toDelete) {
    try {
      fs.unlinkSync(path.join(dir, f));
    } catch {
      // best-effort
    }
  }
}
