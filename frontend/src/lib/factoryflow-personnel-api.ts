// FactoryFlow-owned API helpers that extend the Friend base `lib/api-client.ts`
// without modifying it (only its exported `apiFetch` + types are reused).
//
// FRESH-12:
//   PATCH /api/employees/:id/account                 -> setEmployeeAccountActive
//   POST  /api/employees/:id/account/reset-password  -> resetEmployeeAccountPassword
//   GET   /api/tasks/assignments                     -> listAllTaskAssignments
//
// FRESH-13 — Task ↔ Work Order link. The base `ApiTask` / `TaskInput` types in
// api-client.ts are left untouched; these helpers speak the same endpoints
// (`GET/POST/PUT /api/tasks`) but know about the optional `workId` field the
// FactoryFlow Task model gained in FRESH-13.

import {
  apiFetch,
  type ApiEmployeeAccount,
  type ApiTask,
  type ApiTaskAssignment,
} from "./api-client";

/** enable / disable the employee's 1:1 login account — returns the updated safe view */
export function setEmployeeAccountActive(
  employeeId: string,
  active: boolean,
): Promise<ApiEmployeeAccount> {
  return apiFetch<{ account: ApiEmployeeAccount }>(
    `/api/employees/${encodeURIComponent(employeeId)}/account`,
    { method: "PATCH", body: JSON.stringify({ active }) },
  ).then((r) => r.account);
}

/** set a new password on the employee's login account (204 — nothing returned) */
export function resetEmployeeAccountPassword(employeeId: string, password: string): Promise<void> {
  return apiFetch<void>(`/api/employees/${encodeURIComponent(employeeId)}/account/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

/** every task_assignments row across all tasks, each with the employee's display fields */
export function listAllTaskAssignments(): Promise<ApiTaskAssignment[]> {
  return apiFetch<ApiTaskAssignment[]>("/api/tasks/assignments");
}

// ── FRESH-13 — Task with optional Work link ────────────────────────────────

/** A FactoryFlow Task plus the optional `work_id` link to a Friend Work item
 *  (`Work.workID`, e.g. "WRK-0002"). `null` = an ad-hoc task with no production
 *  origin. Everything else is copied from the base `ApiTask`. */
export type ApiTaskWithWork = ApiTask & { workId: string | null };

/** Writable Task shape including the optional link. `workId` omitted / `null` /
 *  `""` all mean "ad-hoc". On PUT, `null` clears an existing link. */
export type TaskWithWorkInput = {
  title: string;
  description?: string;
  machineId?: string | null;
  shift?: string;
  status?: string;
  workId?: string | null;
};

export function listTasksWithWork(): Promise<ApiTaskWithWork[]> {
  return apiFetch<ApiTaskWithWork[]>("/api/tasks");
}

export function createTaskWithWork(input: TaskWithWorkInput): Promise<ApiTaskWithWork> {
  return apiFetch<ApiTaskWithWork>("/api/tasks", { method: "POST", body: JSON.stringify(input) });
}

export function updateTaskWithWork(id: string, input: TaskWithWorkInput): Promise<ApiTaskWithWork> {
  return apiFetch<ApiTaskWithWork>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
