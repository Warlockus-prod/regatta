jest.mock("expo-file-system", () => ({ File: jest.fn().mockImplementation(() => ({ text: mockRead })) }));
import { Image } from "react-native";
import { File } from "expo-file-system";
import { loadLocalCourseHtml } from "../src/course/local-course-asset";
const mockRead = jest.fn().mockResolvedValue("<html>bundled course</html>");
afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });

it("reads a packaged asset while refusing a remote URI even when the network is available", async () => {
  const resolve = jest.spyOn(Image, "resolveAssetSource").mockReturnValue({ uri: "file:///app/assets/sternik-offline.html", width: 0, height: 0, scale: 1 });
  expect(await loadLocalCourseHtml(42)).toBe("<html>bundled course</html>");
  expect(File).toHaveBeenCalledWith("file:///app/assets/sternik-offline.html");
  resolve.mockReturnValue({ uri: "https://weektoregatta.com/sternik", width: 0, height: 0, scale: 1 });
  await expect(loadLocalCourseHtml(42)).rejects.toThrow("course-asset-unavailable");
  expect(mockRead).toHaveBeenCalledTimes(1);
});
