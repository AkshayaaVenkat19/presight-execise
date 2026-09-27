import { Link, NavLink, Outlet } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { Icon } from "../ui/Icon";
import logo from '../../assets/presightLogo.png'
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../feedback/ToastProvider";

export function AppLayout() {
  const { user, signOut } = useAuth();
  const notify = useToast();
  const [signingOut, setSigningOut] = useState(false);
  async function handleSignOut() {
    setSigningOut(true);
    try { await signOut(); }
    catch (error) { notify(error instanceof Error ? error.message : "Unable to sign out", "error"); }
    finally { setSigningOut(false); }
  }
  const { theme, toggleTheme } = useTheme();
  return (
    <>
      <a
        className="fixed -top-20 left-4 z-10 rounded-lg border border-accent bg-surface px-5 py-3 focus:top-3"
        href="#main-content"
      >
        Skip to content
      </a>
      <header className="h-[68px] border-b border-border bg-surface tablet:h-20">
        <div className="mx-auto flex h-full max-w-[1440px] items-center gap-[18px] px-4 compact:gap-7 compact:px-5 tablet:gap-16 tablet:px-7 desktop:px-12">
          <Link
            className="inline-flex items-center gap-2.5 text-[22px] font-bold tracking-[-1px] tablet:text-[25px]"
            to="/directory"
            aria-label="Presight home"
          >
            <span className="grid size-[34px] place-items-center rounded-[10px] text-surface">
              <img src={logo} alt="home-icon" />
            </span>
            <span>
              Presight
            </span>
          </Link>
          <nav className="h-full" aria-label="Main navigation">
            <NavLink
              className={({ isActive }) =>
                `flex h-full items-center gap-[9px] border-b-[3px] px-1 text-xs font-semibold compact:text-sm ${isActive ? "border-accent text-accent" : "border-transparent"}`
              }
              to="/directory"
            >
              <Icon className="hidden compact:block" name="people" />
              Directory
            </NavLink>
          </nav>
          <button
            className="ml-auto flex items-center gap-2 rounded-[9px] bg-surface-soft px-[13px] py-2.5 text-[13px] hover:text-accent"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "night" : "day"} theme`}
            title={`Switch to ${theme === "light" ? "night" : "day"} theme`}
          >
            <Icon name={theme === "light" ? "moon" : "sun"} />
            <span className="hidden tablet:inline">
              {theme === "light" ? "Dark" : "Light"}
            </span>
          </button>
          {user && <button type="button" disabled={signingOut} onClick={handleSignOut}
            className="text-xs font-semibold text-muted hover:text-accent">
            {signingOut ? "Signing out…" : "Sign out"}
          </button>}
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto min-h-[calc(100vh-144px)] max-w-[1440px] px-4 py-[26px] compact:px-5 compact:py-7 tablet:px-7 tablet:py-[34px] desktop:px-12 desktop:pt-[46px] desktop:pb-9"
      >
        <Outlet />
      </main>
    </>
  );
}
