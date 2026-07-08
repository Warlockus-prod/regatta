# Sternik motorowodny - konspekt + test egzaminacyjny

Statyczna strona do nauki na patent **sternika motorowodnego** (PL). Dwujęzyczna: teoria i pytania po polsku, komentarze po rosyjsku.

## Zawartość
- `index.html` - konspekt + schematy (огни, знаки, кардинальные «часы», навигация: створ/река/море/порт, устройство яхты) i pytania z odpowiedziami.
- `test.html` - interaktywny test „jak na prawo jazdy": 77 pytań, od razu dobrze/źle + wyjaśnienie, licznik %, tryb egzaminu 75 pytań, ćwiczenie po kategoriach, pauza, podsumowanie błędów.

Wszystko to **czysty HTML/CSS/JS bez zależności** - nie trzeba nic budować ani instalować.

## Jak opublikować (deploy)

**Na własnym serwerze:** skopiuj cały folder do katalogu serwowanego przez web serwer (np. `/var/www/html/`). Strona główna to `index.html`.
```
scp -r sternik-motorowodny/* user@twojserver:/var/www/html/
```

**Szybki darmowy hosting (przeciągnij i upuść):**
- Netlify Drop - https://app.netlify.com/drop → przeciągnij folder → gotowy link.
- Cloudflare Pages - Upload assets → wgraj folder.
- GitHub Pages - wrzuć pliki do repo, Settings → Pages → branch `main` / root.

Punkt wejścia: **index.html**. Nie wymaga backendu, bazy danych ani buildu.

## Aktualizacja bazy pytań
Pytania są w `test.html` w tablicy `const BANK = [...]`. Każdy wpis:
`{c:"Kategoria", q:"pytanie", o:["A","B","C"], a:indeks_poprawnej_0_1_2, w:"komentarz"}`.
