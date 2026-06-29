"use server";

import { revalidatePath } from "next/cache";
import {
  deleteProjectRow,
  insertProject,
  persistOrder,
  updateProjectRow,
  upsertBio,
} from "@/lib/db";
import { isAuthed, requireEditor, signInWithPin, signOut } from "@/lib/auth";
import { CATEGORIES, type Category, type Project } from "@/lib/types";

function assertCategory(value: string): asserts value is Category {
  if (!CATEGORIES.includes(value as Category)) {
    throw new Error(`Invalid category: ${value}`);
  }
}

/** Attempts to unlock edit mode with a PIN. Returns whether it succeeded. */
export async function login(pin: string): Promise<{ ok: boolean }> {
  const ok = await signInWithPin(String(pin || ""));
  if (ok) revalidatePath("/");
  return { ok };
}

export async function logout(): Promise<void> {
  await signOut();
  revalidatePath("/");
}

export async function createProject(input: {
  category: string;
  name: string;
  url: string;
  desc: string;
  sortOrder: number;
}): Promise<Project> {
  await requireEditor();
  assertCategory(input.category);
  const name = input.name.trim();
  const url = input.url.trim();
  if (!name || !url) throw new Error("Name and URL are required.");

  const project = await insertProject({
    category: input.category,
    name,
    url,
    description: input.desc.trim(),
    sortOrder: input.sortOrder,
  });
  revalidatePath("/");
  return project;
}

export async function editProject(input: {
  id: number;
  name: string;
  url: string;
  desc: string;
}): Promise<Project> {
  await requireEditor();
  const name = input.name.trim();
  const url = input.url.trim();
  if (!name || !url) throw new Error("Name and URL are required.");

  const project = await updateProjectRow({
    id: input.id,
    name,
    url,
    description: input.desc.trim(),
  });
  if (!project) throw new Error("Project not found.");
  revalidatePath("/");
  return project;
}

export async function removeProject(id: number): Promise<void> {
  await requireEditor();
  await deleteProjectRow(id);
  revalidatePath("/");
}

export async function reorderProjects(
  category: string,
  orderedIds: number[],
): Promise<void> {
  await requireEditor();
  assertCategory(category);
  await persistOrder(orderedIds);
  revalidatePath("/");
}

export async function saveBio(value: string): Promise<void> {
  await requireEditor();
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Bio cannot be empty.");
  await upsertBio(trimmed);
  revalidatePath("/");
}

/** Lets the client confirm whether the current session is still an editor. */
export async function checkSession(): Promise<{ authed: boolean }> {
  return { authed: await isAuthed() };
}
