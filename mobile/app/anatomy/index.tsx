import { SimWebView } from '../../src/simulator/SimWebView';
import { useI18n } from '../../src/i18n/context';

const OFFLINE_SOURCE = require('../../assets/sailing-offline.html');

// The shared 3D anatomy viewer, local GLB and seven-language descriptions ship
// inside the sailing package. The native diagram is an asset-error fallback.

export default function AnatomyScreen() {
  const { tp } = useI18n();
  return (
    <SimWebView
      path="/anatomy"
      offlineSource={OFFLINE_SOURCE}
      title={tp('Устройство яхты', 'Yacht anatomy', 'Budowa jachtu', {
        es: 'Anatomía del velero',
        fr: 'Anatomie du voilier',
        de: 'Aufbau der Yacht',
        it: 'Anatomia della barca',
      })}
      scrollEnabled
      fallbackRoute="/anatomy-offline"
      fallbackLabel={tp('Открыть схему (офлайн)', 'Open the diagram (offline)', 'Otwórz schemat (offline)', {
        es: 'Abrir el esquema (sin conexión)',
        fr: 'Ouvrir le schéma (hors ligne)',
        de: 'Schema öffnen (offline)',
        it: 'Apri lo schema (offline)',
      })}
    />
  );
}
