import ExpoModulesCore
import PrebidMobile
import UIKit

/// Inline VOX SDK 2 slot: a Prebid Mobile `BannerView` for display
/// (`video == false`) or outstream video (`video == true`).
class VoxPrebidBannerView: ExpoView, BannerViewDelegate {
  let onAdLoaded = EventDispatcher()
  let onAdFailed = EventDispatcher()

  var configID = ""
  var adWidth: Double = 0
  var adHeight: Double = 0
  var video = false
  var reloadKey = 0

  private var banner: BannerView?
  private var loadedSignature: String?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    // Ads live only on the Ads screens: an off-screen slot stops refreshing
    // and drops its creative; returning to the screen requests a new one.
    if window == nil {
      teardown()
    } else {
      loadIfNeeded()
    }
  }

  func loadIfNeeded() {
    guard window != nil, !configID.isEmpty, adWidth > 0, adHeight > 0 else { return }
    let signature = "\(configID)|\(adWidth)x\(adHeight)|\(video)|\(reloadKey)"
    guard signature != loadedSignature else { return }
    loadedSignature = signature
    teardown(keepSignature: true)

    let size = CGSize(width: adWidth, height: adHeight)
    let view = BannerView(frame: CGRect(origin: .zero, size: size), configID: configID, adSize: size)
    if video {
      view.adFormat = .video
    }
    view.delegate = self
    view.frame = CGRect(x: max(0, (bounds.width - size.width) / 2), y: 0, width: size.width, height: size.height)
    view.autoresizingMask = [.flexibleLeftMargin, .flexibleRightMargin]
    addSubview(view)
    banner = view
    view.loadAd()
  }

  private func teardown(keepSignature: Bool = false) {
    if !keepSignature {
      loadedSignature = nil
    }
    banner?.stopRefresh()
    banner?.delegate = nil
    banner?.removeFromSuperview()
    banner = nil
  }

  // MARK: BannerViewDelegate

  func bannerViewPresentationController() -> UIViewController? {
    appContext?.utilities?.currentViewController()
  }

  func bannerView(_ bannerView: BannerView, didReceiveAdWithAdSize adSize: CGSize) {
    guard bannerView === banner else { return }
    onAdLoaded(["width": adSize.width, "height": adSize.height])
  }

  func bannerView(_ bannerView: BannerView, didFailToReceiveAdWith error: Error) {
    guard bannerView === banner else { return }
    onAdFailed(["message": VoxPrebidFailure.message(for: error)])
  }
}
