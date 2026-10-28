'use client';

import { recordWebDiagnostic } from "@/lib/diagnostics-web";
import { diagnosticSurface } from "@/lib/diagnostic-destination";
import { Component, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";

export function reportScene(status: "scene-ready" | "scene-error") {
  const host = window as Window & { ReactNativeWebView?: { postMessage: (value: string) => void } };
  if (status === "scene-error") recordWebDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface(window.location.pathname), action: "error", outcome: "failed", reason: "scene-load", source: "system" });
  host.ReactNativeWebView?.postMessage(status);
}

export class SceneBoundary extends Component<{
  children: ReactNode;
  modelUrl: string;
  errorLabel: string;
  retryLabel: string;
  onError?: () => void;
}, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { reportScene("scene-error"); this.props.onError?.(); }
  render() {
    if (this.state.failed) return (
      <div role="alert" className="flex h-full min-h-48 flex-col items-center justify-center gap-4 bg-[var(--bg-primary)] p-6 text-center text-[var(--text-primary)]">
        <p>{this.props.errorLabel}</p>
        <button className="min-h-11 rounded-lg border border-[var(--accent-cyan)] px-5" onClick={() => {
          recordWebDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface(window.location.pathname), action: "retry", outcome: "accepted", source: "pointer" });
          useGLTF.clear(this.props.modelUrl);
          this.setState(({ attempt }) => ({ failed: false, attempt: attempt + 1 }));
        }}>{this.props.retryLabel}</button>
      </div>
    );
    return <div key={this.state.attempt} className="h-full w-full">{this.props.children}</div>;
  }
}
