import type { Run, Task } from "@mcc/shared";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const data: any = await res.json();
      msg = data?.message ? `${msg}: ${data.message}` : msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function apiListTasks() {
  return j<{ tasks: Task[] }>(await fetch("/api/tasks"));
}

export async function apiCreateTask(body: any) {
  return j<{ task: Task }>(
    await fetch("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  );
}

export async function apiGetTask(taskId: string) {
  return j<{ task: Task; runs: Run[]; latestRun: Run | null; logs: { ts: string; level: string; message: string }[] }>(
    await fetch(`/api/tasks/${encodeURIComponent(taskId)}`),
  );
}

export async function apiStartTask(taskId: string) {
  return j<{ ok: true }>(await fetch(`/api/tasks/${encodeURIComponent(taskId)}/start`, { method: "POST" }));
}

export async function apiCancelTask(taskId: string) {
  return j<{ ok: true }>(await fetch(`/api/tasks/${encodeURIComponent(taskId)}/cancel`, { method: "POST" }));
}

export async function apiAskUpdate(taskId: string) {
  return j<{ ok: true }>(await fetch(`/api/tasks/${encodeURIComponent(taskId)}/ask-update`, { method: "POST" }));
}

export async function apiSendMessage(taskId: string, text: string) {
  return j<{ ok: true }>(
    await fetch(`/api/tasks/${encodeURIComponent(taskId)}/message`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    }),
  );
}
