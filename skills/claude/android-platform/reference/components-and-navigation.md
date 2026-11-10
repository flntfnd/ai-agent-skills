# Components & Navigation

Versions and M3E API status are in the Version Snapshot in SKILL.md. Everything under M3E Components needs `material3` 1.5.0.

## Contents
- [Spacing](#spacing)
- [M3E Components](#m3e-components)
- [Edge-to-Edge and Insets](#edge-to-edge-and-insets)
- [Adaptive Layout](#adaptive-layout)
- [Navigation 3](#navigation-3)
- [Predictive Back](#predictive-back)

## Spacing

```kotlin
object Spacing {
    val none = 0.dp
    val s1 = 2.dp
    val s2 = 4.dp
    val s3 = 8.dp
    val s4 = 12.dp
    val s5 = 16.dp
    val s6 = 20.dp
    val s7 = 24.dp
    val s8 = 32.dp
    val s9 = 40.dp
    val s10 = 48.dp
    val s11 = 64.dp
    val s12 = 80.dp
}
```

This scale is my default. A design file's spacing variables replace it. Material's own spacing system is an 8dp scale (`space100` = 8dp), with smaller steps inside components.

| Window width | Margins | Spacer between panes |
| --- | --- | --- |
| Compact | 16dp | n/a (one pane) |
| Medium and up | 24dp | 24dp |

## M3E Components

Samples use literal strings to stay short. Production text comes from string resources. `Icons.Filled.*` beyond the core set comes from `material-icons-extended`, which is frozen at 1.7.x. For anything else, export Material Symbols as vector drawables.

### Loading and Progress

| Expected wait | Show |
| --- | --- |
| Under 200ms | Nothing. Display the content |
| 200ms to 5s, indeterminate | `LoadingIndicator` |
| Over 5s, or measurable | Progress indicator, linear or circular, optionally wavy |

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
LoadingIndicator()               // 48dp; ContainedLoadingIndicator() on busy content

LinearWavyProgressIndicator(progress = { uploadFraction })   // stable
```

Use the same indicator configuration for every instance of the same process.

### Button Groups

A **standard button group** is a row of related buttons that react to each other. The pressed button changes shape and width and its neighbors give way. It stays on one line and overflows trailing items into a menu. Declare items through the scope, not as child composables.

```kotlin
ButtonGroup(
    overflowIndicator = { menuState -> ButtonGroupDefaults.OverflowIndicator(menuState) }
) {
    clickableItem(onClick = onUndo, label = "Undo")
    clickableItem(onClick = onRedo, label = "Redo")
    toggleableItem(checked = pinned, label = "Pin", onCheckedChange = onPinnedChange)
}
```

`customItem` takes an arbitrary composable. Give it `Modifier.animateWidth(interactionSource)` from the scope so it joins the press animation.

A **connected button group** replaces the segmented button for single-select and multi-select choices, view switching, and sorting. It's a row of toggle buttons with shared inner corners. Don't mix color styles inside one.

```kotlin
Row(horizontalArrangement = Arrangement.spacedBy(ButtonGroupDefaults.ConnectedSpaceBetween)) {
    options.forEachIndexed { index, option ->
        ToggleButton(
            checked = index == selectedIndex,
            onCheckedChange = { onSelect(index) },
            shapes = when (index) {
                0 -> ButtonGroupDefaults.connectedLeadingButtonShapes()
                options.lastIndex -> ButtonGroupDefaults.connectedTrailingButtonShapes()
                else -> ButtonGroupDefaults.connectedMiddleButtonShapes()
            },
            modifier = Modifier.weight(1f).semantics { role = Role.RadioButton }
        ) {
            Text(option)
        }
    }
}
```

### Split Button

An action plus a menu of related actions. The composable is `SplitButtonLayout`. The halves come from `SplitButtonDefaults` (filled, `Tonal*`, `Elevated*`, `Outlined*`).

```kotlin
var menuOpen by rememberSaveable { mutableStateOf(false) }

SplitButtonLayout(
    leadingButton = {
        SplitButtonDefaults.LeadingButton(onClick = onSave) { Text("Save") }
    },
    trailingButton = {
        SplitButtonDefaults.TrailingButton(
            checked = menuOpen,
            onCheckedChange = { menuOpen = it },
            modifier = Modifier.semantics {
                stateDescription = if (menuOpen) "Expanded" else "Collapsed"
                contentDescription = "More save options"
            }
        ) {
            Icon(Icons.Filled.KeyboardArrowDown, contentDescription = null)
        }
    }
)
// Anchor a DropdownMenu to the trailing button and drive it with menuOpen.
```

### Toolbars

Two variants: docked (replaces the bottom app bar) and floating. A toolbar holds page actions. The app bar holds the title and navigation. A toolbar and a navigation bar both sit at the bottom, so never show them together: navigation bar on primary pages, toolbar on the pages below them. Emphasize one action at a time. Pair a floating toolbar with a FAB for the single highest-priority action, and use the vibrant colors when the toolbar itself needs emphasis.

```kotlin
HorizontalFloatingToolbar(
    expanded = expanded,
    floatingActionButton = {
        FloatingToolbarDefaults.VibrantFloatingActionButton(onClick = onCompose) {
            Icon(Icons.Filled.Add, contentDescription = "New note")
        }
    },
    colors = FloatingToolbarDefaults.vibrantFloatingToolbarColors()
) {
    IconButton(onClick = onBold) { Icon(Icons.Filled.FormatBold, contentDescription = "Bold") }
    IconButton(onClick = onItalic) { Icon(Icons.Filled.FormatItalic, contentDescription = "Italic") }
}
```

`VerticalFloatingToolbar` is the side-anchored form. Keep at least 16dp padding at each end. To hide on scroll, pass `scrollBehavior = FloatingToolbarDefaults.exitAlwaysScrollBehavior(...)`.

### FAB and FAB Menu

One FAB per screen, for its most common or important action. Sizes are FAB, medium, and large. The small FAB is no longer recommended. It stays put over scrolling content. If it hides on scroll, animate it.

```kotlin
FloatingActionButton(
    onClick = onAdd,
    modifier = Modifier.animateFloatingActionButton(
        visible = fabVisible,
        alignment = Alignment.BottomEnd
    )
) {
    Icon(Icons.Filled.Add, contentDescription = "Add item")
}
```

For 2-6 related actions, use `FloatingActionButtonMenu` with a `ToggleFloatingActionButton` and `FloatingActionButtonMenuItem` children. It replaces the speed dial and stacked small FABs. Don't use it with an extended FAB.

### Top App Bars

Variants: search, small (64dp), medium flexible (112dp), large flexible (120dp). The flexible bars replace `MediumTopAppBar` / `LargeTopAppBar`, add a subtitle slot (136dp / 152dp with one), and support multi-line titles. The bar describes the page and holds one or two essential actions. More actions go in a toolbar. On scroll it takes a fill color to separate from content.

```kotlin
val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

Scaffold(
    modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
    topBar = {
        LargeFlexibleTopAppBar(
            title = { Text("Library") },
            subtitle = { Text("128 items") },
            scrollBehavior = scrollBehavior
        )
    }
) { innerPadding ->
    LazyColumn(contentPadding = innerPadding) { /* items */ }
}
```

## Edge-to-Edge and Insets

- `Scaffold` slots consume the right insets and pass the rest to content as `innerPadding`.
- Scrolling content takes `innerPadding` as `contentPadding`, not `Modifier.padding`. The list then scrolls behind the bars while its first and last items rest clear of them. Padding the list clips it at the bar edge and defeats edge-to-edge.
- Without a `Scaffold`: `Modifier.safeDrawingPadding()` for content that has to clear bars and cutouts, `Modifier.windowInsetsPadding(WindowInsets.safeGestures)` for controls that would fight system gestures, `Modifier.imePadding()` above the keyboard.
- Backgrounds go edge-to-edge, content doesn't. Apply the background, then the inset padding.
- Gesture navigation is fully transparent. Three-button navigation gets a translucent system scrim by default.

## Adaptive Layout

Decide layout from the window, never from device type or orientation. The same app runs in split-screen, in a freeform desktop window, and across a fold.

| Width class | Range | Panes | Navigation |
| --- | --- | --- | --- |
| Compact | under 600dp | 1 | Navigation bar (vertical items), or modal expanded rail |
| Medium | 600-839dp | 1 recommended, or 2 | Rail with one pane; navigation bar (horizontal items) with two |
| Expanded | 840-1199dp | 2 recommended | Rail, collapsed or expanded |
| Large | 1200-1599dp | 2 recommended | Rail, collapsed or expanded |
| Extra-large | 1600dp and up | up to 3 | Rail, collapsed or expanded |

```kotlin
val windowSizeClass = currentWindowAdaptiveInfo().windowSizeClass
val twoPane = windowSizeClass.isWidthAtLeastBreakpoint(WindowSizeClass.WIDTH_DP_EXPANDED_LOWER_BOUND)
```

`WindowSizeClass` is `androidx.window.core.layout.WindowSizeClass`. Compare against lower bounds so new breakpoints never break a `when`. Pass `supportLargeAndXLargeWidth = true` to get the two largest classes.

### Navigation that adapts

Bar: 3-5 destinations of equal importance, always labeled, fixed positions, same on every top-level screen. Rail: 3-7 destinations plus an optional FAB, always on the same edge. It can hide on secondary destinations that have a back button. The navigation drawer is no longer recommended. The expanded rail covers its role.

`NavigationSuiteScaffold` switches between them from the window. The `navigationItems` overload picks the M3E types by default: `ShortNavigationBarCompact` on compact width, `ShortNavigationBarMedium` on compact height or tabletop posture, `WideNavigationRailCollapsed` otherwise.

```kotlin
enum class TopLevel(@StringRes val label: Int, val icon: ImageVector) {
    Home(R.string.home, Icons.Filled.Home),
    Library(R.string.library, Icons.Filled.Bookmarks),
    Profile(R.string.profile, Icons.Filled.Person)
}

@Composable
fun AppShell() {
    var current by rememberSaveable { mutableStateOf(TopLevel.Home) }

    NavigationSuiteScaffold(
        navigationItems = {
            TopLevel.entries.forEach { destination ->
                NavigationSuiteItem(
                    selected = destination == current,
                    onClick = { current = destination },
                    icon = { Icon(destination.icon, contentDescription = null) },
                    label = { Text(stringResource(destination.label)) }
                )
            }
        },
        primaryActionContent = { /* FAB, shown in the rail on wide windows */ }
    ) {
        when (current) {
            TopLevel.Home -> HomeScreen()
            TopLevel.Library -> LibraryScreen()
            TopLevel.Profile -> ProfileScreen()
        }
    }
}
```

Pass `navigationSuiteType = NavigationSuiteType.WideNavigationRailExpanded` to open the rail by default on large windows. The older `navigationSuiteItems = { item(...) }` overload produces the baseline bar and rail. A custom bar or rail keeps the same window-driven switching.

### Content that adapts

From expanded width up, a single stretched column is wrong. Use the canonical layouts.

- **List-detail** (mail, files, settings): `NavigableListDetailPaneScaffold`, or the Navigation 3 scene strategy below.
- **Supporting pane** (document plus comments, player plus queue): `NavigableSupportingPaneScaffold`.
- **Feed** (galleries, dashboards): `LazyVerticalGrid` with `GridCells.Adaptive(minSize)`.

## Navigation 3

The navigation library built for Compose, and my default for new work. Navigation 2 (`NavHost`) is still maintained. Don't rewrite a working app without a reason.

You own the back stack. It's a snapshot-state list of keys. Navigating adds a key, back removes one, `NavDisplay` renders the list.

```kotlin
@Serializable data object Inbox : NavKey
@Serializable data class Thread(val id: String) : NavKey

@OptIn(ExperimentalMaterial3AdaptiveApi::class)
@Composable
fun MailNav() {
    val backStack = rememberNavBackStack(Inbox)
    val listDetail = rememberListDetailSceneStrategy<NavKey>()

    NavDisplay(
        backStack = backStack,
        onBack = { backStack.removeLastOrNull() },
        sceneStrategies = listOf(listDetail),      // omit for single-pane navigation
        entryProvider = entryProvider {
            entry<Inbox>(
                metadata = ListDetailSceneStrategy.listPane(
                    detailPlaceholder = { EmptyThreadPlaceholder() }
                )
            ) {
                InboxScreen(onOpen = { id -> backStack.add(Thread(id)) })
            }
            entry<Thread>(metadata = ListDetailSceneStrategy.detailPane()) { key ->
                ThreadScreen(threadId = key.id)
            }
        }
    )
}
```

- Keys implement `NavKey` and are `@Serializable`, so `rememberNavBackStack` survives configuration change and process death.
- Artifacts: `androidx.navigation3:navigation3-runtime` and `navigation3-ui`. The scene strategy is in `androidx.compose.material3.adaptive:adaptive-navigation3`. Entry-scoped ViewModels are in `androidx.lifecycle:lifecycle-viewmodel-navigation3`.
- `sceneStrategies` is a list. Chaining strategies with `then` is deprecated.
- Transitions (`transitionSpec`, `popTransitionSpec`, `predictivePopTransitionSpec`) take motion scheme specs, not ad hoc tweens.
- Each top-level destination keeps its own back stack. Switching destinations swaps stacks. It doesn't push.

## Predictive Back

The user sees the destination behind the current screen while swiping, and can cancel. Legacy back callbacks aren't delivered on current targets, so custom back behavior has to use these APIs.

Already handled: `NavDisplay`, `NavHost` (Navigation Compose 2.8+), `ModalBottomSheet`, `SearchBar`, modal and dismissible drawers, and the system's back-to-home and cross-activity animations.

```kotlin
// Intercept only while there is something to dismiss
BackHandler(enabled = selectionMode) { exitSelectionMode() }

// Drive a custom animation from gesture progress
PredictiveBackHandler(enabled = panelOpen) { progress: Flow<BackEventCompat> ->
    try {
        progress.collect { event -> panelScale = 1f - event.progress * PanelTokens.maxShrink }
        closePanel()                 // committed
    } catch (e: CancellationException) {
        panelScale = 1f              // cancelled
        throw e
    }
}
```

`NavigationBackHandler` (`androidx.navigationevent:navigationevent-compose`) is the newer equivalent, on the dispatcher Navigation 3 uses. Use it when a component shares navigation state with a `NavDisplay`.

- Keep handlers composed unconditionally and toggle `enabled`. Adding and removing them changes dispatch order.
- An enabled handler suppresses the system animation at that level. Never intercept back at the app root to confirm exit.
- `android:enableOnBackInvokedCallback="false"` is a migration opt-out, not a setting for new apps.
