import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

import type { EngineMove, StockfishConfig } from '@/lib/botEngine';
import { buildDifficultyOptions, buildStockfishHtml, parseEngineLine } from '@/lib/stockfishProtocol';

export interface StockfishEngineHandle {
  requestBestMove(fen: string, config: StockfishConfig): Promise<EngineMove | null>;
}

interface StockfishEngineProps {
  /** Only mount the WebView when a Stockfish-tier bot is actually in play. */
  enabled: boolean;
}

// Built once at module load (not per-mount) -- the vendor JS/wasm source
// text never changes at runtime, no reason to reassemble the HTML string
// every time a match screen mounts this component.
const ENGINE_HTML = buildStockfishHtml();

/**
 * Headless engine, no visible UI of its own. Hosts the lite single-threaded
 * Stockfish WASM build inside a hidden WebView -- see stockfishProtocol.ts
 * for exactly how the vendor build is invoked and why (no Worker, no
 * network fetch, wasmBinary passed directly to the Emscripten factory).
 */
export const StockfishEngine = forwardRef<StockfishEngineHandle, StockfishEngineProps>(function StockfishEngine(
  { enabled },
  ref,
) {
  const webviewRef = useRef<WebView>(null);
  const uciReadyRef = useRef(false);
  const readyWaitersRef = useRef<(() => void)[]>([]);
  const pendingRef = useRef<{ resolve: (move: EngineMove | null) => void } | null>(null);

  function send(cmd: string) {
    webviewRef.current?.injectJavaScript(`window.__sfSend(${JSON.stringify(cmd)}); true;`);
  }

  function waitUntilReady(): Promise<void> {
    if (uciReadyRef.current) return Promise.resolve();
    return new Promise((resolve) => {
      readyWaitersRef.current.push(resolve);
    });
  }

  function handleMessage(event: WebViewMessageEvent) {
    const parsed = parseEngineLine(event.nativeEvent.data);
    if (parsed.type === 'ready') {
      // WASM instantiated -- start the UCI handshake.
      send('uci');
    } else if (parsed.type === 'uciok') {
      send('isready');
    } else if (parsed.type === 'readyok') {
      uciReadyRef.current = true;
      readyWaitersRef.current.forEach((resolve) => resolve());
      readyWaitersRef.current = [];
    } else if (parsed.type === 'bestmove') {
      pendingRef.current?.resolve(parsed.move);
      pendingRef.current = null;
    } else if (parsed.type === 'error') {
      console.log('StockfishEngine error:', parsed.message);
      pendingRef.current?.resolve(null);
      pendingRef.current = null;
    }
  }

  useImperativeHandle(ref, () => ({
    async requestBestMove(fen, config) {
      await waitUntilReady();
      return new Promise((resolve) => {
        pendingRef.current = { resolve };
        send('ucinewgame');
        for (const option of buildDifficultyOptions(config)) send(option);
        send(`position fen ${fen}`);
        send(`go movetime ${config.movetimeMs}`);
      });
    },
  }));

  if (!enabled) return null;

  return (
    // Android WebView can render as a hardware-composited surface that
    // ignores normal view z-ordering/clipping -- a `position:absolute` +
    // tiny/offset style on the WebView itself isn't reliably enough to keep
    // it from visually interfering with sibling layout (this is what was
    // showing up as the board and other UI looking "misplaced" once a
    // Stockfish-tier bot mounted this component). Two things fix it: a
    // genuinely zero-size `overflow:hidden` OUTER container so nothing can
    // escape regardless of what the WebView wants to do internally, and
    // `androidLayerType="software"` to force it back into the normal
    // (non-hardware-surface) compositing path that respects that clipping.
    <View style={styles.hiddenContainer} pointerEvents="none">
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: ENGINE_HTML }}
        onMessage={handleMessage}
        androidLayerType="software"
        style={styles.webview}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
  // A real size, not 0x0 -- some Android WebView versions throttle timers on
  // zero-size content. Safe since the outer container clips it to nothing.
  webview: {
    width: 100,
    height: 100,
    opacity: 0,
  },
});
