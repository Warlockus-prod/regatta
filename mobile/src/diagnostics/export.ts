import { parseDiagnosticPersistence, serializeDiagnosticPersistence, type DiagnosticSnapshot } from "../../../src/lib/diagnostics";

/** Clipboard support format only. Persistence and the bounded event schema
 * stay unchanged. Validate again so malformed/private fields cannot escape. */
export function diagnosticSupportExport(snapshot: DiagnosticSnapshot, app: { version: unknown; build: unknown; platform: unknown }): string {
  const encoded = serializeDiagnosticPersistence(snapshot, 0);
  const journal = encoded && parseDiagnosticPersistence(encoded, 0);
  if (!journal) throw new Error("Invalid diagnostic snapshot");
  const version = typeof app.version === "string" && /^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(app.version) ? app.version : null;
  const build = typeof app.build === "string" && /^\d{1,12}$/.test(app.build) ? app.build : null;
  const platform = app.platform === "ios" || app.platform === "android" || app.platform === "web" ? app.platform : "unknown";
  return JSON.stringify({ format: "regatta-diagnostics", formatVersion: 1, app: { version, build, platform }, journal });
}
