import { render, screen } from "@testing-library/react";
import App from "./App";
import { getAppInfo } from "./lib/ipc";

vi.mock("./lib/ipc", () => ({ getAppInfo: vi.fn() }));

describe("App", () => {
  afterEach(() => vi.mocked(getAppInfo).mockReset());

  it("バックエンドから取得したバージョンを表示する", async () => {
    vi.mocked(getAppInfo).mockResolvedValue({ name: "PlantUMLDraw", version: "0.1.0" });
    render(<App />);
    expect(await screen.findByText("v0.1.0")).toBeInTheDocument();
  });

  it("バックエンド接続に失敗したらエラーを表示する", async () => {
    vi.mocked(getAppInfo).mockRejectedValue(new Error("boom"));
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("boom");
  });
});
