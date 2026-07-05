import { SimWebView } from '../../src/simulator/SimWebView';
import { useI18n } from '../../src/i18n/context';

// ============================================================================
// Yacht anatomy - the WEB 3D experience, 1:1.
//
// The web /anatomy page is the good version (R3F viewer of the Bavaria-style
// GLB with 17 clickable hotspots, 5 camera projections, part descriptions in
// 7 languages). The old native SVG schema was a pale copy, so this route now
// embeds the web page via the hardened WebView (user decision 2026-07-05:
// "хочу вэб 1 к 1 3д перенести в апп"). Page scrolling stays ENABLED here -
// unlike the simulators this is a content page; OrbitControls marks its
// canvas touch-action:none so orbit drags never fight the scroll.
//
// Offline: the native schema survives at /anatomy-offline and is offered as
// the fallback when the network is down.
// ============================================================================

export default function AnatomyScreen() {
  const { tp } = useI18n();
  return (
    <SimWebView
      path="/anatomy"
      title={tp('Устройство яхты', 'Yacht anatomy', 'Budowa jachtu', {
        es: 'Anatomia del velero',
        fr: 'Anatomie du voilier',
        de: 'Aufbau der Yacht',
        it: 'Anatomia della barca',
      })}
      scrollEnabled
      fallbackRoute="/anatomy-offline"
      fallbackLabel={tp('Открыть схему (офлайн)', 'Open the schema (offline)', 'Otworz schemat (offline)', {
        es: 'Abrir el esquema (sin conexion)',
        fr: 'Ouvrir le schema (hors ligne)',
        de: 'Schema offnen (offline)',
        it: 'Apri lo schema (offline)',
      })}
    />
  );
}
