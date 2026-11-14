import { useEffect, useRef, useState } from "react";
import { toRenderError, type RenderError } from "../lib/ipc";

export const RENDER_DELAY_MS = 300;

export interface LivePreview {
  /** 最後に描画に成功した SVG（エラー中も残す：AC1-3） */
  svg: string | null;
  error: RenderError | null;
  rendering: boolean;
}

/**
 * ソースが変わってから `delay` ms 入力が止まったら描画する。
 * 描画中に次の要求が出た場合、古い要求の結果は捨てる。
 * `refreshKey` を変えると同じソースでも描画し直す（設定変更時など）。
 */
export function useLivePreview(
  source: string,
  render: (source: string) => Promise<string>,
  delay = RENDER_DELAY_MS,
  refreshKey = 0,
): LivePreview {
  const [state, setState] = useState<LivePreview>({ svg: null, error: null, rendering: false });
  const latest = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const id = ++latest.current;
      setState((s) => ({ ...s, rendering: true }));
      render(source).then(
        (svg) => {
          if (id === latest.current) setState({ svg, error: null, rendering: false });
        },
        (e: unknown) => {
          if (id === latest.current)
            setState((s) => ({ svg: s.svg, error: toRenderError(e), rendering: false }));
        },
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [source, render, delay, refreshKey]);

  return state;
}
