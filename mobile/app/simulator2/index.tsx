import { SimWebView } from '../../src/simulator/SimWebView';
import { useI18n } from '../../src/i18n/context';

// ============================================================================
// Simulator V2 (3D) screen.
//
// Embeds the deployed web V2 simulator (/simulator2) via WebView: an R3F + GLB
// sloop with morph-target sails and VPP sail physics. Native three.js does not
// render on this RN New-Architecture stack - see SimWebView for the why.
//
// There is no native 3D view to fall back to, so offline sends the user to the
// native Basics screen rather than to a "Trainer" they did not ask for.
// ============================================================================

export default function SimulatorV2Screen() {
  const { tp } = useI18n();
  return (
    <SimWebView
      path="/simulator2"
      tier="boat3d"
      title={tp('Лодка 3D', '3D Boat', 'Lodka 3D', {
        es: 'Barco 3D',
        fr: 'Bateau 3D',
        de: 'Boot 3D',
        it: 'Barca 3D',
      })}
      fallbackRoute="/simulator-basics"
      fallbackLabel={tp('Открыть Основы (офлайн)', 'Open Basics (offline)', 'Otworz Podstawy (offline)', {
        es: 'Abrir Basicos (sin conexion)',
        fr: 'Ouvrir les Bases (hors ligne)',
        de: 'Grundlagen offnen (offline)',
        it: 'Apri le Basi (offline)',
      })}
    />
  );
}
