import { useEffect, useMemo } from "react";
import type { RenderError } from "../lib/ipc";

interface Props {
  svg: string | null;
  error: RenderError | null;
  rendering: boolean;
  onOpenSettings: () => void;
}

/**
 * SVG は <img> で表示する（SVG 内のスクリプトやリンクを実行させないため）。
 * エラー中も直前に成功した図を残し、エラー内容を下部に表示する（AC1-3）。
 */
export function Preview({ svg, error, rendering, onOpenSettings }: Props) {
  const url = useMemo(
    () => (svg ? URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })) : null),
    [svg],
  );
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const setupProblem = error && (error.kind === "javaNotFound" || error.kind === "jarNotFound");

  return (
    <div className="preview">
      <div className="preview-canvas" aria-busy={rendering}>
        {url && !setupProblem && (
          <img src={url} alt="プレビュー" className={error ? "stale" : undefined} />
        )}
        {!url && !error && <p className="preview-empty">{rendering ? "描画中…" : ""}</p>}
        {setupProblem && <SetupProblem error={error} onOpenSettings={onOpenSettings} />}
      </div>
      {error && !setupProblem && (
        <div className="preview-error" role="alert">
          {describeError(error)}
        </div>
      )}
    </div>
  );
}

export function describeError(e: RenderError): string {
  switch (e.kind) {
    case "syntax":
      return e.line ? `${e.line} 行目：${e.message}` : e.message;
    case "timeout":
      return `描画が ${e.seconds} 秒以内に終わりませんでした。図が大きすぎないか確認してください。`;
    case "failed":
      return `描画に失敗しました：${e.message}`;
    case "javaNotFound":
      return `Java が見つかりません（${e.java}）`;
    case "jarNotFound":
      return `plantuml.jar が見つかりません（${e.path}）`;
  }
}

/** Java / plantuml.jar が見つからないときの案内（AC1-6） */
function SetupProblem({
  error,
  onOpenSettings,
}: {
  error: Extract<RenderError, { kind: "javaNotFound" | "jarNotFound" }>;
  onOpenSettings: () => void;
}) {
  return (
    <section className="setup-problem" role="alert">
      <h2>
        {error.kind === "javaNotFound" ? "Java が見つかりません" : "plantuml.jar が見つかりません"}
      </h2>
      {error.kind === "javaNotFound" ? (
        <>
          <p>
            図の描画には Java 17 以降が必要です。探した場所：<code>{error.java}</code>
          </p>
          <ol>
            <li>
              Java をインストールします（例：
              <code>winget install EclipseAdoptium.Temurin.21.JDK</code>）。
            </li>
            <li>インストール後、このアプリを起動し直します。</li>
            <li>別の場所にある Java を使う場合は、設定で java のパスを指定します。</li>
          </ol>
        </>
      ) : (
        <>
          <p>
            探した場所：<code>{error.path}</code>
          </p>
          <ol>
            <li>アプリを入れ直すか、設定で plantuml.jar のパスを指定します。</li>
          </ol>
        </>
      )}
      <button type="button" onClick={onOpenSettings}>
        設定を開く
      </button>
    </section>
  );
}
