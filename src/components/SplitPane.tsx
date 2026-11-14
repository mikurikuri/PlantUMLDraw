import { useRef, useState, type ReactNode } from "react";

interface Props {
  left: ReactNode;
  right: ReactNode;
  /** 左ペインの初期比率（0〜1） */
  initialRatio?: number;
}

const MIN = 0.15;
const MAX = 0.85;
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));

/** 左右 2 ペイン。境界をドラッグ（または矢印キー）で幅を変えられる */
export function SplitPane({ left, right, initialRatio = 0.45 }: Props) {
  const [ratio, setRatio] = useState(initialRatio);
  const container = useRef<HTMLDivElement>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || !container.current) return;
    const rect = container.current.getBoundingClientRect();
    setRatio(clamp((e.clientX - rect.left) / rect.width));
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setRatio((r) => clamp(r - 0.02));
    if (e.key === "ArrowRight") setRatio((r) => clamp(r + 0.02));
  };

  return (
    <div
      className="split"
      ref={container}
      style={{ gridTemplateColumns: `${ratio}fr 6px ${1 - ratio}fr` }}
    >
      <div className="split-pane">{left}</div>
      <div
        className="split-divider"
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(ratio * 100)}
        aria-label="エディターとプレビューの境界"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
      />
      <div className="split-pane">{right}</div>
    </div>
  );
}
