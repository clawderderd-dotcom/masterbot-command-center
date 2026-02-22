import fs from "node:fs";
import path from "node:path";

export type StoredToken = {
  token: string;
  role: string;
  scopes: string[];
  updatedAtMs: number;
};

type Store = { version: 1; deviceId: string; tokens: Record<string, StoredToken> };

function normalizeRole(role: string) {
  return role.trim();
}

function normalizeScopes(scopes: string[]) {
  const out = new Set<string>();
  for (const s of scopes ?? []) {
    const t = String(s).trim();
    if (t) out.add(t);
  }
  return [...out].sort();
}

function readStore(filePath: string): Store | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || typeof parsed.deviceId !== "string") return null;
    if (!parsed.tokens || typeof parsed.tokens !== "object") return null;
    return parsed as Store;
  } catch {
    return null;
  }
}

function writeStore(filePath: string, store: Store) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // best-effort
  }
}

export function loadDeviceAuthToken(filePath: string, params: { deviceId: string; role: string }) {
  const store = readStore(filePath);
  if (!store) return null;
  if (store.deviceId !== params.deviceId) return null;
  const role = normalizeRole(params.role);
  const entry = store.tokens[role];
  if (!entry || typeof entry.token !== "string") return null;
  return entry;
}

export function storeDeviceAuthToken(
  filePath: string,
  params: { deviceId: string; role: string; token: string; scopes: string[] },
) {
  const existing = readStore(filePath);
  const role = normalizeRole(params.role);
  const next: Store = {
    version: 1,
    deviceId: params.deviceId,
    tokens:
      existing && existing.deviceId === params.deviceId && existing.tokens
        ? { ...existing.tokens }
        : {},
  };

  const entry: StoredToken = {
    token: params.token,
    role,
    scopes: normalizeScopes(params.scopes ?? []),
    updatedAtMs: Date.now(),
  };

  next.tokens[role] = entry;
  writeStore(filePath, next);
  return entry;
}

export function clearDeviceAuthToken(filePath: string, params: { deviceId: string; role: string }) {
  const store = readStore(filePath);
  if (!store || store.deviceId !== params.deviceId) return;
  const role = normalizeRole(params.role);
  if (!store.tokens[role]) return;

  const next: Store = { version: 1, deviceId: store.deviceId, tokens: { ...store.tokens } };
  delete next.tokens[role];
  writeStore(filePath, next);
}
