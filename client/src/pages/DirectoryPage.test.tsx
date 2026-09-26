import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import type { User } from "../types/directory";

const users: User[] = Array.from({ length: 90 }, (_, index) => ({
  id: index + 1,
  avatar: "",
  first_name: index % 2 === 0 ? "Alex" : "Beth",
  last_name: `Person ${String(index + 1).padStart(3, "0")}`,
  age: 20 + index,
  nationality: index % 2 === 0 ? "Canada" : "Japan",
  hobbies: ["Reading", "Hiking", "Music"],
}));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function apiResponse(input: RequestInfo | URL) {
  const url = new URL(String(input), "http://localhost");
  const q = url.searchParams.get("q")?.toLowerCase() ?? "";
  const nationalities = url.searchParams.getAll("nationality");
  const hobbies = url.searchParams.getAll("hobby");
  const matches = users.filter(
    (user) =>
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(q) &&
      (!nationalities.length || nationalities.includes(user.nationality)) &&
      hobbies.every((hobby) => user.hobbies.includes(hobby)),
  );
  if (url.pathname === "/api/filters") {
    const values = (items: string[]) =>
      [...new Set(items)].map((value) => ({
        value,
        count: items.filter((item) => item === value).length,
      }));
    return json({
      data: {
        nationalities: values(matches.map((user) => user.nationality)),
        hobbies: values(matches.flatMap((user) => user.hobbies)),
      },
    });
  }
  const page = Number(url.searchParams.get("page"));
  return json({
    data: matches.slice((page - 1) * 30, page * 30),
    pagination: {
      page,
      limit: 30,
      total: matches.length,
      totalPages: Math.ceil(matches.length / 30),
      hasMore: page * 30 < matches.length,
    },
  });
}

function NavigationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="url">
        {location.pathname}
        {location.search}
      </output>
      <button onClick={() => navigate(-1)}>Browser back</button>
    </>
  );
}

function renderApp(path = "/directory") {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        retryDelay: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
      },
    },
  });
  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
        <NavigationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...result, client };
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(392);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => apiResponse(input)),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("directory interactions", () => {
  it("restores shared URL state and shows two hobbies plus the remaining count", async () => {
    renderApp(
      "/?q=Alex&nationality=Canada&hobby=Reading&sortBy=age&sortOrder=desc",
    );
    expect(
      await screen.findByRole("region", { name: "User directory, cards view" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("Alex");
    expect(screen.getByLabelText("Sort by")).toHaveValue("age");
    expect(screen.getByLabelText("Sort direction")).toHaveValue("desc");
    expect(screen.getByTestId("url").textContent).toContain("/directory?");
    expect(screen.getByRole("button", { name: "Cards" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const first = screen.getAllByRole("article")[0];
    expect(within(first).getByText("Reading")).toBeInTheDocument();
    expect(within(first).getByText("Hiking")).toBeInTheDocument();
    expect(within(first).getByText("+1")).toHaveAttribute("title", "Music");
    expect(within(first).queryByText("Music")).not.toBeInTheDocument();
    const requests = vi
      .mocked(fetch)
      .mock.calls.map(([input]) => new URL(String(input), "http://localhost"));
    expect(
      requests
        .find((url) => url.pathname === "/api/users")
        ?.searchParams.get("sortOrder"),
    ).toBe("desc");
  });

  it("refreshes users and counts together, removes filters, and restores browser history", async () => {
    renderApp();
    await screen.findByRole("region", { name: "User directory, cards view" });
    fireEvent.click(screen.getByRole("checkbox", { name: /Canada/ }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Remove nationality Canada" }),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: /Reading, 45/ }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("checkbox", { name: /Japan/ }),
    ).not.toBeInTheDocument();
    const requests = vi
      .mocked(fetch)
      .mock.calls.map(([input]) => new URL(String(input), "http://localhost"));
    for (const endpoint of ["/api/users", "/api/filters"])
      expect(
        requests.some(
          (url) =>
            url.pathname === endpoint &&
            url.searchParams.get("nationality") === "Canada",
        ),
      ).toBe(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Remove nationality Canada" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Remove nationality Canada" }),
      ).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Browser back"));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Remove nationality Canada" }),
      ).toBeInTheDocument(),
    );
  });

  it("debounces search, updates the URL, and refreshes both endpoints", async () => {
    renderApp();
    await screen.findByRole("region", { name: "User directory, cards view" });
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Beth" },
    });
    expect(screen.getByTestId("url").textContent).toContain("q=Beth");
    expect(
      screen.getByRole("status", { name: "Loading users" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: /Japan, 45/ }),
      ).toBeInTheDocument(),
    );
    const requests = vi
      .mocked(fetch)
      .mock.calls.map(([input]) => new URL(String(input), "http://localhost"));
    for (const endpoint of ["/api/users", "/api/filters"])
      expect(
        requests.some(
          (url) =>
            url.pathname === endpoint && url.searchParams.get("q") === "Beth",
        ),
      ).toBe(true);
  });

  it("virtualizes cards, loads the next page on scroll, and switches to a table", async () => {
    renderApp();
    const viewport = await screen.findByRole("region", {
      name: "User directory, cards view",
    });
    await waitFor(() =>
      expect(screen.getAllByRole("article").length).toBeLessThan(30),
    );
    fireEvent.scroll(viewport, { target: { scrollTop: 2400 } });
    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(([input]) => String(input).includes("page=2")),
      ).toBe(true),
    );
    expect(screen.getAllByRole("article").length).toBeLessThan(30);
    fireEvent.click(screen.getByRole("button", { name: "Table" }));
    const table = await screen.findByRole("table");
    expect(screen.getByRole("button", { name: "Table" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      within(table).getByRole("columnheader", { name: "Nationality" }),
    ).toBeInTheDocument();
    expect(within(table).getAllByRole("row").length).toBeLessThan(30);
    expect(screen.getByTestId("url").textContent).toContain("view=table");
  });

  it("shows an empty state while keeping selected zero-count filters removable", async () => {
    renderApp("/directory?q=Nobody&nationality=Canada");
    expect(await screen.findByText("No people found")).toBeInTheDocument();
    expect(
      await screen.findByRole("checkbox", { name: /Canada, 0/ }),
    ).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(
      await screen.findByRole("region", { name: "User directory, cards view" }),
    ).toBeInTheDocument();
  });

  it("restarts pagination after sorting without refreshing unchanged facets", async () => {
    renderApp();
    const viewport = await screen.findByRole("region", {
      name: "User directory, cards view",
    });
    await screen.findByRole("checkbox", { name: /Canada/ });
    fireEvent.scroll(viewport, { target: { scrollTop: 2400 } });
    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(([input]) => String(input).includes("page=2")),
      ).toBe(true),
    );
    const facetRequests = vi
      .mocked(fetch)
      .mock.calls.filter(([input]) =>
        String(input).startsWith("/api/filters"),
      ).length;
    fireEvent.change(screen.getByLabelText("Sort by"), {
      target: { value: "age" },
    });
    await waitFor(() => {
      const requests = vi
        .mocked(fetch)
        .mock.calls.map(
          ([input]) => new URL(String(input), "http://localhost"),
        );
      expect(
        requests.some(
          (url) =>
            url.pathname === "/api/users" &&
            url.searchParams.get("sortBy") === "age" &&
            url.searchParams.get("page") === "1",
        ),
      ).toBe(true);
    });
    const resetViewport = await screen.findByRole("region", {
      name: "User directory, cards view",
    });
    expect(resetViewport.scrollTop).toBe(0);
    expect(
      vi
        .mocked(fetch)
        .mock.calls.filter(([input]) =>
          String(input).startsWith("/api/filters"),
        ).length,
    ).toBe(facetRequests);
    fireEvent.change(screen.getByLabelText("Sort direction"), {
      target: { value: "desc" },
    });
    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(([input]) =>
            String(input).includes("sortOrder=desc"),
          ),
      ).toBe(true),
    );
    expect(screen.getByTestId("url").textContent).toContain("sortOrder=desc");
  });

  it("loads more table rows while keeping the rendered row count bounded", async () => {
    renderApp("/directory?view=table");
    const viewport = await screen.findByRole("region", {
      name: "User directory, table view",
    });
    fireEvent.scroll(viewport, { target: { scrollTop: 2400 } });
    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(([input]) => String(input).includes("page=2")),
      ).toBe(true),
    );
    expect(
      within(screen.getByRole("table")).getAllByRole("row").length,
    ).toBeLessThan(30);
  });

  it("handles API errors with a retry that recovers the list and facets", async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      json({ error: { message: "Database query failed" } }, 500),
    );
    renderApp();
    expect(
      await screen.findByText("Couldn’t load the directory"),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Retry filters" }),
    ).toBeInTheDocument();
    vi.mocked(fetch).mockImplementation(async (input) => apiResponse(input));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    fireEvent.click(screen.getByRole("button", { name: "Retry filters" }));
    expect(
      await screen.findByRole("region", { name: "User directory, cards view" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("checkbox", { name: /Canada/ }),
    ).toBeInTheDocument();
  });

  it("retains existing users when loading another page fails and supports retry", async () => {
    vi.mocked(fetch).mockImplementation(async (input) =>
      String(input).includes("page=2")
        ? json({ error: { message: "Temporary failure" } }, 500)
        : apiResponse(input),
    );
    renderApp();
    const viewport = await screen.findByRole("region", {
      name: "User directory, cards view",
    });
    fireEvent.scroll(viewport, { target: { scrollTop: 2400 } });
    const retry = await screen.findByRole("button", {
      name: "Retry loading more",
    });
    expect(screen.getAllByRole("article").length).toBeGreaterThan(0);
    vi.mocked(fetch).mockImplementation(async (input) => apiResponse(input));
    fireEvent.click(retry);
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Retry loading more" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("persists theme changes and handles unknown routes", async () => {
    renderApp("/missing");
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("dark");
    fireEvent.click(
      screen.getByRole("button", { name: "Switch to day theme" }),
    );
    await act(async () => {});
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("presight-theme")).toBe("light");
    fireEvent.click(screen.getByRole("link", { name: "Back to directory" }));
    expect(
      await screen.findByRole("region", { name: "User directory, cards view" }),
    ).toBeInTheDocument();
  });
});
