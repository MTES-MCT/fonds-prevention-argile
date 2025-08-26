import { useIsDesktop } from "../index";

describe("hooks index", () => {
  it("should export all hooks", () => {
    expect(useIsDesktop).toBeDefined();
  });
});
