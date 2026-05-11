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
      badge={tp('Phase 4', 'Phase 4', 'Phase 4', {
        es: 'Fase 4',
        fr: 'Phase 4',
        de: 'Phase 4',
        it: 'Fase 4',
      })}
      note={tp(
        'Гонки в реальном времени с другими ходоками - запуск во второй половине года, после того как одиночный режим обкатается.',
        'Real-time races against other sailors - launching later this year, once the solo mode has settled.',
        'Wyscigi w czasie rzeczywistym z innymi - start w drugiej polowie roku, po zaltwieniu trybu solo.',
        {
          es: 'Regatas en tiempo real con otros - lanzamos en la segunda mitad del ano, tras estabilizar el modo en solitario.',
          fr: 'Courses en temps reel contre dautres regatiers - lancement au second semestre, apres stabilisation du solo.',
          de: 'Echtzeit-Rennen gegen andere Segler - Start in der zweiten Jahreshaelfte, nachdem der Solo-Modus stabil laeuft.',
          it: 'Regate in tempo reale con altri - lancio nella seconda meta dellanno, dopo che il solo si e assestato.',
        },
      )}
      highlights={[
        tp(
          'Лобби с друзьями и приватные комнаты',
          'Friend lobbies and private rooms',
          'Lobby ze znajomymi i prywatne pokoje',
          {
            es: 'Salas con amigos y privadas',
            fr: 'Salons entre amis et prives',
            de: 'Freundes-Lobbies und private Raeume',
            it: 'Lobby con amici e stanze private',
          },
        ),
        tp(
          'Синхронный ветер и течение для всех гонщиков',
          'Synced wind and current for every sailor',
          'Synchroniczny wiatr i prad dla wszystkich',
          {
            es: 'Viento y corriente sincronizados para todos',
            fr: 'Vent et courant synchronises pour tous',
            de: 'Synchroner Wind und Stroemung fuer alle',
            it: 'Vento e corrente sincronizzati per tutti',
          },
        ),
        tp(
          'Голосовой чат и быстрые реакции',
          'Voice chat and quick reactions',
          'Czat glosowy i szybkie reakcje',
          {
            es: 'Chat de voz y reacciones rapidas',
            fr: 'Chat vocal et reactions rapides',
            de: 'Voice-Chat und Schnell-Reaktionen',
            it: 'Chat vocale e reazioni rapide',
          },
        ),
      ]}
    />
  );
}
