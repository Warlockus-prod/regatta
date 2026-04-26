import { useI18n } from '../../src/i18n/context';
import { PlaceholderScreen } from '../../src/design-system/components';

export default function Multiplayer() {
  const { tp } = useI18n();
  return (
    <PlaceholderScreen
      title={tp('Мультиплеер', 'Multiplayer', 'Multiplayer', {
        es: 'Multijugador',
        fr: 'Multijoueur',
        de: 'Mehrspieler',
        it: 'Multigiocatore',
      })}
      note={tp(
        'WebSocket-клиент в Phase 4',
        'WebSocket client in Phase 4',
        'Klient WebSocket w Phase 4',
        {
          es: 'Cliente WebSocket en Phase 4',
          fr: 'Client WebSocket en Phase 4',
          de: 'WebSocket-Client in Phase 4',
          it: 'Client WebSocket in Phase 4',
        },
      )}
    />
  );
}
