import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { DirectoryPage } from "./pages/DirectoryPage";
import { NotFoundPage } from "./pages/NotFoundPage";

import { AuthProvider } from "./hooks/useAuth";
import { ToastProvider } from "./components/feedback/ToastProvider";
import { ErrorBoundary } from "./components/feedback/ErrorBoundary";
import { RequireAuth } from "./components/auth/RequireAuth";
import { Login } from "./components/auth/Login";

function DirectoryRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/directory", search }} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<DirectoryRedirect />} />
              <Route path="login" element={<Login />} />
              <Route element={<RequireAuth />}>
                <Route path="directory" element={<DirectoryPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
