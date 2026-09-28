// UIScene life cycle for the iOS app (Expo SDK 54 generates only the
// application life cycle). iOS 27 refuses to launch apps built with the iOS 27
// SDK that do not use UIScene: "Application failed to launch: UIScene life
// cycle is required for apps built with this SDK". Build 43 (1.6.2) hit this.
// Expo ships scene support from SDK 57.0.23 (`ios.enableSceneSupport`) and by
// default from SDK 58; remove this plugin when upgrading to one of those.
//
// What it does at prebuild:
// - Info.plist: a single-scene UIApplicationSceneManifest -> SceneDelegate.
// - SceneDelegate.swift: owns the window and starts React Native in it,
//   routes URLs and user activities through AppDelegate, so Expo linking and
//   RCTLinkingManager see them (the regatta:// scheme), cold start included.
// - AppDelegate.swift: keeps creating the React Native factory, no window.
// - Podfile: raises pod targets below iOS 15.1 (Xcode 27 rejects them).
const fs = require('fs');
const path = require('path');
const { withAppDelegate, withDangerousMod, withInfoPlist, withPodfile, withXcodeProject, IOSConfig } = require('expo/config-plugins');

const SCENE_DELEGATE = `import UIKit
import React

// Written by plugins/with-uiscene.js at prebuild: edit the plugin, not this file.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }
    let window = UIWindow(windowScene: windowScene)
    // A cold start from a link brings the URL here, not to didFinishLaunching.
    // Route it through AppDelegate before React starts, so the Expo linking
    // subscriber records it as the initial URL (expo-router reads it at
    // startup) and RCTLinkingManager gets it too.
    var launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    if let url = connectionOptions.urlContexts.first?.url {
      _ = appDelegate.application(UIApplication.shared, open: url, options: [:])
      launchOptions = [.url: url]
    }
    factory.startReactNative(withModuleName: "main", in: window, launchOptions: launchOptions)
    self.window = window
    appDelegate.window = window
    window.makeKeyAndVisible()
    if let activity = connectionOptions.userActivities.first {
      _ = appDelegate.application(UIApplication.shared, continue: activity) { _ in }
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let context = URLContexts.first,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    if let source = context.options.sourceApplication { options[.sourceApplication] = source }
    if let annotation = context.options.annotation { options[.annotation] = annotation }
    _ = appDelegate.application(UIApplication.shared, open: context.url, options: options)
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    _ = appDelegate.application(UIApplication.shared, continue: userActivity) { _ in }
  }
}
`;

const LEGACY_START = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;
const SCENE_NOTE = '    // SceneDelegate creates the window and starts React Native (UIScene life cycle).\n';
const POD_MARKER = '# with-uiscene: pod deployment targets';
const POD_FIX = `
    ${POD_MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        if bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
          bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end
`;

function withSceneManifest(config) {
  return withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return c;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') throw new Error('with-uiscene: expected a Swift AppDelegate');
    const src = c.modResults.contents;
    if (src.includes(SCENE_NOTE)) return c;
    if (!src.includes(LEGACY_START)) {
      throw new Error('with-uiscene: the AppDelegate template changed (window start block not found); update plugins/with-uiscene.js');
    }
    c.modResults.contents = src.replace(LEGACY_START, SCENE_NOTE);
    return c;
  });
}

function withSceneDelegateFile(config) {
  config = withDangerousMod(config, [
    'ios',
    async (c) => {
      const dir = path.join(c.modRequest.platformProjectRoot, c.modRequest.projectName);
      fs.writeFileSync(path.join(dir, 'SceneDelegate.swift'), SCENE_DELEGATE);
      return c;
    },
  ]);
  return withXcodeProject(config, (c) => {
    const project = c.modResults;
    const name = c.modRequest.projectName;
    const filepath = `${name}/SceneDelegate.swift`;
    if (!project.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath, groupName: name, project });
    }
    return c;
  });
}

function withPodDeploymentTarget(config) {
  return withPodfile(config, (c) => {
    const src = c.modResults.contents;
    if (src.includes(POD_MARKER)) return c;
    const anchor = /(react_native_post_install\([\s\S]*?\n\s*\)\n)/;
    if (!anchor.test(src)) throw new Error('with-uiscene: react_native_post_install block not found in Podfile');
    c.modResults.contents = src.replace(anchor, `$1${POD_FIX}`);
    return c;
  });
}

module.exports = function withUIScene(config) {
  return withPodDeploymentTarget(withSceneDelegateFile(withSceneAppDelegate(withSceneManifest(config))));
};
