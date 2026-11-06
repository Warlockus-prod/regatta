import ExpoModulesCore
import UIKit
import VOXSDK

/// Bridge to VOX SDK 1 (classic Hybrid SSP SDK). Used only by the ads demo
/// screen (Settings -> Ads); nothing else in the app requests ads.
public class VoxAdsModule: Module {
  /// The address, language and screen of a request, the same fields as the board feed. JS
  /// gives the address (`VOX_APP_PAGE_URL`), so a request names the app whatever the SDK's
  /// own default is; without it Hybrid records the request on its fallback website. JS also
  /// gives the language chosen in the app, the "app language" of the privacy texts, which
  /// the device's preferred language is not.
  @MainActor
  static func browser(pageUrl: String, language: String) -> BrowserModel {
    let screen = UIScreen.main.bounds.size
    return BrowserModel(
      url: pageUrl,
      referrer: "",
      language: language,
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
    AsyncFunction("showFullScreen") { (placeId: String, closeButtonDelay: Double, pageUrl: String, language: String, promise: Promise) in
      Task { @MainActor in
        guard let controller = self.appContext?.utilities?.currentViewController() else {
          promise.reject("E_NO_CONTROLLER", "No view controller to present the ad from")
          return
        }
        do {
          let model = FullScreenBannerModel(
            // gdpr 1 with no consent string: non-personalised ads only, as in VoxAdView.
            requestModel: AdRequestModel(placeId: placeId, browser: Self.browser(pageUrl: pageUrl, language: language), gdpr: 1),
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
      Prop("pageUrl") { (view: VoxAdView, value: String) in
        view.pageUrl = value
      }
      Prop("language") { (view: VoxAdView, value: String) in
        view.language = value
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
