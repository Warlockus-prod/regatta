import { SectionWebView } from '../../src/course/SectionWebView';

// Kurs: SRC Radio. Embeds the full /radio web section - guide, ICOM simulator
// (with the voice mode, mic granted), 26 UKE tasks and the UKE trainer - always
// in Polish.
export default function KursRadio() {
  return <SectionWebView path="/radio" section="/radio" title="SRC Radio" />;
}
