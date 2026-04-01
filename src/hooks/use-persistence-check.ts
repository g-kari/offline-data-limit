import { useState, useCallback } from "react";
import type { PersistenceResult } from "../types";
import { checkAllPersistence, cleanupAllBenchmarkData } from "../utils/persistence-check";

interface UsePersistenceCheckReturn {
  results: PersistenceResult[];
  isChecking: boolean;
  check: () => Promise<void>;
  cleanupAll: () => Promise<void>;
  isCleaning: boolean;
}

/** 全ストレージAPIのベンチマークデータ永続性を検証する hook */
export function usePersistenceCheck(): UsePersistenceCheckReturn {
  const [results, setResults] = useState<PersistenceResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const check = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      const persistenceResults = await checkAllPersistence();
      setResults(persistenceResults);
    } catch {
      setResults([]);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  const cleanupAll = useCallback(async () => {
    if (isCleaning) return;
    setIsCleaning(true);
    try {
      await cleanupAllBenchmarkData();
      // 削除後に再検証して結果を更新
      const persistenceResults = await checkAllPersistence();
      setResults(persistenceResults);
    } finally {
      setIsCleaning(false);
    }
  }, [isCleaning]);

  return { results, isChecking, check, cleanupAll, isCleaning };
}
