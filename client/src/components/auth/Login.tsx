import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../feedback/ToastProvider";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export function Login() {
  const { user, loading, signIn } = useAuth();
  const notify = useToast();
  const [params] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const returnTo = params.get("returnTo") || "";
  const destination = /^\/directory(?:\?|$)/.test(returnTo)
    ? returnTo
    : "/directory";
  if (loading) return <p role="status">Checking your session…</p>;
  if (user) return <Navigate to={destination} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!username.trim() || !password) {
      notify("Enter your username and password", "error");
      return;
    }
    setPending(true);
    try {
      await signIn({ username: username.trim(), password });
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to sign in",
        "error",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="mx-auto mt-8 max-w-md rounded-2xl border border-border border-t-4 border-t-accent bg-surface p-6 shadow-panel tablet:p-8"
      aria-labelledby="login-title"
    >
      <h1 id="login-title" className="text-2xl font-bold">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-muted">
        Sign in to browse the Presight directory.
      </p>
      <form
        className="mt-6 flex flex-col gap-5"
        onSubmit={handleSubmit}
        noValidate
        aria-busy={pending}
      >
        <label
          className="flex flex-col gap-2 text-sm font-semibold"
          htmlFor="username"
        >
          Username
          <Input
            id="username"
            name="username"
            autoComplete="username"
            maxLength={100}
            required
            disabled={pending}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label
          className="flex flex-col gap-2 text-sm font-semibold"
          htmlFor="password"
        >
          Password
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={256}
            required
            disabled={pending}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </section>
  );
}
