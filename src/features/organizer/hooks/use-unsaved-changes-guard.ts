import { useCallback, useEffect, useRef } from "react";
import {
  useBlocker,
  type Blocker,
  type BlockerFunction,
} from "react-router-dom";

export interface UnsavedChangesGuardResult {
  blocker: Blocker;
  /** Allows the next programmatic in-app navigation to proceed without blocking. */
  allowNextNavigation: () => void;
}

/**
 * Reusable dirty-form guard modeled on `org-settings-form.tsx`:
 * notifies an optional `onDirtyChange` callback, registers a `beforeunload`
 * listener while `isDirty` is true, and blocks React Router in-app pathname
 * navigations until confirmed or explicitly bypassed.
 */
export function useUnsavedChangesGuard(
  isDirty: boolean,
  onDirtyChange?: (isDirty: boolean) => void,
): UnsavedChangesGuardResult {
  const bypassRef = useRef(false);

  const allowNextNavigation = useCallback(() => {
    bypassRef.current = true;
  }, []);

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

  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) => {
      if (bypassRef.current) {
        bypassRef.current = false;
        return false;
      }
      return isDirty && currentLocation.pathname !== nextLocation.pathname;
    },
    [isDirty],
  );

  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (!isDirty && blocker.state === "blocked") {
      blocker.reset();
    }
  }, [isDirty, blocker]);

  return { blocker, allowNextNavigation };
}
