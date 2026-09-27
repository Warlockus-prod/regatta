import { SimWebView } from '../../src/simulator/SimWebView';
import { useI18n } from '../../src/i18n/context';

const OFFLINE_SAILING = require("../../assets/sailing-offline.html");

// ============================================================================
// Simulator V2 (3D) screen.
//
// Embeds the bundled web 3D simulator via WebView: an R3F + GLB
// sloop with morph-target sails and VPP sail physics. Native three.js does not
// render on this RN New-Architecture stack - see SimWebView for the why.
//
// The bundle contains the yacht and runtime, with no server requirement.
// If WebGL fails, the explicitly labelled simplified Basics remain available.
// ============================================================================

export default function SimulatorV2Screen() {
  const { tp } = useI18n();
  return (
    <SimWebView
      path="/simulator2"
      tier="boat3d"
      offlineSource={OFFLINE_SAILING}
      title={tp('Лодка 3D', '3D Boat', 'Łódka 3D', {
        es: 'Barco 3D',
        fr: 'Bateau 3D',
        de: '3D-Boot',
        it: 'Barca 3D',
      })}
      fallbackRoute="/simulator-basics"
      fallbackLabel={tp('Открыть Основы (офлайн)', 'Open Basics (offline)', 'Otwórz Podstawy (offline)', {
        es: 'Abrir Fundamentos (sin conexión)',
        fr: 'Ouvrir les Bases (hors ligne)',
        de: 'Grundlagen öffnen (offline)',
        it: 'Apri le Basi (offline)',
      })}
    />
  );
}
