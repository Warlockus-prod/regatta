Pod::Spec.new do |s|
  s.name           = 'VoxAds'
  s.version        = '1.0.0'
  s.summary        = 'Local Expo bridge to VOX SDK 1 (Hybrid Adtech) for the ads demo screen.'
  s.description    = 'Wraps VOXAds.createBanner / showFullScreenBanner / createVASTVideo for React Native.'
  s.author         = 'Week to Regatta'
  s.homepage       = 'https://github.com/Warlockus-prod/vox-sdk-ios'
  s.license        = { :type => 'MIT' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # Resolved from git by plugins/with-vox-sdk.js (VOXSDK is not on CocoaPods trunk).
  s.dependency 'VOXSDK'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.{h,m,mm,swift}'
end
