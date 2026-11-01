// Raises every pod target to the app's iOS deployment target in post_install.
//
// Xcode 27 refuses to build targets below iOS 15.0 ("supported deployment
// target versions is 15.0 to 27.x"). Several pods still declare 12.x-14.0 for
// their resource-bundle targets (VOXSDK, ReachabilitySwift, RNSVG,
// RNCAsyncStorage), which fails a fresh simulator build.
const { withPodfile } = require('expo/config-plugins');

const MIN_TARGET = '15.1';
const MARKER = '# Min pod deployment target (plugins/with-min-pod-deployment-target.js)';

module.exports = function withMinPodDeploymentTarget(config) {
  return withPodfile(config, (cfg) => {
    const podfile = cfg.modResults.contents;
    if (podfile.includes(MARKER)) return cfg;
    const anchor = /^(\s*)post_install do \|installer\|.*$/m;
    if (!anchor.test(podfile)) {
      throw new Error('with-min-pod-deployment-target: post_install not found in Podfile');
    }
    cfg.modResults.contents = podfile.replace(anchor, (line, indent) =>
      [
        line,
        `${indent}  ${MARKER}`,
        `${indent}  installer.pods_project.targets.each do |target|`,
        `${indent}    target.build_configurations.each do |build_config|`,
        `${indent}      if build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${MIN_TARGET}`,
        `${indent}        build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_TARGET}'`,
        `${indent}      end`,
        `${indent}    end`,
        `${indent}  end`,
      ].join('\n'),
    );
    return cfg;
  });
};
