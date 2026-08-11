import type { ModuleKey } from "./types";

/** Open the single app-level Quick Add surface from any page. */
export function requestQuickAdd(module?: ModuleKey) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ModuleKey | undefined>("bcc:quick-add", { detail: module }));
}
