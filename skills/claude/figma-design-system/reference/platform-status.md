# Figma Status

**As of November 10, 2026.** The one place in this skill for Figma facts that move: plan gates, limits, beta status, tool and skill names. Every other file states process and points here. If this date is more than a few months old, check the links at the bottom before relying on a plan gate, a limit, or a tool name.

Apple OS versions and what changed between them are in `apple-platform` (reference/platform-status.md). Android library versions are in `android-platform`.

## Figma MCP Server

**Which server.** The remote server (`https://mcp.figma.com/mcp`) has the write tools. The desktop server is read-focused.

**Session first.** Call `create_session` with the file key and a short task description before any other file tool, read-only work included. New file: `create_new_file` first, then `create_session` with the returned key. The returned ID goes on later calls as `sessionId`. If the connected server's instructions and Figma's tool reference differ, follow the connected server.

**Plugin skills that are mandatory before their tool:**

| Skill | Before |
| --- | --- |
| `figma-use` | every `use_figma` call |
| `figma-create-new-file` | every `create_new_file` call |
| `figma-design-to-code` | `get_design_context` |
| `figma-shaders` | `create_shader`, `update_shader` |
| `figma-generate-diagram` | `generate_diagram` |

Workflow skills, loaded for the job: `figma-generate-library` (variables, components, a library), `figma-generate-design` (screens and composed UI), `figma-swiftui` (anything Swift, either direction), `figma-code-connect`, `figma-use-motion` and `figma-implement-motion`, `figma-spec`, `figma-code-workflows`.

**Tools this process uses:** `create_session`, `use_figma`, `create_new_file`, `upload_assets`, `generate_figma_design` (live web UI to design layers, select clients only), `get_design_context`, `get_metadata`, `get_screenshot`, `get_variable_defs`, `search_design_system`, `get_libraries`, and the Code Connect tools. The full list is in Figma's tool reference.

**Limits that shape a session:**
- Write to canvas is in beta and free for now. Figma has said it will become usage-based. Paid plans only. Writing outside drafts needs a Full seat.
- Read tools are rate-limited per day for Full and Dev seats: 200 on Professional and Organization, 600 on Enterprise. View and Collab seats get 20 per month.
- A tool call returns at most 20 KB. Read large files in parts.
- `use_figma` can't add images. `upload_assets` does. Fonts have to be uploaded to the Figma account. Components have to be published by hand before Code Connect mappings can complete.

## Variables

- **Modes per collection:** none on Starter, 10 on Professional, 20 on Organization, unlimited on Enterprise through extended collections.
- **Extended collections** are Enterprise only. One inherits every variable and mode from its parent and stores overrides. It can't add variables or modes.
- **5,000 variables** per collection.
- **Binds:** gradient stops and shadow colors (color variables). Shadow offset, blur, spread, and blur radius (number variables). Font family, weight, size, line height, letter spacing (string and number variables). So text styles, effect styles, and gradient styles can all be built from variables.
- **Doesn't bind through the Plugin API:** Glass, Noise, and Texture effect parameters.
- Figma Motion adds timing and easing variable types.

## Components

- **Slots** are generally available on all plans, since June 2026. Slot content through the MCP read tools is listed as coming soon, so check what `get_design_context` returns for a slot before depending on it.
- **Grid** auto layout is generally available.
- **Prototype triggers** have no focus or blur. The set is click, drag, hover, press, key, mouse enter/leave/down/up, and after delay.
- Variables and conditional logic in prototypes need a paid plan.

## Effects

- Per layer: one glass, one layer blur, one background blur, one texture, two noise, eight drop shadows, eight inner shadows.
- **Glass** has been out of beta since January 27, 2026: any layer type, per-corner radius, Splay. Not rendered in SVG export or Figma Sites.
- **Shaders** (custom effects and fills) have been generally available since November 2, 2026, through the `figma-shaders` skill.

## Checking and Handoff

- **Check designs:** Organization and Enterprise, plus Education and Government. Not on Professional. One page at a time, 25,000 layers per selection.
- **Code Connect:** Dev or Full seat on Professional, Organization, Enterprise. Professional gets one active library and one framework.
- **Code Connect parsers** have been unmaintained since August 17, 2026. Template files (`.figma.ts`) are the maintained path. `npx figma connect migrate` converts.
- **Code Connect UI** mappings feed the MCP server but show only a file and component name in Inspect. Snippets in Inspect need CLI template files.
- **Dev Mode:** Professional, Organization, Enterprise.

## Still in Beta

Figma Motion, code layers, Figma Specs, and Figma Sites are open beta. Don't make a design system depend on one without saying so.

## Apple Design Kits in Figma

Apple's kits for the current OS are on Figma Community, linked from developer.apple.com/design/resources:
- iOS and iPadOS 27: `figma.com/community/file/1651309003795292092`
- macOS 27: `figma.com/community/file/1651309434229735362`
- App icon template: `figma.com/community/file/1645923469870515372`

Figma's built-in UI kit list still defaults to the iOS and iPadOS 26 kit. Add the current kit from Community or the Libraries modal. Don't trust the Assets panel default.

## Links

- MCP tools: https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/
- Write to canvas: https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/
- Rate limits: https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/
- Plans and mode limits: https://help.figma.com/hc/en-us/articles/360040328273
- Applying variables: https://help.figma.com/hc/en-us/articles/15343107263511
- Extended collections: https://developers.figma.com/docs/plugins/api/VariableCollection/
- Slots: https://help.figma.com/hc/en-us/articles/38231200344599
- Effects and glass: https://help.figma.com/hc/en-us/articles/360041488473
- Effect binding in the Plugin API: https://developers.figma.com/docs/plugins/api/Effect/
- Prototype triggers: https://help.figma.com/hc/en-us/articles/360040035834
- Check designs: https://help.figma.com/hc/en-us/articles/39592284074263
- Code Connect: https://developers.figma.com/docs/code-connect/
- Beta features: https://help.figma.com/hc/en-us/articles/4406787442711
- Release notes: https://www.figma.com/release-notes/
- Apple design resources: https://developer.apple.com/design/resources/
