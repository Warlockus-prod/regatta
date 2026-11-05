import { useLocalSearchParams } from 'expo-router';
import { SimWebView } from '../../src/simulator/SimWebView';
import { useI18n } from '../../src/i18n/context';
import { passthroughQuery } from '../../src/simulator/passthroughQuery';
import { OPEN_BASICS_OFFLINE, TRAINER_NAMES } from '../../../src/lib/product/trainer-names';

const OFFLINE_SOURCE = require('../../assets/sailing-offline.html');

// Shared web Basics runs from the local sailing package on every launch.
// The simplified native screen remains a recovery route for asset errors.

export default function SimulatorV1Screen() {
  const { lang } = useI18n();
  const params = useLocalSearchParams();
  return (
    <SimWebView
      path="/simulator"
      tier="basics"
      query={passthroughQuery(params)}
      offlineSource={OFFLINE_SOURCE}
      title={TRAINER_NAMES.basics[lang]}
      scrollEnabled
      fallbackRoute="/simulator-basics"
      fallbackLabel={OPEN_BASICS_OFFLINE[lang]}
    />
  );
}
