import ExpoModulesCore
import UIKit
import VOXSDK

/// Loaded native ads by handle. JS gets the fields and a handle, draws the ad with its own
/// views, and gives the handle back to the container view (impression) and to `click`.
@MainActor
final class VoxNativeAdStore {
  static let shared = VoxNativeAdStore()
  private var ads: [String: VOXNativeAd] = [:]

  func put(_ ad: VOXNativeAd) -> String {
    let handle = UUID().uuidString
    ads[handle] = ad
    return handle
  }

  func get(_ handle: String) -> VOXNativeAd? { ads[handle] }

  func remove(_ handle: String) {
    ads[handle]?.unregisterView()
    ads[handle] = nil
  }
}

/// Native ads through VOX SDK 1.4.0+ (`VOXAds.loadNativeAd`). Used only by the ads demo
/// screen (Settings -> Ads -> Native).
public class VoxNativeAdModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VoxNativeAd")

    AsyncFunction("load") { (placeId: String, pageUrl: String, language: String, promise: Promise) in
      Task { @MainActor in
        do {
          // gdpr 1 with no consent string: non-personalised ads only, as in VoxAdView.
          let request = AdRequestModel(placeId: placeId, browser: VoxAdsModule.browser(pageUrl: pageUrl, language: language), gdpr: 1)
          let ad = try await VOXAds.loadNativeAd(with: NativeAdModel(requestModel: request))
          let handle = VoxNativeAdStore.shared.put(ad)
          promise.resolve([
            "handle": handle,
            "title": ad.title ?? "",
            "advertiser": ad.advertiser ?? "",
            "callToAction": ad.callToAction ?? "",
            "iconUrl": ad.iconURL?.absoluteString ?? "",
            "mainImageUrl": ad.mainImageURL?.absoluteString ?? "",
            "ageRating": ad.ageRating ?? "",
          ])
        } catch {
          promise.reject("E_VOX_AD", VoxAdView.failureMessage(for: error))
        }
      }
    }

    // A tap on the ad: the SDK opens the SSP click URL (counts the click, one open per tap).
    Function("click") { (handle: String) in
      Task { @MainActor in VoxNativeAdStore.shared.get(handle)?.performClick() }
    }

    Function("release") { (handle: String) in
      Task { @MainActor in VoxNativeAdStore.shared.remove(handle) }
    }

    View(VoxNativeAdContainer.self) {
      Prop("handle") { (view: VoxNativeAdContainer, value: String) in
        view.handle = value
      }
    }
  }
}

/// Wraps the JS-drawn ad. The SDK watches this view and counts the impression once at least
/// half of it is on screen for one second.
final class VoxNativeAdContainer: ExpoView {
  var handle: String? {
    didSet { registerIfReady() }
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    registerIfReady()
  }

  private func registerIfReady() {
    guard let handle, window != nil else { return }
    Task { @MainActor [weak self] in
      guard let self else { return }
      VoxNativeAdStore.shared.get(handle)?.registerView(self)
    }
  }
}
