import { useCallback, useEffect, useState } from 'react';
/**
 * Fetches several list endpoints in parallel. If any one fails, the dashboard shows an error and a
 * Retry button instead of numbers that look complete but are not.
 */
export function useDashboardData(client, paths) {
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const key = JSON.stringify(paths);
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    const entries = Object.entries(paths);
    Promise.all(entries.map(([, path]) => client.get(path)))
      .then((results) => {
        if (cancelled) return;
        const data = Object.fromEntries(entries.map(([k], i) => [k, results[i] ?? []]));
        setState({ status: 'ready', data });
      })
      .catch((e) => {
        if (cancelled) return;
        setState({ status: 'error', error: e instanceof Error ? e : new Error(String(e)), retry });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key, attempt, retry]);
  return state;
}