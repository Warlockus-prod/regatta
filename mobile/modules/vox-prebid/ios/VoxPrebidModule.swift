import ExpoModulesCore
import PrebidMobile
import UIKit

/// Bridge to VOX SDK 2: Prebid Mobile (rendering API, no primary ad server)
/// talking to a Prebid Server whose `vox` adapter forwards to Hybrid SSP.
/// Used only by the Ads screens; nothing here runs before `start` is called
/// from one of them.
public class VoxPrebidModule: Module {
  /// Full-screen sessions are kept alive until their ad is dismissed or fails.
  private var sessions: [UUID: VoxPrebidFullscreenSession] = [:]

  public func definition() -> ModuleDefinition {
    Name("VoxPrebid")

    Constant("sdkName") { "VOX SDK 2" }
    Constant("sdkVersion") { "Prebid Mobile 3.4.1" }

    AsyncFunction("start") { (serverURL: String, accountId: String, promise: Promise) in
      Prebid.shared.prebidServerAccountId = accountId
      Prebid.shared.shareGeoLocation = false
      // Prebid derives the status URL from the host name alone (https, no
      // port); a server on its own port needs the full status URL.
      if var status = URLComponents(string: serverURL) {
        status.path = "/status"
        status.query = nil
        Prebid.shared.customStatusEndpoint = status.string
      }
      do {
        try Prebid.initializeSDK(serverURL: serverURL) { status, error in
          if let error {
            promise.reject("E_PREBID_INIT", error.localizedDescription)
          } else {
            promise.resolve(String(describing: status))
          }
        }
      } catch {
        promise.reject("E_PREBID_INIT", error.localizedDescription)
      }
    }.runOnQueue(.main)

    // Interstitial (`video == false`: display, `true`: video) and rewarded
    // resolve when the ad is closed: { shown, rewarded }.
    AsyncFunction("showInterstitial") { (configID: String, video: Bool, promise: Promise) in
      self.present(.interstitial(video: video), configID: configID, promise: promise)
    }.runOnQueue(.main)

    AsyncFunction("showRewarded") { (configID: String, promise: Promise) in
      self.present(.rewarded, configID: configID, promise: promise)
    }.runOnQueue(.main)

    View(VoxPrebidBannerView.self) {
      Events("onAdLoaded", "onAdFailed")

      Prop("configID") { (view: VoxPrebidBannerView, value: String) in
        view.configID = value
      }
      Prop("adWidth") { (view: VoxPrebidBannerView, value: Double) in
        view.adWidth = value
      }
      Prop("adHeight") { (view: VoxPrebidBannerView, value: Double) in
        view.adHeight = value
      }
      Prop("video") { (view: VoxPrebidBannerView, value: Bool) in
        view.video = value
      }
      Prop("reloadKey") { (view: VoxPrebidBannerView, value: Int) in
        view.reloadKey = value
      }

      OnViewDidUpdateProps { (view: VoxPrebidBannerView) in
        view.loadIfNeeded()
      }
    }
  }

  private func present(_ kind: VoxPrebidFullscreenSession.Kind, configID: String, promise: Promise) {
    guard let controller = appContext?.utilities?.currentViewController() else {
      promise.reject("E_NO_CONTROLLER", "No view controller to present the ad from")
      return
    }
    let id = UUID()
    let session = VoxPrebidFullscreenSession(kind: kind, configID: configID, controller: controller) { [weak self] result in
      self?.sessions[id] = nil
      switch result {
      case .success(let value):
        promise.resolve(value)
      case .failure(let error):
        promise.reject("E_PREBID_AD", VoxPrebidFailure.message(for: error))
      }
    }
    sessions[id] = session
    session.load()
  }
}

enum VoxPrebidFailure {
  /// Prebid reports an auction without bids as an error; the JS side shows it as no fill.
  static func message(for error: Error?) -> String {
    let text = error.map { String(describing: $0) } ?? "unknown"
    let lower = text.lowercased()
    if lower.contains("no bid") || lower.contains("no winning bid") || lower.contains("nobids") {
      return "no-fill"
    }
    return text
  }
}

/// One interstitial or rewarded ad from load to dismiss.
final class VoxPrebidFullscreenSession: NSObject, InterstitialAdUnitDelegate, RewardedAdUnitDelegate {
  enum Kind {
    case interstitial(video: Bool)
    case rewarded
  }

  private let kind: Kind
  private let configID: String
  private weak var controller: UIViewController?
  private let finish: (Result<[String: Any], Error>) -> Void
  private var interstitial: InterstitialRenderingAdUnit?
  private var rewarded: RewardedAdUnit?
  private var shown = false
  private var earned = false
  private var done = false

  init(kind: Kind, configID: String, controller: UIViewController, finish: @escaping (Result<[String: Any], Error>) -> Void) {
    self.kind = kind
    self.configID = configID
    self.controller = controller
    self.finish = finish
  }

  func load() {
    switch kind {
    case .interstitial(let video):
      let unit = InterstitialRenderingAdUnit(configID: configID)
      unit.adFormats = video ? [.video] : [.banner]
      unit.delegate = self
      interstitial = unit
      unit.loadAd()
    case .rewarded:
      let unit = RewardedAdUnit(configID: configID)
      unit.delegate = self
      rewarded = unit
      unit.loadAd()
    }
  }

  private func complete(_ result: Result<[String: Any], Error>) {
    guard !done else { return }
    done = true
    interstitial = nil
    rewarded = nil
    finish(result)
  }

  // MARK: InterstitialAdUnitDelegate

  func interstitialDidReceiveAd(_ interstitial: InterstitialRenderingAdUnit) {
    guard let controller else { return complete(.failure(VoxPrebidError.noController)) }
    shown = true
    interstitial.show(from: controller)
  }

  func interstitial(_ interstitial: InterstitialRenderingAdUnit, didFailToReceiveAdWithError error: Error?) {
    complete(.failure(error ?? VoxPrebidError.unknown))
  }

  func interstitialDidDismissAd(_ interstitial: InterstitialRenderingAdUnit) {
    complete(.success(["shown": shown, "rewarded": false]))
  }

  // MARK: RewardedAdUnitDelegate

  func rewardedAdDidReceiveAd(_ rewardedAd: RewardedAdUnit) {
    guard let controller else { return complete(.failure(VoxPrebidError.noController)) }
    shown = true
    rewardedAd.show(from: controller)
  }

  func rewardedAd(_ rewardedAd: RewardedAdUnit, didFailToReceiveAdWithError error: Error?) {
    complete(.failure(error ?? VoxPrebidError.unknown))
  }

  func rewardedAdUserDidEarnReward(_ rewardedAd: RewardedAdUnit, reward: PrebidReward) {
    earned = true
  }

  func rewardedAdDidDismissAd(_ rewardedAd: RewardedAdUnit) {
    complete(.success(["shown": shown, "rewarded": earned]))
  }
}

enum VoxPrebidError: Error {
  case noController
  case unknown
}
