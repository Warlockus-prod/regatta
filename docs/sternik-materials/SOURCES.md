# Sternik motorowodny - baza pytan: zrodla i analiza

Analiza wykonana przy budowie sekcji /sternik (lipiec 2026). Odpowiada na
pytanie: "na jakiej bazie pracujemy i skad pytania".

## Wniosek o kanonicznej bazie

- **Nie istnieje prawnie wiazaca, opublikowana zamknieta lista pytan.** Egzamin
  reguluje rozporzadzenie Ministra Sportu i Turystyki z 9.04.2013 (tekst
  jednolity Dz.U. 2026 poz. 604), ktore ustala tylko zakres wiedzy i parametry
  testu: 75 pytan, 90 minut, prog 65, jednokrotny wybor.
- **De-facto kanon:** baza utrzymywana przez PZMWiNW (Polski Zwiazek Motorowodny
  i Narciarstwa Wodnego), historycznie autorstwa Jerzego Czeszki (Warszawa 2003),
  aktualizowana. Krazacy podzbior sternik motorowodny to **~337 pytan (3-opcyjne
  A/B/C)**. Starszy master Czeszki to 350 pytan otwartych z odpowiedziami
  wzorcowymi.
- **Wszystkie szkolne PDF-y i symulatory to reformaty tej jednej bazy.** Rozne
  liczby to ta sama tresc: 286 = 4-opcyjny reformat (Centrum Zeglarskie),
  ~354 = starszy rozszerzony 3-opcyjny (Wind), ~276 = zmierzone live
  (akademiasternika), 800+ = pula pzmw.pl laczaca WSZYSTKIE kategorie patentow.
- **Prawdziwy egzamin 2026 = 3 opcje (A/B/C).** 4-opcyjna baza Centrum to
  wariant do nauki, nie uklad egzaminacyjny.

## Zrodla wykorzystane w tej sekcji

| Zrodlo | Format | Pytania | Odpowiedzi | Uzycie |
|---|---|---|---|---|
| Wlasny zestaw (autorski) | 3-opcyjny | 157 | autorskie, zweryfikowane | rdzen puli egzaminacyjnej |
| Centrum Zeglarskie (PDF) | 4-opcyjny | 286 + klucz | drukowany klucz | +222 po dedup, material rozszerzony |
| Wind Sailing School (PDF) | 3-opcyjny | ~354 | podswietlone zolto | pula egzaminacyjna |
| motosternik.pl (HD Quiz) | 3-opcyjny | 75 | value="1" w DOM | pula egzaminacyjna |
| h2o.org.pl (nx-quizes) | 3-opcyjny | 60 | data-correct w DOM | walidacja krzyzowa |
| akademiasternika.pl (JSON API) | 3-opcyjny | ~276 | isCorrect w JSON | pula egzaminacyjna (najlepsze) |

Kazde nowe pytanie: dedup wzgledem istniejacych, kategoria + wyjasnienie PL/RU,
niezalezna weryfikacja odpowiedzi (bledy klucza odrzucone). Pytania obrazkowe z
PDF-ow pominieto (brak grafik jako danych); wlasne 9 pytan obrazkowych (znaki
kardynalne/boczne/flaga A) narysowano jako SVG.

## Inne zrodla znalezione (niewykorzystane bezposrednio)

- **matroos.edu.pl / edukacjawodna.pl PDF** - 3-opcyjny z kluczem, ~800 pula
  (wszystkie kategorie). Redundantny z akademiasternika.
- **obozyzeglarskie.com #346 PDF** - 96 stron, 350 pytan otwartych (pelna tresc
  Czeszki), bez A/B/C. Dobra referencja tresciowa.
- **patentymazury.pl** - natywne A/B/C z siatka "+", tylko czesc pytan (76-225).
- **korsea.pl** - 4-opcyjny (niestandardowy), odpowiedzi tylko po wyslaniu.
- **Aplikacje mobilne / Quizlet / Anki** - zamkniete, nieeksportowalne.

## Format do treningu

Pula egzaminacyjna (pytania 3-opcyjne) odzwierciedla prawdziwy egzamin:
probny egzamin bierze 75 losowych pytan 3-opcyjnych, 90 minut, prog 65.
Trening daje cala baze (w tym 4-opcyjne Centrum do glebszej proby).
