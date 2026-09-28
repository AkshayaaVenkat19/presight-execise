import { describe, expect, it } from "vitest";
import {
  filterParams,
  readDirectoryState,
  writeDirectoryState,
} from "./directoryState";
import { calculateWindow } from "../hooks/useVirtualWindow";

describe("shareable directory state", () => {
  it("restores repeated and comma-separated filters and validates sort values", () => {
    const state = readDirectoryState(
      new URLSearchParams(
        "q=Alex&hobby=Reading,Hiking&hobby=Reading&nationality=Canada&sortBy=age&sortOrder=DESC&view=table",
      ),
    );
    expect(state).toEqual({
      q: "Alex",
      hobbies: ["Hiking", "Reading"],
      nationalities: ["Canada"],
      sortBy: "age",
      sortOrder: "desc",
      view: "table",
    });
    expect(
      readDirectoryState(new URLSearchParams("sortBy=unsafe&sortOrder=unknown"))
        .sortBy,
    ).toBe("first_name");
  });

  it("updates only requested URL fields and removes cleared filters", () => {
    const params = writeDirectoryState(
      new URLSearchParams("q=Alex&hobby=Reading&sortBy=age&extra=keep"),
      { hobbies: [], nationalities: ["Japan", "Canada", "Japan"] },
    );
    expect(params.get("q")).toBe("Alex");
    expect(params.has("hobby")).toBe(false);
    expect(params.getAll("nationality")).toEqual(["Canada", "Japan"]);
    expect(params.get("extra")).toBe("keep");
  });

  it("uses the same normalized filter parameters for list and facets", () => {
    const params = filterParams({
      q: "  Alex\t Smith  ",
      nationalities: ["Canada"],
      hobbies: ["Reading"],
    });
    expect(params.get("q")).toBe("Alex Smith");
    expect(params.getAll("nationality")).toEqual(["Canada"]);
    expect(params.getAll("hobby")).toEqual(["Reading"]);
    expect(params.has("sortBy")).toBe(false);
  });
});

describe("virtual window", () => {
  it("keeps the rendered range bounded for a large directory", () => {
    const window = calculateWindow(10_000, 196, 196 * 500, 588);
    expect(window).toEqual({ start: 497, end: 506, totalHeight: 1_960_000 });
  });

  it("handles empty lists and scrolling past the end", () => {
    expect(calculateWindow(0, 88, 0, 400)).toEqual({
      start: 0,
      end: 0,
      totalHeight: 0,
    });
    expect(calculateWindow(5, 88, 10_000, 400)).toEqual({
      start: 4,
      end: 5,
      totalHeight: 440,
    });
  });
});
