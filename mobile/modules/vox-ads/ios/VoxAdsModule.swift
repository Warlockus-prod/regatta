import ExpoModulesCore
import UIKit
import VOXSDK

/// Bridge to VOX SDK 1 (classic Hybrid SSP SDK). Used only by the ads demo
/// screen (Settings -> Ads); nothing else in the app requests ads.
public class VoxAdsModule: Module {
  /// The address and screen of a request that names the app, the same fields as the board feed.
  @MainActor
  private static func browser(pageUrl: String?) -> BrowserModel? {
    guard let pageUrl else { return nil }
    let screen = UIScreen.main.bounds.size
    return BrowserModel(
      url: pageUrl,
      referrer: "",
      language: Locale.preferredLanguages.first ?? "en",
      timezoneOffset: Float(-TimeZone.current.secondsFromGMT() / 60),
      screenWidth: Int(screen.width),
      screenHeight: Int(screen.height)
    )
  }

  public func definition() -> ModuleDefinition {
    Name("VoxAds")

    Constant("sdkName") { "VOX SDK 1" }
    Constant("sdkVersion") { "1.2.3" }

    // Interstitial: VOX presents its own full-screen controller on top of
    // the current one and resolves once the ad is on screen.
    AsyncFunction("showFullScreen") { (placeId: String, closeButtonDelay: Double, pageUrl: String?, promise: Promise) in
      Task { @MainActor in
        guard let controller = self.appContext?.utilities?.currentViewController() else {
          promise.reject("E_NO_CONTROLLER", "No view controller to present the ad from")
          return
        }
        do {
          let model = FullScreenBannerModel(
            // gdpr 1 with no consent string: non-personalised ads only, as in VoxAdView.
            requestModel: AdRequestModel(placeId: placeId, browser: Self.browser(pageUrl: pageUrl), gdpr: 1),
            presentingViewController: controller,
            closeButtonDelay: closeButtonDelay
          )
          try await VOXAds.showFullScreenBanner(with: model)
          promise.resolve(nil)
        } catch {
          promise.reject("E_VOX_AD", VoxAdView.failureMessage(for: error))
        }
      }
    }

    View(VoxAdView.self) {
      Events("onAdLoaded", "onAdFailed")

      Prop("placeId") { (view: VoxAdView, value: String) in
        view.placeId = value
      }
      Prop("kind") { (view: VoxAdView, value: String) in
        view.kind = value
      }
      Prop("closeButtonDelay") { (view: VoxAdView, value: Double) in
        view.closeButtonDelay = value
      }
      Prop("reloadKey") { (view: VoxAdView, value: Int) in
        view.reloadKey = value
      }

      OnViewDidUpdateProps { (view: VoxAdView) in
        view.loadIfNeeded()
      }
    }
  }
}
