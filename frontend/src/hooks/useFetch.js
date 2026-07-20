import { useCallback, useEffect, useRef, useState } from "react";

// Fetches real API data with loading/refresh state. `fetcher` receives no args
// and should already close over token/params. Re-runs whenever deps change.
export const useFetch = (fetcher, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async (mode = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);

    try {
      const result = await fetcher();
      if (alive.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (alive.current) setError(err);
    } finally {
      if (alive.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh: () => load("refresh"),
    reload: () => load("initial"),
  };
};

export default useFetch;
