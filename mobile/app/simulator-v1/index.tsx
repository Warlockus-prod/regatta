import { useLocalSearchParams } from 'expo-router';
import { SimWebView } from '../../src/simulator/SimWebView';
import { useI18n } from '../../src/i18n/context';
import { passthroughQuery } from '../../src/simulator/passthroughQuery';

const OFFLINE_SOURCE = require('../../assets/sailing-offline.html');

// Shared web Basics runs from the local sailing package on every launch.
// The simplified native screen remains a recovery route for asset errors.

export default function SimulatorV1Screen() {
  const { tp } = useI18n();
  const params = useLocalSearchParams();
  return (
    <SimWebView
      path="/simulator"
      tier="basics"
      query={passthroughQuery(params)}
      offlineSource={OFFLINE_SOURCE}
      title={tp('Основы', 'Basics', 'Podstawy', {
        es: 'Fundamentos',
        fr: 'Bases',
        de: 'Grundlagen',
        it: 'Basi',
      })}
      scrollEnabled
      fallbackRoute="/simulator-basics"
      fallbackLabel={tp('Основы офлайн (упрощённо)', 'Basics offline (simple)', 'Podstawy offline (uproszczone)', {
        es: 'Fundamentos sin conexión (simple)',
        fr: 'Bases hors ligne (simple)',
        de: 'Grundlagen offline (einfach)',
        it: 'Basi offline (semplice)',
      })}
    />
  );
}
