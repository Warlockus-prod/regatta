import { Stack } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useI18n } from '../../src/i18n/context';
import { Screen, Text } from '../../src/design-system/components';
import { sendChat, type ChatMessage } from '../../src/api/chat';
import { colors, radii, spacing } from '../../src/design-system/tokens';
import { useAnalytics, AnalyticsEvent } from '../../src/analytics';

/**
 * Ask - the sailing AI assistant. Mirrors the web FeedbackWidget chat: a
 * yachting-scoped assistant that answers sailing / racing / rules questions
 * and points back to app sections. Talks to the existing web backend
 * (POST /api/ai-chat) per ADR-0001 - no separate mobile backend.
 *
 * Simple turn-based chat: the whole message history is POSTed each turn and
 * the single JSON reply is appended. Errors (network, timeout, 429 rate
 * limit) surface inline with a retry affordance; the user's question is kept
 * so a retry re-sends it.
 */
export default function Ask() {
  const { tp, lang } = useI18n();
  const analytics = useAnalytics();

  const headerTitle = tp('Спросить', 'Ask', 'Zapytaj', {
    es: 'Preguntar',
    fr: 'Demander',
    de: 'Fragen',
    it: 'Chiedi',
  });

  const welcome = tp(
    'Привет! Я ассистент по парусу. Спрашивай про ветер, курсы, паруса, правила расхождения, тактику, термины - отвечу и подскажу нужный раздел приложения. На вопросы не по теме отвечать не буду.',
    'Hi! I am your sailing assistant. Ask about wind, points of sail, trim, right-of-way rules, tactics, terms - I will answer and point you to the right section. I stick to sailing topics only.',
    'Czesc! Jestem asystentem zeglarskim. Pytaj o wiatr, kursy, zagle, zasady, taktyke, terminy - odpowiem i wskaze odpowiednia sekcje. Trzymam sie tematow zeglarskich.',
    {
      es: 'Hola! Soy tu asistente de vela. Pregunta sobre viento, rumbos, trimado, reglas, tactica, terminos: respondo y te indico la seccion. Solo temas de vela.',
      fr: 'Salut ! Je suis ton assistant voile. Demande sur le vent, les allures, le reglage, les regles, la tactique, les termes : je reponds et je t oriente. Sujets voile uniquement.',
      de: 'Hi! Ich bin dein Segel-Assistent. Frag zu Wind, Kursen, Trimm, Regeln, Taktik, Begriffen - ich antworte und zeige dir den Bereich. Nur Segelthemen.',
      it: 'Ciao! Sono il tuo assistente di vela. Chiedi di vento, andature, regolazione, regole, tattica, termini: rispondo e ti indico la sezione. Solo temi di vela.',
    },
  );

  const suggestions = useMemo(
    () => [
      tp(
        'Кто кому уступает на разных галсах?',
        'Who gives way on opposite tacks?',
        'Kto ustepuje na roznych halsach?',
        {
          es: 'Quien cede paso en amuras opuestas?',
          fr: 'Qui cede la priorite sur amures opposees ?',
          de: 'Wer weicht bei entgegengesetztem Bug aus?',
          it: 'Chi da precedenza su mure opposte?',
        },
      ),
      tp(
        'Что взять на первую регату?',
        'What should I bring to my first regatta?',
        'Co zabrac na pierwsze regaty?',
        {
          es: 'Que llevar a mi primera regata?',
          fr: 'Quoi emporter a ma premiere regate ?',
          de: 'Was zur ersten Regatta mitnehmen?',
          it: 'Cosa portare alla prima regata?',
        },
      ),
      tp(
        'Объясни поворот оверштаг простыми словами',
        'Explain tacking in simple words',
        'Wytlumacz zwrot przez sztag prosto',
        {
          es: 'Explica la virada por avante en palabras simples',
          fr: 'Explique le virement de bord simplement',
          de: 'Erklaere die Wende einfach',
          it: 'Spiega la virata in parole semplici',
        },
      ),
    ],
    [lang], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const inputPlaceholder = tp('Спроси про яхтинг...', 'Ask about sailing...', 'Zapytaj o zeglarstwo...', {
    es: 'Pregunta sobre vela...',
    fr: 'Pose une question voile...',
    de: 'Frag zum Segeln...',
    it: 'Chiedi di vela...',
  });
  const sendLabel = tp('Отправить', 'Send', 'Wyslij', {
    es: 'Enviar',
    fr: 'Envoyer',
    de: 'Senden',
    it: 'Invia',
  });
  const thinkingLabel = tp('Думаю...', 'Thinking...', 'Mysle...', {
    es: 'Pensando...',
    fr: 'Je reflechis...',
    de: 'Denke nach...',
    it: 'Sto pensando...',
  });
  const retryLabel = tp('Повторить', 'Retry', 'Ponow', {
    es: 'Reintentar',
    fr: 'Reessayer',
    de: 'Erneut',
    it: 'Riprova',
  });
  const rateLimitMsg = tp(
    'Слишком много вопросов за час. Попробуй позже.',
    'Too many questions this hour. Try again later.',
    'Za duzo pytan w tej godzinie. Sprobuj pozniej.',
    {
      es: 'Demasiadas preguntas esta hora. Intentalo mas tarde.',
      fr: 'Trop de questions cette heure. Reessaie plus tard.',
      de: 'Zu viele Fragen in dieser Stunde. Spaeter erneut.',
      it: 'Troppe domande in questora. Riprova piu tardi.',
    },
  );
  const genericErrorMsg = tp(
    'Не получилось получить ответ. Проверь интернет и попробуй ещё раз.',
    'Could not get a reply. Check your connection and try again.',
    'Nie udalo sie uzyskac odpowiedzi. Sprawdz internet i sprobuj ponownie.',
    {
      es: 'No se pudo obtener respuesta. Revisa la conexion e intenta de nuevo.',
      fr: 'Reponse impossible. Verifie la connexion et reessaie.',
      de: 'Keine Antwort moeglich. Verbindung pruefen und erneut versuchen.',
      it: 'Nessuna risposta. Controlla la connessione e riprova.',
    },
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const ask = useCallback(
    async (text: string, isRetry = false) => {
      const question = text.trim();
      if (!question || loading) return;
      // Record that a question was asked - length + lang only, never the
      // question text itself.
      analytics.capture(AnalyticsEvent.AskSubmitted, {
        is_retry: isRetry,
        lang,
        length: question.length,
      });
      setError(null);
      // On retry the failed user turn is already the last message - re-send the
      // existing history instead of appending a duplicate bubble.
      const endsWithUser =
        messages.length > 0 && messages[messages.length - 1].role === 'user';
      const history: ChatMessage[] =
        isRetry && endsWithUser
          ? messages
          : [...messages, { role: 'user', content: question }];
      if (!(isRetry && endsWithUser)) {
        setMessages(history);
        setInput('');
      }
      setLoading(true);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

      const res = await sendChat(history, lang);
      setLoading(false);
      if (res.ok && res.data) {
        setMessages((prev) => [...prev, { role: 'assistant', content: res.data!.reply }]);
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      } else {
        setError(res.status === 429 ? rateLimitMsg : genericErrorMsg);
      }
    },
    [messages, loading, lang, rateLimitMsg, genericErrorMsg, analytics],
  );

  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {/* Welcome / assistant intro */}
          <View style={[styles.bubble, styles.bubbleAssistant]}>
            <Text variant="body" style={styles.bubbleText}>{welcome}</Text>
          </View>

          {/* Suggested starter questions, only before the first turn */}
          {messages.length === 0 ? (
            <View style={styles.suggestions}>
              {suggestions.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => { void ask(s); }}
                  style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={s}
                >
                  <Text style={styles.chipText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Conversation */}
          {messages.map((m, i) => (
            <View
              key={`${m.role}-${i}`}
              style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}
            >
              <Text variant="body" style={[styles.bubbleText, m.role === 'user' && styles.bubbleTextUser]}>
                {m.content}
              </Text>
            </View>
          ))}

          {loading ? (
            <View style={[styles.bubble, styles.bubbleAssistant, styles.thinkingRow]}>
              <ActivityIndicator color={colors.accentCyan} />
              <Text variant="muted" style={styles.thinkingText}>{thinkingLabel}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text variant="caption" style={styles.errorText}>{error}</Text>
              {lastUserMessage ? (
                <Pressable
                  onPress={() => { void ask(lastUserMessage, true); }}
                  style={({ pressed }) => [styles.retryBtn, pressed && styles.chipPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={retryLabel}
                >
                  <Text style={styles.retryText}>{retryLabel}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        {/* Input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder={inputPlaceholder}
            placeholderTextColor={colors.textMuted}
            multiline
            editable={!loading}
            onSubmitEditing={() => { void ask(input); }}
            returnKeyType="send"
            blurOnSubmit
          />
          <Pressable
            onPress={() => { void ask(input); }}
            disabled={loading || input.trim().length === 0}
            accessibilityRole="button"
            accessibilityLabel={sendLabel}
            style={({ pressed }) => [
              styles.sendBtn,
              (loading || input.trim().length === 0) && styles.sendBtnDisabled,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={styles.sendArrow}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  bubble: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    maxWidth: '88%',
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderCyanFaint,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: colors.surfaceCyanSoft,
    borderWidth: 1,
    borderColor: colors.borderCyanSoft,
  },
  bubbleText: {
    lineHeight: 21,
    color: colors.textPrimary,
  },
  bubbleTextUser: {
    color: colors.textPrimary,
  },
  suggestions: {
    gap: spacing.sm,
  },
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.borderCyanSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceCyanFaint,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    color: colors.accentCyan,
    fontSize: 13,
    fontWeight: '600',
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  thinkingText: {
    fontStyle: 'italic',
  },
  errorBox: {
    alignSelf: 'stretch',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.4)',
    backgroundColor: 'rgba(255, 68, 68, 0.08)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    color: '#ffb3b3',
  },
  retryBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.borderCyanSoft,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  retryText: {
    color: colors.accentCyan,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderCyanFaint,
    backgroundColor: colors.bgPrimary,
  },
  textInput: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.borderCyanSoft,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.bgCard,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentCyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendArrow: {
    color: colors.bgPrimary,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
});
