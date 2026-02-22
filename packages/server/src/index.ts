import "dotenv/config";
import path from "node:path";

import { openDb } from "./db/db.js";
import { ensureDailyBackup } from "./db/backups.js";
import { WsHub } from "./ws/hub.js";
import { Orchestrator } from "./orchestrator.js";
import { buildApp } from "./http/app.js";
import { attachDashboardWs } from "./ws/server.js";

const HOST = process.env.MCC_HOST ?? "127.0.0.1";
const PORT = Number(process.env.MCC_PORT ?? 8787);

const DATA_DIR = process.env.MCC_DATA_DIR
  ? path.resolve(process.env.MCC_DATA_DIR)
  : path.resolve(process.cwd(), "data");

const DB_PATH = process.env.MCC_DB_PATH
  ? path.resolve(process.env.MCC_DB_PATH)
  : path.join(DATA_DIR, "mcc.sqlite3");

const BACKUP_DIR = process.env.MCC_BACKUP_DIR
  ? path.resolve(process.env.MCC_BACKUP_DIR)
  : path.resolve(process.cwd(), "backups");

const GATEWAY_URL = process.env.MCC_GATEWAY_URL ?? "ws://127.0.0.1:18789/ws";
const GATEWAY_TOKEN = process.env.MCC_GATEWAY_TOKEN;
const GATEWAY_PASSWORD = process.env.MCC_GATEWAY_PASSWORD;

const db = openDb(DB_PATH);
ensureDailyBackup({ dbPath: DB_PATH, backupDir: BACKUP_DIR, keepDays: 7 });
setInterval(() => {
  ensureDailyBackup({ dbPath: DB_PATH, backupDir: BACKUP_DIR, keepDays: 7 });
}, 60 * 60 * 1000).unref();

const hub = new WsHub();
const orchestrator = new Orchestrator(db, hub, {
  gatewayUrl: GATEWAY_URL,
  gatewayToken: GATEWAY_TOKEN,
  gatewayPassword: GATEWAY_PASSWORD,
  stateDir: DATA_DIR,
});

orchestrator.startGateway();

const app = buildApp(db, orchestrator);

app.listen({ host: HOST, port: PORT }).then((address) => {
  // attach WS after server is listening
  attachDashboardWs(app.server, hub, orchestrator);
  app.log.info({ address }, "mcc server listening");
});
