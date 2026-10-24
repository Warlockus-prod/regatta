jest.mock("expo-file-system", () => ({ File: jest.fn().mockImplementation(() => ({ text: mockRead })) }));
jest.mock("expo-file-system/legacy", () => ({ readAsStringAsync: (...args: unknown[]) => mockLegacyRead(...args), EncodingType: { UTF8: "utf8" } }));
import { Image } from "react-native";
import { File } from "expo-file-system";
import { loadLocalCourseHtml } from "../src/course/local-course-asset";
const mockRead = jest.fn().mockResolvedValue("<html>bundled course</html>");
const mockLegacyRead = jest.fn().mockResolvedValue("<html>bundled course</html>");
beforeEach(() => { mockRead.mockReset().mockResolvedValue("<html>bundled course</html>"); mockLegacyRead.mockReset().mockResolvedValue("<html>bundled course</html>"); });
afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });

it("reads a packaged asset while refusing a remote URI even when the network is available", async () => {
  const resolve = jest.spyOn(Image, "resolveAssetSource").mockReturnValue({ uri: "file:///app/assets/sternik-offline.html", width: 0, height: 0, scale: 1 });
  expect(await loadLocalCourseHtml(42)).toBe("<html>bundled course</html>");
  expect(File).toHaveBeenCalledWith("file:///app/assets/sternik-offline.html");
  resolve.mockReturnValue({ uri: "https://weektoregatta.com/sternik", width: 0, height: 0, scale: 1 });
  await expect(loadLocalCourseHtml(42)).rejects.toThrow("course-asset-remote");
  expect(mockRead).toHaveBeenCalledTimes(1);
  expect(mockLegacyRead).not.toHaveBeenCalled();
});

it("reads the same packaged file with SDK54 legacy READ permission when File.text wrongly requires WRITE", async () => {
  jest.spyOn(Image, "resolveAssetSource").mockReturnValue({ uri: "file:///app/assets/sternik-offline.html", width: 0, height: 0, scale: 1 });
  mockRead.mockRejectedValueOnce(Object.assign(new Error("private path and content must not be logged"), { code: "ERR_FILESYSTEM_PERMISSIONS" }));
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  expect(await loadLocalCourseHtml(42)).toBe("<html>bundled course</html>");
  expect(mockLegacyRead).toHaveBeenCalledWith("file:///app/assets/sternik-offline.html", { encoding: "utf8" });
  expect(warn).toHaveBeenCalledWith("[local-course] asset-reader-fallback", { reader: "legacy-utf8", nativeCode: "ERR_FILESYSTEM_PERMISSIONS", scheme: "file" });
  expect(JSON.stringify(warn.mock.calls)).not.toContain("private path");
});

it("reports a bounded asset-read failure if both local readers fail without downloading or erasing data", async () => {
  jest.spyOn(Image, "resolveAssetSource").mockReturnValue({ uri: "file:///app/assets/sternik-offline.html", width: 0, height: 0, scale: 1 });
  mockRead.mockRejectedValueOnce(new Error("private original error"));
  mockLegacyRead.mockRejectedValueOnce(new Error("private native path"));
  jest.spyOn(console, "warn").mockImplementation(() => {});
  await expect(loadLocalCourseHtml(42)).rejects.toThrow("course-asset-read");
  expect(mockLegacyRead).toHaveBeenCalledTimes(1);
});
