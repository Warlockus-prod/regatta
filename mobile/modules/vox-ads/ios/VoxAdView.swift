import AVKit
import ExpoModulesCore
import UIKit
import VOXSDK
import WebKit

/// Inline VOX placement: a web banner (`kind == "banner"`) or a VAST video
/// (`kind == "video"`). The banner's height comes from the creative, so it is
/// reported back to JS through `onAdLoaded` and the JS side sizes the slot.
class VoxAdView: ExpoView {
  let onAdLoaded = EventDispatcher()
  let onAdFailed = EventDispatcher()

  var placeId = ""
  var kind = "banner"
  var closeButtonDelay: Double = 0
  var reloadKey = 0

  private var loadedSignature: String?
  private var pendingLoad = false
  private var generation = 0

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    // Ads live only on the Ads screens: once this slot leaves the screen
    // nothing it created may keep loading, refreshing or playing.
    if window == nil {
      teardown()
    } else if pendingLoad {
      setNeedsLayout()
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    // The first props update can arrive before Yoga gives us a width.
    if pendingLoad && bounds.width > 0 {
      loadIfNeeded()
    }
  }

  func loadIfNeeded() {
    guard !placeId.isEmpty else { return }
    guard bounds.width > 0 else {
      pendingLoad = true
      return
    }
    let signature = "\(kind)|\(placeId)|\(reloadKey)"
    guard signature != loadedSignature else { return }
    loadedSignature = signature
    pendingLoad = false
    load()
  }

  private func teardown() {
    generation += 1
    loadedSignature = nil
    pendingLoad = true
    Self.detachAds(in: self)
    subviews.forEach { $0.removeFromSuperview() }
  }

  /// Stops web creatives and detaches video players found under `root`.
  /// VOX SDK 1.2.3 retains its banner through the WebKit message handler and
  /// leaves the player controller attached to the app's root controller, so
  /// removing the views alone would leave them running.
  static func detachAds(in root: UIView) {
    for view in root.subviews {
      if let webView = view as? WKWebView {
        webView.stopLoading()
        webView.configuration.userContentController.removeAllScriptMessageHandlers()
      }
      if let player = view.next as? AVPlayerViewController {
        player.player?.pause()
        player.willMove(toParent: nil)
        player.view.removeFromSuperview()
        player.removeFromParent()
      }
      detachAds(in: view)
    }
  }

  private func load() {
    generation += 1
    let current = generation
    Self.detachAds(in: self)
    subviews.forEach { $0.removeFromSuperview() }

    let requestModel = AdRequestModel(placeId: placeId)
    let width = bounds.width
    let delay = closeButtonDelay

    Task { @MainActor [weak self] in
      guard let self else { return }
      do {
        if self.kind == "video" {
          guard let controller = self.appContext?.utilities?.currentViewController() else {
            throw VoxBridgeError.noController
          }
          let container = UIView(frame: self.bounds)
          container.autoresizingMask = [.flexibleWidth, .flexibleHeight]
          self.addSubview(container)
          let model = VideoBannerModel(
            requestModel: requestModel,
            containerView: container,
            parentController: controller,
            shouldHideBannerWithText: true,
            closeButtonDelay: delay
          )
          try await VOXAds.createVASTVideo(with: model)
          guard current == self.generation else { return }
          self.onAdLoaded(["width": width, "height": self.bounds.height])
        } else {
          let model = BannerModel(
            requestModel: requestModel,
            width: width,
            shouldHideBannerWithText: true,
            closeButtonDelay: delay
          )
          let banner = try await VOXAds.createBanner(with: model)
          guard current == self.generation else { return }
          banner.translatesAutoresizingMaskIntoConstraints = false
          self.addSubview(banner)
          NSLayoutConstraint.activate([
            banner.topAnchor.constraint(equalTo: self.topAnchor),
            banner.centerXAnchor.constraint(equalTo: self.centerXAnchor),
          ])
          let size = banner.systemLayoutSizeFitting(UIView.layoutFittingCompressedSize)
          self.onAdLoaded(["width": size.width, "height": size.height])
        }
      } catch {
        guard current == self.generation else { return }
        self.onAdFailed(["message": Self.failureMessage(for: error)])
      }
    }
  }
}

extension VoxAdView {
  /// VOX SDK 1.2.3 treats HTTP 204 (no fill) as success and then fails to
  /// decode the empty body, so a DecodingError means "no ad for this
  /// placement". Later SDK builds report it as `noFill`.
  static func failureMessage(for error: Error) -> String {
    let description = String(describing: error)
    if error is DecodingError || description.contains("DecodingError") || description.contains("noFill") {
      return "no-fill"
    }
    return description
  }
}

enum VoxBridgeError: Error {
  case noController
}
