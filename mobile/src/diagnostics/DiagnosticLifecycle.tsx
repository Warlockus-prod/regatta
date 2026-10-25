import { useEffect } from "react";
import { AppState } from "react-native";
import { nativeDiagnostics, recordNativeDiagnostic } from "./journal";

let began = false;
export function DiagnosticLifecycle() {
  useEffect(() => {
    void nativeDiagnostics.initialize();
    if (!began) { began = true; recordNativeDiagnostic({ type: "embedded.lifecycle", surface: "app", action: "begin", outcome: "accepted", source: "native" }); }
    const subscription = AppState.addEventListener("change", state => {
      if (state === "background" || state === "inactive") {
        recordNativeDiagnostic({ type: "embedded.lifecycle", surface: "app", action: "background", outcome: "accepted", source: "native" });
        void nativeDiagnostics.flush();
      } else if (state === "active") recordNativeDiagnostic({ type: "embedded.lifecycle", surface: "app", action: "foreground", outcome: "accepted", source: "native" });
    });
    return () => { subscription.remove(); void nativeDiagnostics.flush(); };
  }, []);
  return null;
}
