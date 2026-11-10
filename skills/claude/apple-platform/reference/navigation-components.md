# Navigation and Component Patterns

APIs marked (27) need a 27 deployment target or an availability check. Everything unmarked works back to 26. See `platform-status.md`.

## Contents

- [iOS Navigation](#ios-navigation)
- [Search](#search)
- [iPadOS Navigation](#ipados-navigation)
- [macOS Navigation](#macos-navigation)
- [Inactive Windows](#inactive-windows)
- [Toolbar](#toolbar)
- [Menus](#menus)
- [Floating Action](#floating-action)
- [Sheet](#sheet)
- [Sheet Morphing from Toolbar](#sheet-morphing-from-toolbar)
- [Tabs Inside a View](#tabs-inside-a-view)
- [Foldable Layout](#foldable-layout)

## iOS Navigation

The tab bar is a floating glass capsule at the bottom. It can minimize on scroll and expand on scroll back:

```swift
TabView {
    Tab("Feed", systemImage: "list.bullet") { FeedView() }
    Tab("Library", systemImage: "books.vertical") { LibraryView() }
}
.tabBarMinimizeBehavior(.onScrollDown)
```

Minimizing happens on iPhone only. A `tabViewBottomAccessory` (a mini player) sits above the bar and moves inline when it minimizes.

One tab can be set apart at the trailing end of the bar with the prominent role (27). Only one, and only for a destination different in kind from the others, like a cart:

```swift
Tab("Cart", systemImage: "cart", role: .prominent) {
    CartView()
}
```

Don't set the selection to a hidden tab. Under the 27 SDK `TabView` enforces a visible selection and can crash.

## Search

Search as a tab uses the search role. The system separates it from the other tabs and places it at the trailing end:

```swift
Tab("Search", systemImage: "magnifyingglass", role: .search) {
    SearchView()
}
```

The HIG has two search tab styles. Which one a screen uses is a design decision:

- Standard tab: opens a search landing page with the field at the top. For apps with content worth browsing before typing. This is the default.
- Button appearance: selecting the tab focuses the field and raises the keyboard immediately. Exiting returns to the previous tab. For search that should resolve fast. Opt in on the `TabView` with `.tabViewSearchActivation(.searchTabSelection)`.

If no tab has the prominent role, the search tab may get the prominent treatment. When the scope is one view and not the app, put search in a toolbar or inline next to the content it filters.

## iPadOS Navigation

Start from a tab bar. `.tabViewStyle(.sidebarAdaptable)` is a tab bar or a sidebar depending on width and the user's choice. Use `NavigationSplitView` when the app is sidebar-only or needs a content list between sidebar and detail.

The sidebar is glass and the system draws it. Extend visually rich detail content beneath it with the background extension effect. It goes on content in the detail column, not on the sidebar:

```swift
NavigationSplitView {
    List(items, selection: $selection) { item in
        NavigationLink(item.name, value: item)
    }
} detail: {
    ScrollView {
        HeroImage()
            .backgroundExtensionEffect()
        DetailBody()
    }
}
```

One per screen. It mirrors and blurs the view, and it clips.

Windows resize continuously on iPad. Don't assume full-screen layout. Don't rely on declared interface orientations to prevent resizing. Under the 27 SDK they don't.

## macOS Navigation

The sidebar runs edge-to-edge: top, bottom, and the side it's anchored to. It stays translucent. Don't inset it, round it, or give it a custom background.

Sidebar icons take the app accent color and follow the user's system accent color. A fixed color on an icon is fine when it carries meaning, like Mail's yellow VIP star. Use it sparingly.

The window's corner radius belongs to the system. Keep contained elements concentric with `.rect(corners: .concentric)`.

The toolbar treatment is uniform across apps. No custom toolbar background, no hand-tuned transparency.

## Inactive Windows

On macOS, and on iPadOS from 27, an inactive window dims its icons and text. System components do it automatically. Custom views match it with `appearsActive`:

```swift
struct SidebarFooter: View {
    @Environment(\.appearsActive) private var appearsActive

    var body: some View {
        AccountButton()
            .opacity(appearsActive ? 1 : Opacity.inactive)   // Opacity.inactive: project token
    }
}
```

Design both states. Inactive: no accent fills, dimmed sidebar text and icons, destructive buttons disabled. `controlActiveState` is deprecated. Use `appearsActive`.

## Toolbar

Toolbars get Liquid Glass automatically. `.confirmationAction` placement gets the prominent glass style automatically. Don't override it. One primary action, on the trailing side.

```swift
.toolbar {
    ToolbarItem(placement: .cancellationAction) {
        Button("Cancel", systemImage: "xmark") { }
    }
    ToolbarItem(placement: .confirmationAction) {
        Button("Done", systemImage: "checkmark") { }
    }
}
```

Items that sit together share one glass background. Group items that act on the same thing. Split groups with `ToolbarSpacer`. Three groups at most. Don't mix text and icon items inside one group.

When space runs out, decide what survives. Don't let the system guess (27):

```swift
.toolbar {
    ToolbarItemGroup {
        UndoButton()
        RedoButton()
    }
    .visibilityPriority(.high)

    ToolbarOverflowMenu {
        ExportButton()
        ClearAllButton()
    }

    ToolbarItem(placement: .topBarPinnedTrailing) {
        ShareButton()
    }
}
```

- `.visibilityPriority(_:)`: lower priority items move to the overflow menu first. Also on macOS.
- `ToolbarOverflowMenu`: items that always live in the overflow menu. Unavailable on macOS, where the system builds the overflow menu itself.
- `.topBarPinnedTrailing`: stays at the trailing edge of the navigation bar. Unavailable on macOS.

The navigation bar can minimize on scroll the way the tab bar does (27, not macOS):

```swift
ScrollView {
    FeedList()
}
.toolbarMinimizationBehavior(.onScrollDown, for: .navigationBar)
```

The safe area follows the bar by default. `.toolbarMinimizationSafeAreaAdjustment(.disabled, for: .navigationBar)` keeps full-bleed media from reflowing. The WWDC session calls this modifier `toolbarMinimizeBehavior`. That name didn't ship.

Legibility where content scrolls under a bar comes from the scroll edge effect. Adjust it with `scrollEdgeEffectStyle(_:for:)` (`.soft` or `.hard`). Don't add a background to the bar.

## Menus

Menu items are text first. Under 27 the menu bar on macOS and iPadOS, and context menus on macOS, hide symbol images by default, except on a few standard items like Settings, Share, and Print. Give an item an icon only when it represents an object, a location, or a main feature, and opt in explicitly:

```swift
CommandMenu("Stickers") {
    Button { openStore() } label: {
        Label("Store", systemImage: "bag.fill")
            .labelStyle(.titleAndIcon)
    }
}
```

Within one group of menu items, every item has an icon or none does. A `LabeledContent` inside a `Menu` shows its value as the item's subtitle (27).

## Floating Action

```swift
GlassEffectContainer(spacing: Spacing.s5) {
    VStack(spacing: Spacing.s4) {
        if isExpanded {
            ForEach(actions) { action in
                Button { action.perform() } label: {
                    Image(systemName: action.icon)
                        .frame(width: Size.fabAction, height: Size.fabAction)
                }
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)
                .tint(action.color)
                .accessibilityLabel(action.title)
                .glassEffectID(action.id, in: namespace)
            }
        }
        Button {
            withAnimation(Motion.Spring.expressive) { isExpanded.toggle() }
        } label: {
            Image(systemName: isExpanded ? "xmark" : "plus")
                .font(.title2.bold())
                .frame(width: Size.fabPrimary, height: Size.fabPrimary)
        }
        .buttonStyle(.glassProminent)
        .buttonBorderShape(.circle)
        .accessibilityLabel(isExpanded ? "Close" : "Add")
        .glassEffectID("toggle", in: namespace)
    }
}
```

`Size.fabAction` (48) and `Size.fabPrimary` (56) are project tokens. Icon-only glass buttons always get an explicit accessibility label.

## Sheet

Partial-height sheets are inset from the screen edges with a glass background. At full height the sheet turns more opaque. It's automatic. Don't set a custom `presentationBackground`.

```swift
.sheet(isPresented: $showSheet) {
    SheetContent()
        .presentationDetents([.medium, .large])
        .scrollContentBackground(.hidden)   // lets a List or Form show the sheet's glass
}
```

A sheet can fade in over content instead of sliding up (27, not macOS):

```swift
.sheet(isPresented: $showSheet) {
    SheetContent()
        .presentationDetents([.medium])
        .navigationTransition(.crossFade)
}
```

A `confirmationDialog` originates from the control that triggered it, not from the bottom edge. Attach the modifier to that control. `alert` and `confirmationDialog` have item-driven forms like `sheet(item:)`:

```swift
.confirmationDialog("Delete?", item: $stickerToDelete) { sticker in
    Button("Delete", role: .destructive) { delete(sticker) }
}
```

Under the 27 SDK sheets and popovers no longer inherit `controlSize`, button sizing, or button border shape from the presenter. Set them inside the sheet.

## Sheet Morphing from Toolbar

The zoom transition is unavailable on macOS.

```swift
@Namespace private var transition

Button("Info", systemImage: "info.circle") { showInfo = true }
    .matchedTransitionSource(id: "info", in: transition)

.sheet(isPresented: $showInfo) {
    InfoSheet()
        .navigationTransition(.zoom(sourceID: "info", in: transition))
}
```

## Tabs Inside a View

A segmented control that switches views isn't the same thing as one that picks a value. Under 27, say which it is:

```swift
Picker("View", selection: $pane) {
    Text("Events").tag(Pane.events)
    Text("Reminders").tag(Pane.reminders)
}
.pickerStyle(.tabs)
```

VoiceOver announces the options as tabs, and on macOS the control looks different from a value picker.

## Foldable Layout

iPhone Duo folds. Its layout APIs are 27.1, on every platform. With a 27.0 deployment target, gate them with `if #available(iOS 27.1, *)`.

```swift
struct PlayerScreen: View {
    @State private var isTabletop = false

    var body: some View {
        ArrangementView {
            PlayerControls()
        } secondary: {
            VideoSurface()
        }
        .arrangementViewStyle(.overlay)
        .onHingeChange { _, new in
            withAnimation(Motion.Spring.standard) {
                isTabletop = new.hinge?.status == .partiallyOpen
            }
        }
    }
}
```

- `ArrangementView` lays out two related panes, primary and secondary. `.overlay` layers primary over secondary on a flat display and separates them across the fold. `.split` puts them side by side, horizontal in landscape and vertical in portrait. Restrict the axes with `.split.axes(.horizontal)`. Size a split pane with `.splitArrangementLayoutRatio(_:)`.
- `GeometryProxy.reservedRegions(kind:)` returns the `ReservedRegion` values to keep content off. `.division` is the hinge. `.occlusion` is the camera. Each has a `frame` and `margins`.
- `onHingeChange` hands over the old and new `DeviceHingeContext`. `hinge` is nil on a device that doesn't fold. Otherwise it has an `angle` and a `status`: `.closed`, `.partiallyOpen`, or `.fullyOpen`.

`ArrangementView` is a top-level container. Don't put it inside a scroll view or split view, and don't put a `TabView` or `NavigationSplitView` inside it.

How a screen behaves folded and half-open is a design decision. If the design file doesn't show it, ask.
