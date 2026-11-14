import { useEffect, useState } from "react";
import { getAppInfo, type AppInfo } from "./lib/ipc";

export default function App() {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAppInfo()
      .then(setInfo)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  return (
    <main className="app">
      <header className="app-header">
        <h1>PlantUMLDraw</h1>
        {info && <span className="version">v{info.version}</span>}
      </header>
      <section className="placeholder">
        <p>エディターはイテレーション 1 で実装予定です。</p>
        {error && (
          <p role="alert" className="error">
            バックエンドに接続できません：{error}
          </p>
        )}
      </section>
    </main>
  );
}
