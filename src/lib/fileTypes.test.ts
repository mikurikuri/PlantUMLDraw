import { isPlantUmlFile } from "./fileTypes";

describe("isPlantUmlFile", () => {
  it.each(["a.puml", "a.plantuml", "a.pu", "a.iuml", "A.PUML"])("%s は PlantUML ファイル", (p) => {
    expect(isPlantUmlFile(p)).toBe(true);
  });

  it.each(["a.txt", "puml", ".puml", "a.puml.bak", ""])("%s は対象外", (p) => {
    expect(isPlantUmlFile(p)).toBe(false);
  });

  it("Windows / POSIX のパスを扱える", () => {
    expect(isPlantUmlFile("C:\\docs\\design\\seq.puml")).toBe(true);
    expect(isPlantUmlFile("/home/u/design.v2/readme")).toBe(false);
  });
});
