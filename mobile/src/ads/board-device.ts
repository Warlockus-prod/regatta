import { Dimensions, Platform } from "react-native";
import type { BoardDevice } from "./board-feed";

/**
 * The same device block VOX SDK sends in `mobileSdk` (VOX SDK DeviceInfo.swift): platform
 * 2 iOS / 1 Android, deviceType 1 phone / 2 tablet, maker, model, OS and version, screen in
 * pixels. The in-game board asks the SSP itself, so it builds this block here.
 */
export function boardDevice(): BoardDevice {
  const { width, height, scale } = Dimensions.get("screen");
  const ios = Platform.OS === "ios";
  const tablet = ios ? Boolean((Platform as { isPad?: boolean }).isPad) : Math.min(width, height) >= 600;
  const android = (Platform as { constants?: { Manufacturer?: string; Model?: string } }).constants;
  return {
    platform: ios ? 2 : 1,
    deviceType: tablet ? 2 : 1,
    deviceManufacturer: ios ? "apple" : (android?.Manufacturer ?? "").toLowerCase(),
    deviceModel: ios ? (tablet ? "ipad" : "iphone") : (android?.Model ?? "").toLowerCase(),
    os: ios ? "ios" : "android",
    osVersion: String(Platform.Version).toLowerCase(),
    screenWidthPixels: Math.round(width * scale),
    screenHeightPixels: Math.round(height * scale),
  };
}
