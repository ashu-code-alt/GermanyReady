# GermanyReady — Einbürgerungstest Trainer

A fully offline, browser-based trainer for the German citizenship exam (Einbürgerungstest), covering all 300 official BAMF questions (Stand: 07.05.2025).

---

## Features

| Feature | Details |
|---|---|
| **300 General Questions** | Full BAMF catalogue, Stand 07.05.2025 |
| **16 State-Specific Sets** | One per Bundesland, 10 questions each |
| **4 Quiz Modes** | All 300 · State · Topic (5 categories) · Weak Questions |
| **Learn Mode** | Flashcard-style with reveal, Know/Not-Yet buttons |
| **Mock Exam** | 33 questions, 60-minute countdown, real exam simulation |
| **Spaced Repetition (SRS)** | Intervals: 1 → 2 → 4 → 7 → 14 → 30 days |
| **Progress Tracking** | Per-question grid (untouched / seen / correct / wrong) |
| **Vocabulary Glossary** | 143 key terms with hover tooltips in questions |
| **21 UI Languages** | EN, TR, AR, RU, UK, PL, RO, FA, SR, HR, ES, IT, FR, PT, VI, ZH, HI, BN, NL, KU |
| **RTL Support** | Arabic, Persian, Kurdish |
| **Dark / Light / System Theme** | Per-language accent colours |
| **Text-to-Speech** | Read German questions aloud |
| **Fully Offline** | No backend, no account — all data in `localStorage` |

---

## Getting Started

No build step, no dependencies.

```bash
git clone https://github.com/your-username/GermanyReady.git
cd GermanyReady
# Open index.html in a browser, or use a local server:
npx serve .
# or: python3 -m http.server 5501
```

> **Note:** Due to browser security restrictions, open via a local server (not `file://`) to allow dynamic script loading.

---

## Project Structure

```
GermanyReady/
├── index.html          # App shell + all UI sections
├── css/
│   └── styles.css      # Theme system, layout, components
├── js/
│   └── app.js          # All application logic
└── data/               # Loaded dynamically on startup
    ├── questions.js    # 300 BAMF general questions (~1.2 MB)
    ├── states.js       # 16 × 10 state-specific questions (~600 KB)
    ├── images.js       # Base64 images for 10 questions (~900 KB)
    ├── vocabulary.js   # 143 glossary terms (~300 KB)
    ├── explanations.js # German + English explanations (~350 KB)
    ├── translations.js # Questions translated into 21 languages (~1.1 MB)
    └── metadata.js     # Difficulty ratings, language config, topics
```

Data files are loaded sequentially in the background on startup, showing a progress bar. The app becomes interactive as soon as all files are ready.

---

## How the Exam Works

The real **Einbürgerungstest** consists of **33 questions**:
- 30 drawn from the 300 general questions
- 3 drawn from the 10 questions specific to your chosen Bundesland

You need **at least 17 correct answers** (≈52%) to pass.

---

## Spaced Repetition

Questions you mark as wrong are scheduled for review:

| Repetition | Review after |
|---|---|
| 0 (new wrong) | 1 day |
| 1 | 2 days |
| 2 | 4 days |
| 3 | 7 days |
| 4 | 14 days |
| 5+ | 30 days |

Correct answers advance the interval; wrong answers reset it.

---

## Updating Questions

When BAMF releases a new catalogue:

1. Download the new PDF from [oet.bamf.de](https://oet.bamf.de)
2. Share the PDF with Claude (claude.ai)
3. Prompt: *"Here is the updated BAMF PDF (Stand: [date]). Rebuild with updated questions, preserve all features."*
4. Replace the relevant files in `data/`

---

## Tech Stack

- **Vanilla HTML / CSS / JavaScript** — zero framework, zero dependencies
- **localStorage** — all progress persisted locally, never leaves the device
- **Web Speech API** — browser-native TTS for German pronunciation
- **Google Fonts** — Syne, Inter, Lora (loaded from CDN)

---

## Privacy

This app collects no data. All learning progress is stored exclusively in your browser's `localStorage` and can be cleared at any time from Settings → Daten → Fortschritt zurücksetzen.

---

## Legal

This is an independent, unofficial educational tool. It is not affiliated with or endorsed by the **Bundesamt für Migration und Flüchtlinge (BAMF)** or the German government.

Question content: © Bundesamt für Migration und Flüchtlinge — Gesamtfragenkatalog zum Test „Leben in Deutschland" und zum „Einbürgerungstest", Stand: 07.05.2025.

Official resources: [bamf.de](https://www.bamf.de) · [oet.bamf.de](https://oet.bamf.de)
