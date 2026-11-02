Pod::Spec.new do |s|
  s.name           = 'VoxPrebid'
  s.version        = '1.0.0'
  s.summary        = 'Local Expo bridge to VOX SDK 2 (Prebid Mobile + Prebid Server with the vox adapter).'
  s.description    = 'Wraps Prebid Mobile rendering ad units (banner, video, interstitial, rewarded) for the Ads demo screens.'
  s.author         = 'Week to Regatta'
  s.homepage       = 'https://github.com/prebid/prebid-mobile-ios'
  s.license        = { :type => 'Apache-2.0' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'PrebidMobile', '3.4.1'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.{h,m,mm,swift}'
end
