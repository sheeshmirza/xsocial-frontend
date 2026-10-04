"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import AppIcon from "@/src/components/ui/AppIcon";
import { telemetry } from "@/src/lib/telemetry";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    telemetry.captureException(error, {
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          className="p-5 rounded-2xl border border-red-200 bg-red-50/50 text-slate-800 my-4 flex flex-col gap-3"
        >
          <div className="flex items-center gap-2.5 text-red-700">
            <AppIcon name="alert" className="w-5 h-5 flex-shrink-0" />
            <h3 className="font-bold text-sm">
              {this.props.fallbackTitle || "This section had a problem loading"}
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            {this.state.error?.message || "An unexpected error occurred in this section."}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="self-start text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
