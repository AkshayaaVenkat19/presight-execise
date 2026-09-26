import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { DirectoryPage } from "./pages/DirectoryPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function DirectoryRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/directory", search }} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DirectoryRedirect />} />
        <Route path="directory" element={<DirectoryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
