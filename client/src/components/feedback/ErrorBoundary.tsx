import React from "react";
import { StatusPanel } from "./StatusPanel";
import { Button } from "../ui/Button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled render error", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-10">
        <StatusPanel
          error
          title="Something went wrong"
          message="The page failed to render. Try again, or reload if the problem persists."
        >
          <Button onClick={this.handleReset}>Try again</Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </StatusPanel>
      </div>
    );
  }
}
