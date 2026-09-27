import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../feedback/ToastProvider";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Icon } from "../ui/Icon";

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
      className="mx-auto w-full max-w-[400px] rounded-2xl border border-white/10 bg-surface/40 px-7 py-10 text-text shadow-[0_24px_64px_rgb(0_0_0/35%),0_8px_24px_rgb(0_0_0/20%),inset_0_1px_0_rgb(255_255_255/12%)] backdrop-blur-xl tablet:mx-0 tablet:px-9 tablet:py-12"
      aria-labelledby="login-title"
    >
      <h1
        id="login-title"
        className="text-center text-3xl font-bold tracking-tight"
      >
        Sign in
      </h1>
      <form
        className="mt-8 flex flex-col gap-6"
        onSubmit={handleSubmit}
        noValidate
        aria-busy={pending}
      >
        <label className="relative block" htmlFor="username">
          <span className="sr-only">Username</span>
          <Input
            className="h-12 w-full rounded-full! border-text/25! bg-transparent! pl-5! pr-12! text-sm placeholder:text-text/80!"
            placeholder="Username"
            id="username"
            name="username"
            autoComplete="username"
            maxLength={100}
            required
            disabled={pending}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <Icon
            name="user"
            className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2"
          />
        </label>
        <label className="relative block" htmlFor="password">
          <span className="sr-only">Password</span>
          <Input
            className="h-12 w-full rounded-full! border-text/25! bg-transparent! pl-5! pr-12! text-sm placeholder:text-text/80!"
            placeholder="Password"
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
          <Icon
            name="lock"
            className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2"
          />
        </label>
        <Button
          type="submit"
          size="md"
          disabled={pending}
          className="mt-1 w-full rounded-full! bg-white! text-slate-900! shadow-sm hover:bg-slate-100!"
        >
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text/80">
        Sign in to browse the users directory
      </p>
    </section>
  );
}
