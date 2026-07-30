@AGENTS.md

## Visual Fidelity Rule (Stitch Integration)

When building any screen from a stitch-export/*/code.html file, you MUST NOT silently
drop background images, glow effects, or atmospheric visuals just because they're
implemented as external image URLs or complex CSS in the source file.

For every visual element in a Stitch mockup, follow this priority order:
1. If it's a stable, real image URL, use it directly via ImageBackground/Image.
2. If it's an unstable/internal URL or a CSS-only effect (gradients, box-shadows,
   layered glows, particle animations), rebuild the same visual effect natively
   using LinearGradient, shadow/glow styling, layered Views, or Animated/Reanimated
   — do not just omit it.
3. If something genuinely cannot be replicated natively and you must simplify it,
   you MUST explicitly flag it to me in your response (e.g. "Note: skipped X because
   Y — let me know if you want it rebuilt a different way") rather than omitting it
   silently. Never simplify a background/atmosphere element without flagging it.

This applies to every screen going forward, including ones already built — if you
notice a past screen has this issue while working on something else, flag it to me
even if fixing it isn't the current task.

## Component Depth Standard

RockButton and RockCard (and any future shared component with a "glossy/glowing"
treatment) must always be built with REAL layered depth, not flat fills:
- Background: LinearGradient, not a solid color, when the source design has any
  gradient or shading.
- Glossy highlight: a top-aligned semi-transparent white-to-transparent gradient
  overlay where the source design shows one.
- Outer glow: real colored shadow (shadowColor/shadowRadius/shadowOpacity on iOS,
  and an Android-compatible equivalent) matching the component's accent color —
  not just a plain elevation with no color.
Before marking any new shared component as "done," compare it directly against
its Stitch source file's CSS and confirm gradients/glow/highlight are present,
not simplified away. If a true visual match isn't achievable in React Native,
flag it explicitly rather than silently flattening it.
