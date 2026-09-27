import { Link, NavLink, Outlet, useMatch } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { Icon } from "../ui/Icon";
import logo from "../../assets/presightLogo.png";
import lightBackground from "../../assets/light-bg.avif";
import darkBackground from "../../assets/dark-bg.avif";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../feedback/ToastProvider";
import { Popover } from "../ui/Popover";

export function AppLayout() {
  const isLoginPage = useMatch("/login");
  const { user, signOut } = useAuth();
  const notify = useToast();
  const [signingOut, setSigningOut] = useState(false);
  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to sign out",
        "error",
      );
    } finally {
      setSigningOut(false);
    }
  }
  const { theme, toggleTheme } = useTheme();
  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-cover bg-center bg-no-repeat"
      style={
        isLoginPage
          ? {
              backgroundImage: `url(${theme === "dark" ? darkBackground : lightBackground})`,
            }
          : undefined
      }
    >
      <a
        className="fixed -top-20 left-4 z-10 rounded-lg border border-accent bg-surface px-5 py-3 focus:top-3"
        href="#main-content"
      >
        Skip to content
      </a>
      <header className="h-[40px] shrink-0 border-b border-border bg-surface tablet:h-15">
        <div className="mx-auto flex h-full max-w-[1440px] items-center gap-[18px] px-4 compact:gap-7 compact:px-5 tablet:gap-16 tablet:px-7 desktop:px-12">
          <Link
            className="inline-flex items-center gap-2.5 text-[22px] font-bold tracking-[-1px] tablet:text-[25px]"
            to="/directory"
            aria-label="Presight home"
          >
            <span className="grid size-[34px] place-items-center rounded-[10px]">
              <img src={logo} alt="home-icon" />
            </span>
            <span className="text-accent">Presight</span>
          </Link>
          <nav className="h-full" aria-label="Main navigation">
            <NavLink
              className={({ isActive }) =>
                `flex h-full items-center gap-[9px] border-b-[5px] px-1 text-xs font-semibold compact:text-sm ${isActive ? "border-brand-blue text-accent" : "border-transparent"}`
              }
              to="/directory"
            >
              <Icon className="hidden compact:block" name="people" />
              Directory
            </NavLink>
          </nav>
          <Popover
            label="Settings"
            trigger={<Icon name="settings" />}
            className="ml-auto"
            triggerClassName="flex items-center justify-center rounded-lg p-1 text-muted hover:bg-surface-soft hover:text-accent tablet:p-2"
          >
            <button
              type="button"
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-soft hover:text-accent"
            >
              <Icon name={theme === "light" ? "moon" : "sun"} />
              Switch to {theme === "light" ? "dark" : "light"} theme
            </button>
            {user && (
              <button
                type="button"
                disabled={signingOut}
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-danger enabled:hover:bg-danger-soft"
              >
                <Icon name="sign-out" />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            )}
          </Popover>
        </div>
      </header>
      <main
        id="main-content"
        className={
          isLoginPage
            ? "mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col overflow-auto px-4 py-4 compact:px-5 tablet:px-12 tablet:py-10 desktop:px-24 [&>section]:my-auto [&>section]:shrink-0"
            : "mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col overflow-hidden px-4 py-[clamp(8px,2dvh,26px)] compact:px-5 tablet:px-7 desktop:px-12"
        }
      >
        <Outlet />
      </main>
    </div>
  );
}
