import { useLocalSearchParams } from 'expo-router';
import { SimWebView } from '../../src/simulator/SimWebView';
import { useI18n } from '../../src/i18n/context';
import { passthroughQuery } from '../../src/simulator/passthroughQuery';
import { OPEN_BASICS_OFFLINE, TRAINER_NAMES } from '../../../src/lib/product/trainer-names';

const OFFLINE_SAILING = require("../../assets/sailing-offline.html");

// The same Trainer source and yacht as the website, bundled for first-launch
// offline use. Deep-link parameters are injected before the local app mounts.

export default function SimulatorV3Screen() {
  const { lang } = useI18n();
  const params = useLocalSearchParams();
  return (
    <SimWebView
      path="/simulator-v3"
      tier="trainer"
      offlineSource={OFFLINE_SAILING}
      query={passthroughQuery(params)}
      title={TRAINER_NAMES.trainer[lang]}
      fallbackRoute="/simulator-basics"
      fallbackLabel={OPEN_BASICS_OFFLINE[lang]}
    />
  );
}
