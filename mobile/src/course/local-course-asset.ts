import { File } from "expo-file-system";
import { EncodingType, readAsStringAsync } from "expo-file-system/legacy";
import { Image } from "react-native";

/** Read packaged content, never download a course before its first opening. */
export async function loadLocalCourseHtml(asset: number): Promise<string> {
  const uri = Image.resolveAssetSource(asset)?.uri;
  if (!uri) throw new Error("course-asset-unresolved");
  if (!/^(?:file|assets?|content):/.test(uri)) throw new Error("course-asset-remote");
  let html: string;
  try {
    html = await new File(uri).text();
  } catch (error) {
    // SDK54 expo-file-system19.0.23 incorrectly requests WRITE permission in
    // iOS File.text(), even for the read-only application bundle. The legacy
    // UTF8 reader checks READ permission and reads this same packaged URI.
    const rawCode = error && typeof error === "object" && "code" in error ? error.code : undefined;
    const nativeCode = typeof rawCode === "string" && /^[a-zA-Z0-9_.-]{1,64}$/.test(rawCode) ? rawCode : "unknown";
    console.warn("[local-course] asset-reader-fallback", { reader: "legacy-utf8", nativeCode, scheme: uri.slice(0, uri.indexOf(":")) });
    try {
      html = await readAsStringAsync(uri, { encoding: EncodingType.UTF8 });
    } catch {
      throw new Error("course-asset-read");
    }
  }
  if (!html.trim() || html.length > 16 * 1024 * 1024) throw new Error("course-asset-invalid");
  return html;
}
