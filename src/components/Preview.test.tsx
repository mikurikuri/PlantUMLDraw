import { fireEvent, render, screen } from "@testing-library/react";
import { Preview } from "./Preview";

const noop = () => undefined;

describe("Preview", () => {
  it("SVG を画像として表示する", () => {
    render(<Preview svg="<svg/>" error={null} rendering={false} onOpenSettings={noop} />);
    expect(screen.getByAltText("プレビュー")).toHaveAttribute(
      "src",
      expect.stringMatching(/^blob:/),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("構文エラーは行番号付きで表示し、直前の図は薄く残す（AC1-3）", () => {
    render(
      <Preview
        svg="<svg/>"
        error={{ kind: "syntax", line: 3, message: "Syntax Error?" }}
        rendering={false}
        onOpenSettings={noop}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("3 行目：Syntax Error?");
    expect(screen.getByAltText("プレビュー")).toHaveClass("stale");
  });

  it("Java が見つからないときは対処方法と設定ボタンを出す（AC1-6）", () => {
    const onOpenSettings = vi.fn();
    render(
      <Preview
        svg={null}
        error={{ kind: "javaNotFound", java: "java" }}
        rendering={false}
        onOpenSettings={onOpenSettings}
      />,
    );
    expect(screen.getByRole("heading")).toHaveTextContent("Java が見つかりません");
    expect(screen.getByRole("alert")).toHaveTextContent("winget install");
    fireEvent.click(screen.getByRole("button", { name: "設定を開く" }));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it("plantuml.jar が見つからないときも案内を出す", () => {
    render(
      <Preview
        svg={null}
        error={{ kind: "jarNotFound", path: "x.jar" }}
        rendering={false}
        onOpenSettings={noop}
      />,
    );
    expect(screen.getByRole("heading")).toHaveTextContent("plantuml.jar が見つかりません");
  });
});
