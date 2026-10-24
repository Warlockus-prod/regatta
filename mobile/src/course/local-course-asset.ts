import { File } from "expo-file-system";
import { Image } from "react-native";

/** Read packaged content, never download a course before its first opening. */
export async function loadLocalCourseHtml(asset: number): Promise<string> {
  const uri = Image.resolveAssetSource(asset)?.uri;
  if (!uri || !/^(?:file|asset|content):/.test(uri)) throw new Error("course-asset-unavailable");
  const html = await new File(uri).text();
  if (!html.trim() || html.length > 16 * 1024 * 1024) throw new Error("course-asset-invalid");
  return html;
}
