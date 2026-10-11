# Design: "Clinical Editorial"
A calm, paper-like medical chart. Not a SaaS landing page.

## Colours (light / dark)
paper #F6F3EE / #0E151B     surface #FCFBF8 / #141D25     line #DDD6CA / #25323D
ink #13222E / #E9E4DA       ink-soft #4B5A67 / #A8B3BC
primary teal #0E5E63 / #4FB3B0     alert vermilion #C2412D / #F07A66     ok #2E7D5B / #5DBB8F
Sources: EHR #2B6CB0 / #6EA8E6   Lab #4F7F3A / #8DBB6E   Pharmacy #C07A1F / #E3A24A
         Claims #8C5B45 / #C99278

## Type
Newsreader for headings and patient names. Instrument Sans for UI. IBM Plex Mono for IDs,
lab values and hashes (tabular numbers). Scale 12/13/14/16/20/28.

## Shape and motion
4px grid. Radius 6 controls, 10 cards. 1px hairline borders. No shadows except popovers.
Motion 150-220 ms, off under reduced-motion.

## Signature pieces
1 Redacted: a hidden field becomes an ink bar with diagonal hatching, sized like the text.
  Tooltip: "Hidden for Billing - consent required". Bars sweep in over 220 ms on role switch.
2 MatchBadge: "4 systems linked - 96%" with one source-colour dot per system.
3 Source badge and provenance chip (source, time) on every fact.
4 Audit table styled like a ledger: mono rows, 8-character hash chips.

## Layout
Patient list 280px on the left, main area, right drawer 380px. Patient banner: name in
serif 28px, identifier chips in mono, consent pill, "Viewing as" role switcher.

## Microcopy
Plain and clinical: "Hidden for Billing", "3 sources agree, 1 differs". No exclamation
marks, no emoji.

## Checklist before the demo
No gradients or glow. Lucide icons, one stroke width. Real clinical text everywhere. Empty
states say what to do next. Only source colours, teal and vermilion. Visible focus. AA
contrast. Numbers in mono.