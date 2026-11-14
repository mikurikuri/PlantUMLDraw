import { useEffect, useState } from "react";
import { getRendererStatus, type RendererStatus, type Settings } from "../lib/ipc";
import { describeError } from "./Preview";

interface Props {
  initial: Settings;
  onSave: (settings: Settings) => Promise<void>;
  onClose: () => void;
}

export function SettingsDialog({ initial, onSave, onClose }: Props) {
  const [javaPath, setJavaPath] = useState(initial.javaPath ?? "");
  const [jarPath, setJarPath] = useState(initial.plantumlJar ?? "");
  const [status, setStatus] = useState<RendererStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRendererStatus().then(setStatus, () => setStatus(null));
  }, []);

  const save = async () => {
    try {
      await onSave({ javaPath: javaPath || null, plantumlJar: jarPath || null });
      onClose();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="modal-backdrop" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h2 id="settings-title">設定</h2>
        <label>
          java のパス
          <input
            value={javaPath}
            onChange={(e) => setJavaPath(e.target.value)}
            placeholder="空欄なら JAVA_HOME → PATH の順に自動検出"
          />
        </label>
        <label>
          plantuml.jar のパス
          <input
            value={jarPath}
            onChange={(e) => setJarPath(e.target.value)}
            placeholder="空欄なら同梱版を使用"
          />
        </label>
        <dl className="status">
          <dt>現在の Java</dt>
          <dd>
            {!status
              ? "確認中…"
              : "Ok" in status.javaVersion
                ? `${status.javaVersion.Ok}（${status.javaPath}）`
                : describeError(status.javaVersion.Err)}
          </dd>
          <dt>現在の plantuml.jar</dt>
          <dd>
            {!status
              ? "確認中…"
              : `${status.jarPath ?? "（なし）"}${status.jarFound ? "" : "（見つかりません）"}`}
          </dd>
        </dl>
        <p className="hint">保存すると、すぐに図を描き直します。</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            キャンセル
          </button>
          <button type="button" className="primary" onClick={save}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
