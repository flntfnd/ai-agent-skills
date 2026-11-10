# Palette: Named Primitives

All 73 primitives with hex and OKLCH values. Hex is the source of truth. The OKLCH column is the same sRGB color, precise enough to round-trip to the identical 8-bit hex, so the two are interchangeable in CSS. Use OKLCH on web, hex or component values elsewhere.

Every value is inside sRGB. Wide-gamut and per-platform token setup are in [implementation.md](implementation.md). Semantic roles, pairing rules, and contrast are in [../SKILL.md](../SKILL.md).

## Contents

- [Swiss International Style](#swiss-international-style)
- [Bauhaus Primary Palette](#bauhaus-primary-palette)
- [Mid-Century Modernist Palette](#mid-century-modernist-palette)
- [Contemporary Swiss-Influenced Palette](#contemporary-swiss-influenced-palette)
- [Source Notes](#source-notes)

## Swiss International Style

Derived from the poster work of Josef Muller-Brockmann, Armin Hofmann, Theo Ballmer, Max Bill, and others working in the International Typographic Style from the 1950s through the 1970s. They were used in deliberate, limited combinations, rarely more than two or three per composition.

The Swiss style used color functionally: one bold color as an accent against black and white, or two carefully chosen primaries in contrast. The colors are saturated but not garish. They read as strong and precise, not loud.

### Reds

| Token | Hex | OKLCH | Notes |
| --- | --- | --- | --- |
| `swiss-red` | `#D52B1E` | `oklch(56.71% 0.2067 29.54)` | Signal red. The Swiss flag red. Used in the most iconic posters. |
| `swiss-red-warm` | `#E63229` | `oklch(60.33% 0.2164 28.55)` | Warmer, more orange-leaning variant. Muller-Brockmann road safety series. |
| `swiss-red-deep` | `#B31B1B` | `oklch(49.34% 0.1857 27.49)` | Deeper crimson. Shadows, backgrounds when red is the primary hue. |
| `swiss-red-dark` | `#8C1414` | `oklch(41.28% 0.1541 27.35)` | Dark red. Near-black use cases within a red composition. |
| `swiss-vermillion` | `#E8401A` | `oklch(61.74% 0.2100 33.59)` | Orange-red. Appears in warmer poster compositions. |

### Blues

| Token | Hex | OKLCH | Notes |
| --- | --- | --- | --- |
| `swiss-blue` | `#1B4499` | `oklch(41.20% 0.1468 262.50)` | Cobalt blue. The classic Swiss poster blue. |
| `swiss-blue-bright` | `#1A5CB5` | `oklch(48.64% 0.1555 257.69)` | Brighter, more electric variant. Contrast against warm yellows. |
| `swiss-blue-deep` | `#0F2E6E` | `oklch(32.22% 0.1173 262.44)` | Deep navy-cobalt. Background use in blue-dominant compositions. |
| `swiss-cyan` | `#0097A7` | `oklch(61.87% 0.1063 207.97)` | Cyan-teal. Appears in later Swiss style work, especially print. |

### Yellows and Golds

| Token | Hex | OKLCH | Notes |
| --- | --- | --- | --- |
| `swiss-yellow` | `#F5C900` | `oklch(84.94% 0.1739 92.82)` | Warm primary yellow. The standard Swiss poster yellow. |
| `swiss-yellow-bright` | `#FCE000` | `oklch(90.20% 0.1876 100.13)` | Brighter, purer yellow. Closer to pure primary. |
| `swiss-yellow-warm` | `#F0B800` | `oklch(81.11% 0.1660 86.40)` | Amber-warm yellow. Pairs with deep blue or black backgrounds. |
| `swiss-gold` | `#C8960A` | `oklch(70.18% 0.1422 84.30)` | Deep gold. Tertiary use, printed-ink feel. |
| `swiss-amber` | `#D4860A` | `oklch(68.55% 0.1477 68.68)` | Amber. Appears in earth-toned compositions. |
| `swiss-ochre` | `#865D07` | `oklch(50.91% 0.1037 77.95)` | Dark ochre. The yellow family at a weight that reads on light surfaces. Light-mode warning. |

### Greens

| Token | Hex | OKLCH | Notes |
| --- | --- | --- | --- |
| `swiss-green` | `#1B6B3A` | `oklch(46.78% 0.1091 152.01)` | Forest green. Less common but appears in nature/environment posters. |
| `swiss-green-bright` | `#2D8A4A` | `oklch(56.29% 0.1305 150.15)` | Brighter green. Spring/seasonal poster work. |
| `swiss-teal` | `#0B7A6E` | `oklch(52.14% 0.0906 182.82)` | Blue-green teal. Mid-century crossover with cyan palette. |

### Oranges

| Token | Hex | OKLCH | Notes |
| --- | --- | --- | --- |
| `swiss-orange` | `#E05C1A` | `oklch(63.61% 0.1795 42.38)` | Warm orange. Appears in consumer/lifestyle poster work. |
| `swiss-orange-deep` | `#C44810` | `oklch(56.54% 0.1695 40.14)` | Deep burnt orange. Background-weight orange. |

### Neutrals and Achromatics

The backbone of Swiss design. Most compositions are primarily these, with color used as accent.

| Token | Hex | OKLCH | Notes |
| --- | --- | --- | --- |
| `swiss-black` | `#0A0A0A` | `oklch(14.48% 0 0)` | Near-black. More nuanced than pure #000000 in print. |
| `swiss-ink` | `#1A1A1A` | `oklch(21.78% 0 0)` | Standard ink black. Primary text color. |
| `swiss-charcoal` | `#2E2E2E` | `oklch(30.12% 0 0)` | Charcoal. Dark backgrounds that aren't fully black. |
| `swiss-dark-gray` | `#4A4A4A` | `oklch(40.91% 0 0)` | Dark gray. Secondary text, supporting elements. |
| `swiss-mid-gray` | `#787878` | `oklch(57.27% 0 0)` | Mid gray. Dividers, secondary backgrounds. |
| `swiss-light-gray` | `#B4B4B4` | `oklch(76.99% 0 0)` | Light gray. Subtle backgrounds, disabled states. |
| `swiss-pale-gray` | `#DCDCDC` | `oklch(89.45% 0 0)` | Pale gray. Near-white backgrounds with warmth. |
| `swiss-off-white` | `#F0EDE8` | `oklch(94.70% 0.0074 80.72)` | Off-white with slight warm tone. Paper-feel backgrounds. |
| `swiss-pure-white` | `#FFFFFF` | `oklch(100.00% 0 0)` | Pure white. For cases where maximum contrast is required. |

## Bauhaus Primary Palette

From Johannes Itten's color theory. Itten taught the Bauhaus preliminary course from 1919 to 1923 and published the system in *The Art of Color* (1961). The school itself ran until 1933. These colors are the purest articulation of primary-triad thinking in 20th-century design, and they shaped Swiss Style directly.

Itten's system: three primaries at maximum saturation, always used in relationship to each other and to the neutrals black and white. Bauhaus white is `swiss-pure-white`.

| Token | Hex | OKLCH | Notes |
| --- | --- | --- | --- |
| `bauhaus-red` | `#C8302A` | `oklch(54.87% 0.1896 27.76)` | Itten primary red. Neither blue-shifted nor orange-shifted. |
| `bauhaus-yellow` | `#E8C018` | `oklch(81.91% 0.1639 93.23)` | Itten primary yellow. Warm gold-yellow, not pure lemon. |
| `bauhaus-blue` | `#1E3878` | `oklch(35.96% 0.1142 264.64)` | Itten primary blue. Deep cobalt, not navy and not sky. |
| `bauhaus-black` | `#000000` | `oklch(0.00% 0 0)` | Pure black. Itten used it as a structural color, not just text. |
| `bauhaus-gray` | `#808080` | `oklch(59.99% 0 0)` | Neutral mid-gray. Itten's intermediate between black and white. |

Secondaries (Itten's mixed secondaries):

| Token | Hex | OKLCH | Notes |
| --- | --- | --- | --- |
| `bauhaus-orange` | `#D4600A` | `oklch(62.29% 0.1669 47.85)` | Red + Yellow. Warm, saturated. |
| `bauhaus-green` | `#2A7A3A` | `oklch(51.49% 0.1247 147.26)` | Yellow + Blue. Forest, not lime. |
| `bauhaus-violet` | `#5C2080` | `oklch(38.46% 0.1553 309.43)` | Red + Blue. Deep purple-violet. |

## Mid-Century Modernist Palette

Colors from the wider 1950s-1970s modernist era: Swiss Style, the Bauhaus legacy, and related movements like Dutch Total Design and Italian rational design.

| Token | Hex | OKLCH | Notes |
| --- | --- | --- | --- |
| `modernist-red` | `#E0272A` | `oklch(58.53% 0.2177 26.69)` | The standard mid-century poster red. |
| `modernist-blue` | `#1C5CB2` | `oklch(48.46% 0.1510 257.50)` | The standard mid-century poster blue. |
| `modernist-yellow` | `#F2C200` | `oklch(83.26% 0.1702 90.64)` | The standard mid-century poster yellow. |
| `modernist-green` | `#1E6E44` | `oklch(47.93% 0.1022 155.81)` | Deep functional green. |
| `modernist-orange` | `#D95B1A` | `oklch(62.40% 0.1734 43.04)` | The characteristic mid-century orange-red. |
| `modernist-teal` | `#00717A` | `oklch(50.04% 0.0854 204.48)` | Characteristic 1960s teal. |
| `modernist-brown` | `#6E3A1C` | `oklch(40.81% 0.0849 48.65)` | Warm functional brown. Appears in earth-toned work. |
| `modernist-cream` | `#F2EDE0` | `oklch(94.65% 0.0181 89.36)` | Warm cream. Slightly more yellow than warm-200. |

## Contemporary Swiss-Influenced Palette

Colors used by designers working in the Swiss/modernist tradition today: the same principles (primary relationships, functional color, deliberate restraint) with full neutral ramps for interface work.

### Warm Neutrals (Neo-Minimalism adjacent)

| Token | Hex | OKLCH | Notes |
| --- | --- | --- | --- |
| `warm-100` | `#FAFAF7` | `oklch(98.43% 0.0040 106.47)` | Warm near-white. Avoids the sterility of pure #FFFFFF. |
| `warm-200` | `#F5F3EE` | `oklch(96.43% 0.0070 88.64)` | Standard warm background. The Swiss paper tone, not pure white. |
| `warm-300` | `#EDE9E2` | `oklch(93.52% 0.0103 81.79)` | Warm light. |
| `warm-400` | `#E0DAD1` | `oklch(89.06% 0.0138 78.26)` | Warm mid-light. |
| `warm-500` | `#C4BCB0` | `oklch(79.84% 0.0189 78.22)` | Warm mid. |
| `warm-600` | `#9A9086` | `oklch(65.91% 0.0188 67.49)` | Warm mid-dark. |
| `warm-700` | `#6E655A` | `oklch(51.18% 0.0204 72.87)` | Warm dark. |
| `warm-800` | `#433B31` | `oklch(35.74% 0.0201 73.27)` | Warm darker. |
| `warm-900` | `#2A2420` | `oklch(26.56% 0.0117 55.83)` | Near-black warm. |
| `warm-950` | `#1A1614` | `oklch(20.42% 0.0076 48.33)` | Very near-black warm. |

### Cool Neutrals (Editorial, Futuristic adjacent)

| Token | Hex | OKLCH | Notes |
| --- | --- | --- | --- |
| `cool-100` | `#F8F9FA` | `oklch(98.16% 0.0017 247.84)` | Cool near-white. |
| `cool-200` | `#F0F1F3` | `oklch(95.79% 0.0029 264.54)` | Cool light background. |
| `cool-300` | `#E2E4E8` | `oklch(91.85% 0.0058 264.53)` | Cool light. |
| `cool-400` | `#C8CACE` | `oklch(83.86% 0.0060 264.53)` | Cool mid-light. |
| `cool-500` | `#9EA2A8` | `oklch(71.08% 0.0098 258.34)` | Cool mid. |
| `cool-600` | `#74787F` | `oklch(57.16% 0.0118 261.77)` | Cool mid-dark. |
| `cool-700` | `#4E5258` | `oklch(43.71% 0.0111 258.36)` | Cool dark. |
| `cool-800` | `#2E3036` | `oklch(30.96% 0.0111 271.04)` | Cool darker. |
| `cool-900` | `#1A1C20` | `oklch(22.60% 0.0083 264.39)` | Near-black cool. |
| `cool-950` | `#0E1014` | `oklch(17.27% 0.0089 264.31)` | Very near-black cool. |

### Accent Lights (Dark Surfaces)

The Swiss accents lifted for dark backgrounds. On light surfaces use the `swiss-*` originals. Red has three steps because dark-mode interactive states get lighter: light, lighter, lightest.

| Token | Hex | OKLCH | Notes |
| --- | --- | --- | --- |
| `accent-red-light` | `#F6463B` | `oklch(64.93% 0.2141 28.23)` | Light red for dark backgrounds. Dark-mode primary and error. |
| `accent-red-lighter` | `#FD6E5F` | `oklch(71.05% 0.1777 28.37)` | Lighter step of the same red. Dark-mode hover. |
| `accent-red-lightest` | `#FD988A` | `oklch(78.11% 0.1239 28.63)` | Lightest step of the same red. Dark-mode pressed. |
| `accent-blue-light` | `#578EF9` | `oklch(66.08% 0.1697 262.27)` | Light blue for dark backgrounds. Dark-mode info and accent. |
| `accent-yellow-light` | `#FFDA00` | `oklch(89.27% 0.1839 96.61)` | Brighter yellow for impact. |
| `accent-green-light` | `#319A57` | `oklch(60.99% 0.1387 151.64)` | Light green for dark backgrounds. Dark-mode success. |
| `accent-orange-light` | `#F07830` | `oklch(70.08% 0.1687 47.71)` | Light orange for dark backgrounds. |
| `accent-cyan-light` | `#00B8CC` | `oklch(71.61% 0.1233 208.50)` | Light cyan for dark backgrounds. |

## Source Notes

**Swiss International Style colors** come from the posters: Muller-Brockmann's Musica Viva and road safety series, Hofmann's Basel Theater posters, Ballmer's Norm poster (1928), and related works held by MoMA and the Museum of Design Zurich. Fabian Burghardt's Swiss Style Color Picker (fabianburghardt.de/swisscolors, 2015) systematized these combinations, and the colors here line up with his. The hex values are a digitization of ink on paper. They're a faithful approximation, not a colorimetric match.

**Bauhaus primary palette** values come from Hue Atlas (hueatlas.com) and its reading of Itten's *The Art of Color* and archival originals. `#C8302A` / `#E8C018` / `#1E3878` sit in the middle of the range across those sources, allowing for the gamut difference between lithographic inks and RGB displays. Same caveat: ink to RGB is approximate.
