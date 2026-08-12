import { TRPCError } from "@trpc/server";
import { promises as fs } from "node:fs";
import path from "node:path";

const HEARTBEAT_STORE = path.resolve(process.cwd(), "server", "_data", "heartbeat-jobs.json");

export type HeartbeatJob = {
  name: string;
  /**
   * 6-field cron with seconds (`sec min hour dom mon dow`), UTC, min interval 60s.
   * Use `0` for the seconds field — e.g. `"0 0 9 * * *"` is daily 09:00 UTC.
   * See /home/ubuntu/skills/webdev-periodic-updates/SKILL.md.
   */
  cron: string;
  /** Callback path. MUST start with `/api/scheduled/`. */
  path: string;
  method?: "POST" | "PUT";
  payload?: unknown;
  description?: string;
};

/**
 * Update patch. All fields optional; unset = leave unchanged.
 * `enable`: true = resume, false = pause; omit = unchanged.
 * `name` is the (project, owner)-scope key and cannot be changed.
 */
export type HeartbeatJobUpdate = Partial<Omit<HeartbeatJob, "name">> & {
  enable?: boolean;
};

export type HeartbeatJobInfo = {
  taskUid: string;
  name: string;
  userId: string;
  description: string;
  cronExpression: string;
  callbackPath: string;
  callbackMethod: string;
  callbackPayload: string;
  isEnable: boolean;
  createdAt?: string | null;
  lastExecutedAt?: string | null;
  nextExecutionAt?: string | null;
};

const SERVICE = "webdevtoken.v1.WebDevService";

type StoredHeartbeatJob = HeartbeatJob & {
  taskUid: string;
  userSession: string;
  isEnable: boolean;
  createdAt: string;
  lastExecutedAt?: string | null;
  nextExecutionAt?: string | null;
};

async function readStore(): Promise<StoredHeartbeatJob[]> {
  try {
    const raw = await fs.readFile(HEARTBEAT_STORE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredHeartbeatJob[]) : [];
  } catch {
    return [];
  }
}

async function writeStore(jobs: StoredHeartbeatJob[]): Promise<void> {
  await fs.mkdir(path.dirname(HEARTBEAT_STORE), { recursive: true });
  await fs.writeFile(HEARTBEAT_STORE, JSON.stringify(jobs, null, 2), "utf-8");
}

function resolveActorUserId(userSession: string): string {
  return userSession || "local-owner";
}

const stringifyPayload = (payload: unknown): string => {
  if (payload === undefined || payload === null) return "{}";
  if (typeof payload === "string") return payload;
  return JSON.stringify(payload);
};

const validateCallbackPath = (path: string): void => {
  if (!path || !path.startsWith("/api/scheduled/")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "callback path must start with /api/scheduled/",
    });
  }
};

/**
 * Create a new HTTP cron job. Returns the assigned `taskUid` to persist on
 * your business row so callbacks can dereference it.
 */
export async function createHeartbeatJob(
  job: HeartbeatJob,
  userSession: string
): Promise<{ taskUid: string; nextExecutionAt?: string | null }> {
  validateCallbackPath(job.path);
  const jobs = await readStore();
  const taskUid = `local_${crypto.randomUUID()}`;
  const nextExecutionAt = null;
  jobs.push({
    ...job,
    taskUid,
    userSession,
    isEnable: true,
    createdAt: new Date().toISOString(),
    nextExecutionAt,
  });
  await writeStore(jobs);
  return { taskUid, nextExecutionAt };
}

/**
 * Update an existing cron located by `taskUid`. Only fields you pass in
 * `patch` are mutated. `enable` flips resume/pause; omit to leave alone.
 */
export async function updateHeartbeatJob(
  taskUid: string,
  patch: HeartbeatJobUpdate,
  userSession: string
): Promise<{ nextExecutionAt?: string | null }> {
  if (patch.path !== undefined) validateCallbackPath(patch.path);
  const jobs = await readStore();
  const job = jobs.find((entry) => entry.taskUid === taskUid);
  if (!job) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Heartbeat job not found" });
  }
  if (job.userSession !== userSession) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cannot update another session's heartbeat job" });
  }
  if (patch.cron !== undefined) job.cron = patch.cron;
  if (patch.path !== undefined) job.path = patch.path;
  if (patch.method !== undefined) job.method = patch.method;
  if (patch.payload !== undefined) job.payload = patch.payload;
  if (patch.description !== undefined) job.description = patch.description;
  if (patch.enable !== undefined) job.isEnable = patch.enable;
  await writeStore(jobs);
  return { nextExecutionAt: job.nextExecutionAt ?? null };
}

/** Delete a cron located by `taskUid`. Idempotent on caller side. */
export async function deleteHeartbeatJob(
  taskUid: string,
  userSession: string
): Promise<void> {
  const jobs = await readStore();
  const nextJobs = jobs.filter((entry) => entry.taskUid !== taskUid || entry.userSession !== userSession);
  await writeStore(nextJobs);
}

/**
 * List cron jobs owned by the resolved actor (end-user when `userSession`
 * is set, project owner otherwise) within the current project.
 *
 * `actorUserId` in the response echoes whose cron list you got back. End-users
 * cannot list other users' crons via this SDK; cross-user inspection is
 * owner-only via the sandbox CLI (`manus-heartbeat list --user-id <uid>`).
 */
export async function listHeartbeatJobs(
  userSession: string,
  pagination?: { page?: number; pageSize?: number }
): Promise<{ total: number; actorUserId: string; jobs: HeartbeatJobInfo[] }> {
  const jobs = await readStore();
  const actorUserId = resolveActorUserId(userSession);
  const filtered = jobs.filter((entry) => entry.userSession === userSession);
  const pageSize = Math.max(1, (pagination?.pageSize ?? filtered.length) || 20);
  const page = Math.max(1, pagination?.page ?? 1);
  const start = (page - 1) * pageSize;
  const sliced = filtered.slice(start, start + pageSize);
  return {
    total: filtered.length,
    actorUserId,
    jobs: sliced.map((job) => ({
      taskUid: job.taskUid,
      name: job.name,
      userId: actorUserId,
      description: job.description ?? "",
      cronExpression: job.cron,
      callbackPath: job.path,
      callbackMethod: job.method ?? "POST",
      callbackPayload: stringifyPayload(job.payload),
      isEnable: job.isEnable,
      createdAt: job.createdAt,
      lastExecutedAt: job.lastExecutedAt ?? null,
      nextExecutionAt: job.nextExecutionAt ?? null,
    })),
  };
}
