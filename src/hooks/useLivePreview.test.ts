import { act, renderHook } from "@testing-library/react";
import { useLivePreview } from "./useLivePreview";

/** 解決を外から制御できる Promise */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useLivePreview", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("入力が止まってから delay 後に 1 回だけ描画する", async () => {
    const render = vi.fn().mockResolvedValue("<svg>1</svg>");
    const { result, rerender } = renderHook(({ src }) => useLivePreview(src, render, 300), {
      initialProps: { src: "a" },
    });
    rerender({ src: "ab" });
    rerender({ src: "abc" });
    await act(() => vi.advanceTimersByTimeAsync(299));
    expect(render).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith("abc");
    expect(result.current).toEqual({ svg: "<svg>1</svg>", error: null, rendering: false });
  });

  it("エラーになっても直前の SVG を残す", async () => {
    const render = vi
      .fn()
      .mockResolvedValueOnce("<svg>ok</svg>")
      .mockRejectedValueOnce({ kind: "syntax", line: 3, message: "Syntax Error?" });
    const { result, rerender } = renderHook(({ src }) => useLivePreview(src, render, 300), {
      initialProps: { src: "ok" },
    });
    await act(() => vi.advanceTimersByTimeAsync(300));
    rerender({ src: "broken" });
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(result.current.svg).toBe("<svg>ok</svg>");
    expect(result.current.error).toEqual({ kind: "syntax", line: 3, message: "Syntax Error?" });
  });

  it("古い要求の結果は、後から届いても捨てる", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const render = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(({ src }) => useLivePreview(src, render, 300), {
      initialProps: { src: "v1" },
    });
    await act(() => vi.advanceTimersByTimeAsync(300));
    rerender({ src: "v2" });
    await act(() => vi.advanceTimersByTimeAsync(300));
    await act(async () => second.resolve("<svg>v2</svg>"));
    await act(async () => first.resolve("<svg>v1</svg>"));
    expect(result.current.svg).toBe("<svg>v2</svg>");
  });

  it("文字列で失敗しても failed エラーとして扱う", async () => {
    const render = vi.fn().mockRejectedValue("IPC error");
    const { result } = renderHook(() => useLivePreview("x", render, 300));
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(result.current.error).toEqual({ kind: "failed", message: "IPC error" });
  });

  it("refreshKey を変えると同じソースでも描き直す", async () => {
    const render = vi.fn().mockResolvedValue("<svg/>");
    const { rerender } = renderHook(({ key }) => useLivePreview("x", render, 300, key), {
      initialProps: { key: 0 },
    });
    await act(() => vi.advanceTimersByTimeAsync(300));
    rerender({ key: 1 });
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(render).toHaveBeenCalledTimes(2);
  });
});
