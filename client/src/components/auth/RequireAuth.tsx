import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/Button";

export function RequireAuth() {
  const { user, loading, error, refresh } = useAuth();
  const location = useLocation();
  if (loading) return <p role="status">Checking your session…</p>;
  if (error)
    return (
      <div>
        <p>{error}</p>
        <Button onClick={() => void refresh()}>Retry session</Button>
      </div>
    );
  if (!user)
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  return <Outlet />;
}
