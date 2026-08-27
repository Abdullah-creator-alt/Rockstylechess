import { useEffect, useRef, useState, type RefObject } from 'react';

import type { StockfishEngineHandle } from '@/components/StockfishEngine';
import { analyzeGame, type GameAnalysisResult } from '@/lib/gameAnalysis';

export type AnalysisStatus = 'idle' | 'analyzing' | 'done' | 'error';

const ANALYSIS_MOVETIME_MS = 1000;

// Thin wrapper around analyzeGame -- owns the status/progress state and the
// cancellation flag so a replay screen unmounting mid-analysis doesn't leak
// a stale promise chain trying to setState after unmount.
export function useGameAnalysis(pgn: string | null, engineRef: RefObject<StockfishEngineHandle | null>) {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<GameAnalysisResult | null>(null);
  const cancelledRef = useRef(false);

  useEffect(
    () => () => {
      cancelledRef.current = true;
    },
    [],
  );

  function start() {
    if (!pgn || !engineRef.current || status === 'analyzing') return;
    cancelledRef.current = false;
    setStatus('analyzing');
    setProgress({ done: 0, total: 0 });
    analyzeGame(
      pgn,
      (fen, movetimeMs) => engineRef.current!.evaluatePosition(fen, movetimeMs),
      ANALYSIS_MOVETIME_MS,
      (done, total) => {
        if (!cancelledRef.current) setProgress({ done, total });
      },
      () => cancelledRef.current,
    )
      .then((analysis) => {
        if (cancelledRef.current) return;
        setResult(analysis);
        setStatus(analysis ? 'done' : 'error');
      })
      .catch((error) => {
        console.log('useGameAnalysis: analysis failed', error);
        if (!cancelledRef.current) setStatus('error');
      });
  }

  return { status, progress, result, start };
}
