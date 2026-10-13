# Design: "Vibrant Clinical"
A crisp, vibrant medical chart with decisive clinical color coding. Not a SaaS landing page.

## Colours (light / dark)
paper #FAF7F2 / #0C1319     surface #FFFFFF / #131C24     line #DCE4E8 / #253442
ink #0F1E2B / #F0ECE1       ink-soft #455A6C / #9EACB8     tint-teal #E3F6F4 / #0A2E2C
primary #00A19B / #00C4BC   primary-strong #007F7A / #009E97
alert #FF4D3D / #FF5C4D     warn #FFB020 / #FFBA33         ok #22B573 / #2ED68B
Sources: EHR #1F6FFF / #4D8DFF   Lab #12B76A / #22D37E   Pharmacy #FF8A00 / #FFA033
         Claims #E83E8C / #F065A5

## Type
Newsreader for headings and patient names. Instrument Sans for UI. IBM Plex Mono for IDs,
lab values and hashes (tabular numbers). Scale 12/13/14/16/20/28.

## Shape and motion
4px grid. Radius 6 controls, 10 cards. 1px hairline borders with colored left-edge strips by source.
No shadows except popovers. Motion 150-220 ms, off under reduced-motion.

## Signature pieces
1 Redacted: a hidden field becomes an ink bar with diagonal hatching, sized like the text.
  Tooltip: "Hidden for Billing - consent required". Bars sweep in over 220 ms on role switch.
2 MatchBadge: "4 systems linked - 96%" with one source-colour dot per system and a large coloured confidence ring.
3 Source badge and provenance chip (source, time) on every fact. Coloured left-edge card strips.
4 Audit table styled like a ledger: mono rows, 8-character hash chips.
5 Coloured status pills: consent active, pending, revoked.
6 Tinted section headers and vivid reference bands on lab charts.
7 Coloured avatars for roles on login badges.

## Layout
Patient list 280px on the left, main area, right drawer 380px. Patient banner: name in
serif 28px, identifier chips in mono, consent pill, "Viewing as" role switcher.

## Microcopy
Plain and clinical: "Hidden for Billing", "3 sources agree, 1 differs". No exclamation
marks, no emoji.

## Checklist before the demo
No gradient backgrounds behind text; solid colour blocks and small accent strokes only.
Lucide icons, one stroke width. Real clinical text everywhere. Empty states say what to do next.
Vibrant source colours, teal and vermilion. Visible focus. AA contrast. Numbers in mono.