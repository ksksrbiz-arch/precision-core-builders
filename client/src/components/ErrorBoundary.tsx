import { ASSETS, SITE } from "@/const";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      const showDetails = import.meta.env.DEV;
      return (
        <div
          role="alert"
          className="flex items-center justify-center min-h-screen p-8 bg-background"
        >
          <div className="flex flex-col items-center w-full max-w-2xl p-8 text-center">
            <img
              src={ASSETS.logo}
              alt="Precision Core Builders"
              width={145}
              height={56}
              className="h-14 w-auto mb-8"
            />
            <span
              className="heading-bar heading-bar-center mb-6"
              aria-hidden="true"
            />

            <h2
              className="text-2xl mb-3 text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Something went wrong.
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              We hit an unexpected error. Reloading the page usually fixes it.
              If the problem persists, please contact us at{" "}
              <a href={SITE.phoneHref} className="text-primary hover:underline">
                {SITE.phone}
              </a>
              .
            </p>

            {showDetails && this.state.error?.stack && (
              <div className="p-4 w-full rounded bg-muted overflow-auto mb-6 text-left">
                <pre className="text-xs text-muted-foreground whitespace-break-spaces">
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                <RotateCcw size={16} />
                Reload Page
              </button>
              <a
                href="/"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "border border-border text-foreground",
                  "hover:bg-muted/50"
                )}
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
