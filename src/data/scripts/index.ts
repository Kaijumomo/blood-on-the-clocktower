import type { Script } from "@/stores/types";
import { troubleBrewing } from "./troubleBrewing";
import { sectsAndViolets } from "./sectsAndViolets";
import { badMoonRising } from "./badMoonRising";

export const BUILTIN_SCRIPTS: Record<string, Script> = {
  tb: troubleBrewing,
  snv: sectsAndViolets,
  bmr: badMoonRising,
};

export const BUILTIN_SCRIPT_IDS = new Set(Object.keys(BUILTIN_SCRIPTS));

let cachedList: Script[] | null = null;
export function listBuiltinScripts(): Script[] {
  if (!cachedList) cachedList = Object.values(BUILTIN_SCRIPTS);
  return cachedList;
}

export function getBuiltinScript(id: string): Script | undefined {
  return BUILTIN_SCRIPTS[id];
}
