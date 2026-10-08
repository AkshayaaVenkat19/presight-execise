import userEvent from "@testing-library/user-event";
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
  birth_date: `19${String(50 + index).slice(-2)}-03-14`,
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
  if (url.pathname === "/api/auth/me")
    return json({ data: { id: 1, username: "admin" } });
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
  it("shows initial loading before displaying successful results", async () => {
    const pending: Array<() => void> = [];
    vi.mocked(fetch).mockImplementation((input) => {
      if (String(input) === "/api/auth/me")
        return Promise.resolve(apiResponse(input));
      return new Promise<Response>((resolve) =>
        pending.push(() => resolve(apiResponse(input))),
      );
    });
    renderApp();
    expect(await screen.findByLabelText("Loading users")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Directory results" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("No users yet")).not.toBeInTheDocument();
    await act(async () => pending.forEach((resolve) => resolve()));
    expect(
      await screen.findByRole("region", { name: "User directory, cards view" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Directory results" }),
    ).toHaveAttribute("aria-busy", "false");
  });

  it("distinguishes an empty directory and supports refreshing it", async () => {
    vi.mocked(fetch).mockImplementation(async (input) =>
      String(input).startsWith("/api/users")
        ? json({
            data: [],
            pagination: {
              page: 1,
              limit: 30,
              total: 0,
              totalPages: 0,
              hasMore: false,
            },
          })
        : apiResponse(input),
    );
    renderApp();
    expect(await screen.findByText("No users yet")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
    vi.mocked(fetch).mockImplementation(async (input) => apiResponse(input));
    fireEvent.click(screen.getByRole("button", { name: "Refresh directory" }));
    expect(
      await screen.findByRole("region", { name: "User directory, cards view" }),
    ).toBeInTheDocument();
  });

  it("does not announce empty results while a new search is pending", async () => {
    renderApp("/directory?q=Nobody");
    await screen.findByText("No search results");
    const pending: Array<() => void> = [];
    vi.mocked(fetch).mockImplementation(
      (input) =>
        new Promise<Response>((resolve) => {
          pending.push(() => resolve(apiResponse(input)));
        }),
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Alex" },
    });
    const updatingSkeleton = await screen.findByRole("status", {
      name: "Updating results…",
    });
    expect(updatingSkeleton.querySelector(".skeleton")).toBeInTheDocument();
    expect(screen.queryByText("No search results")).not.toBeInTheDocument();
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(
      screen.getByRole("region", { name: "Directory results" }),
    ).toHaveAttribute("aria-busy", "true");
    await act(async () => pending.forEach((resolve) => resolve()));
    expect(
      await screen.findByRole("region", { name: "User directory, cards view" }),
    ).toBeInTheDocument();
  });

  it.each([
    [
      0,
      "Directory temporarily unavailable",
      "Unable to connect. Please try again.",
    ],
    [503, "Directory temporarily unavailable", "Service unavailable"],
    [500, "Directory temporarily unavailable", "Database query failed"],
    [404, "Couldn’t load the directory", "Endpoint not found"],
  ])(
    "handles failure status %s with retry recovery",
    async (status, title, message) => {
      vi.mocked(fetch).mockImplementation(async (input) => {
        if (!String(input).startsWith("/api/users")) return apiResponse(input);
        if (status === 0) throw new TypeError("Failed to fetch");
        return json({ error: { message } }, status as number);
      });
      renderApp();
      expect(
        await screen.findByRole("heading", { name: title as string }),
      ).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(message as string);
      expect(screen.queryByText("No users yet")).not.toBeInTheDocument();
      vi.mocked(fetch).mockImplementation(async (input) => apiResponse(input));
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(
        await screen.findByRole("region", {
          name: "User directory, cards view",
        }),
      ).toBeInTheDocument();
    },
  );

  it.each([400, 422])(
    "offers correction for invalid requests (%s)",
    async (status) => {
      vi.mocked(fetch).mockImplementation(async (input) =>
        String(input).startsWith("/api/users") && String(input).includes("q=")
          ? json({ error: { message: "Search is invalid" } }, status)
          : apiResponse(input),
      );
      renderApp("/directory?q=invalid");
      expect(
        await screen.findByText("Invalid directory request"),
      ).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("Search is invalid");
      expect(
        screen.queryByRole("button", { name: "Try again" }),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
      expect(
        await screen.findByRole("region", {
          name: "User directory, cards view",
        }),
      ).toBeInTheDocument();
      expect(screen.getByRole("searchbox")).toHaveValue("");
    },
  );

  it.each(["cards", "table"])(
    "keeps %s and filter options visible while filters update",
    async (view) => {
      renderApp(`/directory?view=${view}`);
      await screen.findByRole("region", {
        name: `User directory, ${view} view`,
      });
      const canada = await screen.findByRole("checkbox", {
        name: "Canada, 45 matching people",
      });
      const pending: Array<() => void> = [];
      vi.mocked(fetch).mockImplementation((input) => {
        const url = new URL(String(input), "http://localhost");
        if (url.searchParams.has("nationality")) {
          return new Promise<Response>((resolve) => {
            pending.push(() => resolve(apiResponse(input)));
          });
        }
        return Promise.resolve(apiResponse(input));
      });
      fireEvent.click(canada);
      await waitFor(() => expect(pending).toHaveLength(2));
      expect(
        screen.getByRole("region", { name: `User directory, ${view} view` }),
      ).toBeInTheDocument();
      expect(canada).toBeChecked();
      expect(screen.queryByLabelText("Loading users")).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText("Loading nationalities"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Updating…")).toBeInTheDocument();
      await act(async () => {
        pending.forEach((resolve) => resolve());
      });
      await waitFor(() =>
        expect(screen.queryByText("Updating…")).not.toBeInTheDocument(),
      );
      expect(
        screen.getByRole("region", { name: `User directory, ${view} view` }),
      ).not.toHaveTextContent("Beth");
    },
  );

  it("restores shared URL state and shows two hobbies plus the remaining count", async () => {
    renderApp(
      "/?q=Alex&nationality=Canada&hobby=Reading&sortBy=birth_date&sortOrder=desc",
    );
    expect(
      await screen.findByRole("region", { name: "User directory, cards view" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("Alex");
    expect(screen.getByLabelText("Sort by")).toHaveValue("birth_date");
    expect(
      screen.getByRole("button", { name: "Sort descending" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("url").textContent).toContain("/directory?");
    expect(screen.getByRole("button", { name: "Cards" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const first = screen.getAllByRole("article")[0];
    expect(within(first).getByText("Reading")).toBeInTheDocument();
    expect(within(first).getByText("Hiking")).toBeInTheDocument();
    await userEvent.click(
      within(first).getByRole("button", { name: "1 more hobbies" }),
    );
    expect(
      within(screen.getByRole("dialog", { name: "1 more hobbies" })).getByText(
        "Music",
      ),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
    expect(screen.getByText("Updating…")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("Updating…")).not.toBeInTheDocument(),
    );
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
    const results = screen.getByRole("region", {
      name: "User directory, cards view",
    });
    expect(
      within(results).getByRole("heading", { name: "Beth Person 002" }),
    ).toBeInTheDocument();
    expect(within(results).queryByText(/Alex/)).not.toBeInTheDocument();
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
    expect(await screen.findByText("No search results")).toBeInTheDocument();
    expect(
      await screen.findByRole("checkbox", { name: /Canada, 0/ }),
    ).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(
      await screen.findByRole("region", { name: "User directory, cards view" }),
    ).toBeInTheDocument();
  });

  it.each([
    {
      change: "search",
      param: "q",
      value: "Beth",
      firstUser: "Beth Person 002",
    },
    {
      change: "nationality filter",
      param: "nationality",
      value: "Japan",
      firstUser: "Beth Person 002",
    },
    {
      change: "hobby filter",
      param: "hobby",
      value: "Reading",
      firstUser: "Alex Person 001",
    },
  ])(
    "resets to page 1 after changing $change and paginates the new results",
    async ({ change, param, value, firstUser }) => {
      renderApp();
      const viewport = await screen.findByRole("region", {
        name: "User directory, cards view",
      });
      await screen.findByRole("checkbox", { name: /Reading, 90/ });
      fireEvent.scroll(viewport, { target: { scrollTop: 2400 } });
      // Prove page 2 has rendered before changing the criteria.
      expect(
        await within(viewport).findByRole("heading", {
          name: "Alex Person 031",
        }),
      ).toBeInTheDocument();
      vi.mocked(fetch).mockClear();

      if (change === "search") {
        fireEvent.change(screen.getByRole("searchbox"), { target: { value } });
      } else {
        fireEvent.click(
          screen.getByRole("checkbox", { name: new RegExp(`^${value},`) }),
        );
      }
      await waitFor(() =>
        expect(screen.queryByText("Updating…")).not.toBeInTheDocument(),
      );
      const resetViewport = screen.getByRole("region", {
        name: "User directory, cards view",
      });
      expect(
        await within(resetViewport).findByRole("heading", { name: firstUser }),
      ).toBeInTheDocument();
      expect(resetViewport.scrollTop).toBe(0);
      expect(
        within(resetViewport).queryByRole("heading", {
          name: "Alex Person 031",
        }),
      ).not.toBeInTheDocument();
      const userRequests = () =>
        vi
          .mocked(fetch)
          .mock.calls.map(
            ([input]) => new URL(String(input), "http://localhost"),
          )
          .filter((url) => url.pathname === "/api/users");
      expect(userRequests()).toHaveLength(1);
      expect(userRequests()[0].searchParams.get("page")).toBe("1");
      expect(userRequests()[0].searchParams.get(param)).toBe(value);
      expect(userRequests()[0].searchParams.get("limit")).toBe("30");

      fireEvent.scroll(resetViewport, { target: { scrollTop: 2400 } });
      const nextPageUser =
        change === "hobby filter" ? "Alex Person 031" : "Beth Person 062";
      expect(
        await within(resetViewport).findByRole("heading", {
          name: nextPageUser,
        }),
      ).toBeInTheDocument();
      expect(userRequests().map((url) => url.searchParams.get("page"))).toEqual(
        ["1", "2"],
      );
      expect(
        userRequests().every((url) => url.searchParams.get(param) === value),
      ).toBe(true);
    },
  );

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
    fireEvent.click(screen.getByLabelText("Sort by"));
    fireEvent.click(screen.getByRole("option", { name: "Birth date" }));
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
            url.searchParams.get("sortBy") === "birth_date" &&
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
    fireEvent.click(screen.getByRole("button", { name: "Sort descending" }));
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

  it("uses the compact table row height for virtual scrolling", async () => {
    renderApp("/directory?view=table");
    const viewport = await screen.findByRole("region", {
      name: "User directory, table view",
    });
    const table = screen.getByRole("table");
    const rows = () =>
      Array.from(
        table.querySelectorAll<HTMLTableRowElement>("tr[aria-rowindex]"),
      );
    expect(rows()).toHaveLength(11);
    expect(rows()[0]).toHaveStyle({ height: "55px" });
    fireEvent.scroll(viewport, { target: { scrollTop: 550 } });
    await waitFor(() =>
      expect(rows()[0]).toHaveAttribute("aria-rowindex", "8"),
    );
    expect(table.querySelector("tbody > tr > td")).toHaveStyle({
      height: "330px",
    });
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
    vi.mocked(fetch).mockImplementation(async (input) =>
      String(input) === "/api/auth/me"
        ? apiResponse(input)
        : json({ error: { message: "Database query failed" } }, 500),
    );
    renderApp();
    expect(
      await screen.findByText("Directory temporarily unavailable"),
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

  it.each(["", "?q=Nobody"])(
    "shows refresh errors while retaining cached results and filters (%s)",
    async (search) => {
      const { client } = renderApp(`/directory${search}`);
      if (search) await screen.findByText("No search results");
      else
        await screen.findByRole("region", {
          name: "User directory, cards view",
        });
      await waitFor(() => expect(client.isFetching()).toBe(0));
      vi.mocked(fetch).mockImplementation(async () =>
        json({ error: { message: "Temporary failure" } }, 500),
      );
      await act(async () => {
        await client.invalidateQueries({
          predicate: (query) => query.queryKey[0] !== "session",
        });
      });
      expect(
        await screen.findByText(/Could not refresh the directory/),
      ).toBeInTheDocument();
      expect(
        await screen.findByText(/Showing previously loaded counts/),
      ).toBeInTheDocument();
      if (search)
        expect(screen.getByText("No search results")).toBeInTheDocument();
      else {
        expect(screen.getAllByRole("article").length).toBeGreaterThan(0);
        expect(
          screen.getByRole("checkbox", { name: /Canada/ }),
        ).toBeInTheDocument();
      }
    },
  );

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
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Switch to light theme" }),
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
