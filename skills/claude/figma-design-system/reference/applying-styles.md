# Applying a Visual Style to an Existing Design

## Contents
- [When to Use This](#when-to-use-this)
- [Not a Token Swap](#not-a-token-swap)
- [Order of Operations](#order-of-operations)
- [Figma Effect Recipes by Style](#figma-effect-recipes-by-style)
- [Style-Specific Component Changes](#style-specific-component-changes)

## When to Use This

A design already exists and has to be reskinned to a specific visual style. The layout and content are known. The visual language changes completely. Work on a duplicate of the page or on a branch, never over the only copy. The side-by-side test below needs the original, and so does anyone who wants to back out.

The style definitions are in the `visual-styles` skill, one file per style: Visual Signature, token modifications, component rules, per-platform implementation, "Wrong if" checklists. Read the target style's file before touching Figma. This file only has how it gets done in Figma.

## Not a Token Swap

Applying a style means restructuring components, not changing fill colors and font weights. If the Neo-Brutalism version looks like the Neo-Minimalism version with a yellow background, the style wasn't applied. Only the color variables changed.

The test: open both versions side by side. If the component structures are identical (same Auto Layout, same layer organization, same shadow and border treatment), the style wasn't applied.

## Order of Operations

**1. Read the Visual Signature.** Before touching Figma, read the Visual Signature section of the target style in `visual-styles`. List every structural requirement and note the "Wrong if" checklist. That's what done looks like.

**2. Audit existing components against the target style.** For each major component (navigation, hero, content list items, cards, buttons, CTA sections): does the current structure meet the Visual Signature? List what has to change structurally before any token changes.

**3. Restructure components.** All structural changes come before token values:
- Changing list items to cards (adding stroke and drop shadow layers)
- Adding or removing Auto Layout padding to shift spacing rhythm
- Changing corner radius on all frames (0 for Neo-Brutalism, large for Bento, blob shapes for Organic)
- Adding drop shadows with the right properties for the style, or removing shadows entirely (Brutalism Pure, Calm)
- Changing section backgrounds (brand-color fills for Neo-Brutalism sections, single base color for Neumorphism)
- Restructuring navigation (solid colored bar for Neo-Brutalism, nearly invisible for Calm, glass for Liquid Glass, see [liquid-glass.md](liquid-glass.md))

**4. Apply the Figma effects for the style.** Recipes below.

**5. Update token values.** With the structure right, update the variable collections to the target style's token specifications from `visual-styles`. Switching the mode on a frame now shows the full style treatment, not just a color change.

**6. Run the "Wrong if" checklist.** From `visual-styles`. If any condition applies, fix it before calling the style applied.

## Figma Effect Recipes by Style

**Hard offset shadow (Neo-Brutalism).** Drop Shadow → X: 4, Y: 4, Blur: 0, Spread: 0, Color: #000000, Opacity: 100%. Blur is 0. This isn't a standard drop shadow, and blur above 0 is the most common way this style gets built wrong.

**Glassmorphism / glass card.** Fill white at 12% opacity, Background Blur 16px, stroke 1px white at 25% opacity (inside). The frame sits over rich content. Glass over flat white is invisible.

**Neumorphism dual shadow.** Drop Shadow 1: X -4, Y -4, Blur 8, Color #FFFFFF, Opacity 70%. Drop Shadow 2: X 4, Y 4, Blur 8, Color #000000, Opacity 20%. No stroke. No fill different from the background. Every surface matches the page background exactly.

**Futuristic glow border.** Stroke 1px, accent color at 20% opacity. Drop Shadow X: 0, Y: 0, Blur: 12, Color: accent, Opacity: 60%.

**Grain texture (Texture/Tactile).** The native Noise effect on every surface frame. Mono, density and size low enough to read as the 3-5% grain the style calls for. Don't use the old noise-fill rectangle set to Overlay on top of each frame.

**Effects the built-in types can't produce** (dither, scanlines, CRT curvature, halftone for Retro Computing and Futuristic). A custom shader effect or fill through the `figma:figma-shaders` skill, saved and reused across the file. Not stacked workarounds.

Shadow and blur values bind to variables. Save each recurring effect stack as an effect style. Noise, Texture, and Glass parameters don't bind through the Plugin API, so set them to the token's literal value. These recipes are the starting point. The style's file in `visual-styles` has the final say on values.

## Style-Specific Component Changes

The components that most often come out wrong, and what changes for each.

**Neo-Brutalism: content list items become cards.** Select the list item component. Add a stroke layer: 2px, #000000, Center. Add a drop shadow: X 4, Y 4, Blur 0, Color #000, 100%. Set corner radius to 0. Add 12-16px Auto Layout padding on all sides. Do this for every item in every list.

**Neo-Minimalism: remove all card borders and shadows.** Remove strokes and all drop shadows from every component. Separation between items comes from Auto Layout spacing (20-32px gap) only. Never borders.

**Brutalism Pure: remove all decorative styling.** Remove all drop shadows system-wide. Remove all strokes except explicit 1px dividers. Set all corner radii to 0. Reduce all fills to the two-color palette. No fills on section backgrounds. All sections share the same paper background.

**Neumorphism: all surfaces match one base color.** Set the page background, all card fills, and all button fills to the exact same base color (#E4EBF5 light, #1E1E2E dark). Any surface that differs breaks the style. Depth comes only from the dual shadow pair.

**Organic/Biomorphic: rectangles become blobs.** For each card or container, set asymmetric per-corner radius values. Figma takes pixels, not percentages, so work them out from the frame's shorter side: roughly 60%, 40%, 70%, 30% of it for top-left, top-right, bottom-right, bottom-left. Or use a vector blob shape as the container frame. Standard rounded rectangles aren't Organic.
