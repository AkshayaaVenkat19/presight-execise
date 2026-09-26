import { Link } from "react-router-dom";
import { StatusPanel } from "../components/feedback/StatusPanel";

export function NotFoundPage() {
  return (
    <StatusPanel
      title="Page not found"
      message="This page doesn’t exist. Head back to the directory to find your people."
    >
      <Link
        className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-[11px] text-xs font-semibold text-surface hover:bg-accent-hover"
        to="/directory"
      >
        Back to directory
      </Link>
    </StatusPanel>
  );
}
