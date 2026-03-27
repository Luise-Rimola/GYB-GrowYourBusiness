"use server";

import { redirect } from "next/navigation";
import { WorkflowService } from "@/services/workflows";

export async function deleteRunAction(runId: string) {
  await WorkflowService.deleteRun(runId);
  redirect("/runs");
}
