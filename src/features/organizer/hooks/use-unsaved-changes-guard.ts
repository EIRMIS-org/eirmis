import { useEffect } from "react";

/**
 * Reusable dirty-form guard modeled on `org-settings-form.tsx`:
 * notifies an optional `onDirtyChange` callback and registers a
 * `beforeunload` listener while `isDirty` is true.
 */
export function useUnsavedChangesGuard(
  isDirty: boolean,
  onDirtyChange?: (isDirty: boolean) => void,
): void {
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
}
