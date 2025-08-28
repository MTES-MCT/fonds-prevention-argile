import { useMatomo } from "../useMatomo";

describe("hooks index", () => {
  it("should export all hooks", () => {
    expect(useMatomo).toBeDefined();
  });
});
