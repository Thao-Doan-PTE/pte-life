import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/** True only after client-side hydration; avoids SSR/client mismatch without setState-in-effect. */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
