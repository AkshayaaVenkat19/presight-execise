import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import App from "../../App";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
function renderLogin(path = "/login") {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function fillCredentials() {
  fireEvent.change(screen.getByLabelText("Username"), {
    target: { value: "admin" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "admin" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}
afterEach(() => vi.unstubAllGlobals());

it("protects the directory, signs in, preserves filters, and shows a success toast", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input) => {
      const path = String(input);
      if (path === "/api/auth/me")
        return json({ error: { message: "Please sign in" } }, 401);
      if (path === "/api/auth/login")
        return json({ data: { id: 1, username: "admin" } });
      if (path.startsWith("/api/filters"))
        return json({ data: { hobbies: [], nationalities: [] } });
      return json({
        data: [],
        pagination: {
          page: 1,
          limit: 30,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    }),
  );
  renderLogin("/directory?q=Alex&sortBy=birth_date");
  await screen.findByRole("heading", { name: "Sign in" });
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(([input]) => String(input).startsWith("/api/users")),
  ).toBe(false);
  fillCredentials();
  expect(await screen.findByText("Signed in successfully")).toBeInTheDocument();
  expect(await screen.findByRole("searchbox")).toHaveValue("Alex");
  expect(screen.getByLabelText("Sort by")).toHaveValue("birth_date");
  expect(fetch).toHaveBeenCalledWith(
    "/api/auth/login",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin" }),
    }),
  );
});

it("shows validation and invalid credential errors as toasts and allows retry", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input) =>
      json(
        {
          error: {
            message:
              String(input) === "/api/auth/login"
                ? "Invalid username or password"
                : "Please sign in",
          },
        },
        401,
      ),
    ),
  );
  renderLogin();
  await screen.findByRole("heading", { name: "Sign in" });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Enter your username and password",
  );
  fillCredentials();
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Invalid username or password",
    ),
  );
  expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
});

it("shows a connection error and re-enables the form when login fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input) => {
      if (String(input) === "/api/auth/me") return json({}, 401);
      throw new TypeError("Failed to fetch");
    }),
  );
  renderLogin();
  await screen.findByRole("heading", { name: "Sign in" });
  fillCredentials();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to connect. Please try again.",
  );
  expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
});

it("restores an existing session and signs out with a success toast", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input) => {
      const path = String(input);
      if (path === "/api/auth/me")
        return json({ data: { id: 1, username: "admin" } });
      if (path === "/api/auth/logout")
        return json({ data: { message: "Signed out successfully" } });
      if (path.startsWith("/api/filters"))
        return json({ data: { hobbies: [], nationalities: [] } });
      return json({
        data: [],
        pagination: {
          page: 1,
          limit: 30,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    }),
  );
  renderLogin("/directory");
  fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
  fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
  expect(
    await screen.findByRole("heading", { name: "Sign in" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Signed out successfully")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    "/api/auth/logout",
    expect.objectContaining({ method: "POST" }),
  );
});
