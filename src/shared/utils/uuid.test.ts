import { describe, it, expect } from "vitest";
import { isUuid } from "./uuid.utils";

describe("isUuid", () => {
  it("accepte un uuid v4", () => {
    expect(isUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
  });

  it("accepte un uuid en majuscules", () => {
    expect(isUuid("AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE")).toBe(true);
  });

  it.each(["", "pas-un-uuid", "11111111111141118111111111111111", "11111111-1111-4111-8111-11111111111"])(
    "rejette %j",
    (value) => {
      expect(isUuid(value)).toBe(false);
    }
  );
});
