// APIs the skills name only in prose or tables. Not sample code: each line proves a name,
// a parameter, or an opt-in requirement.
package probes

import android.app.UiModeManager
import android.os.Build
import androidx.compose.animation.core.Spring
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.text.input.TextFieldState
import androidx.compose.material3.*
import androidx.compose.material3.adaptive.ExperimentalMaterial3AdaptiveApi
import androidx.compose.material3.adaptive.layout.AnimatedPane
import androidx.compose.material3.adaptive.navigation.NavigableListDetailPaneScaffold
import androidx.compose.material3.adaptive.navigation.NavigableSupportingPaneScaffold
import androidx.compose.material3.adaptive.navigation.rememberListDetailPaneScaffoldNavigator
import androidx.compose.material3.adaptive.navigation.rememberSupportingPaneScaffoldNavigator
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteType
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ShaderBrush
import androidx.compose.ui.graphics.colorspace.ColorSpaces
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.*
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertIsToggleable
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.unit.dp
import androidx.navigationevent.NavigationEventInfo
import androidx.navigationevent.compose.NavigationBackHandler
import androidx.navigationevent.compose.rememberNavigationEventState

val haptics = listOf(
    HapticFeedbackType.LongPress, HapticFeedbackType.Confirm, HapticFeedbackType.Reject,
    HapticFeedbackType.ToggleOn, HapticFeedbackType.ToggleOff, HapticFeedbackType.SegmentTick,
    HapticFeedbackType.SegmentFrequentTick, HapticFeedbackType.GestureThresholdActivate,
    HapticFeedbackType.GestureEnd, HapticFeedbackType.TextHandleMove,
)
const val stiffnessHigh: Float = Spring.StiffnessHigh

val suiteTypes = listOf(
    NavigationSuiteType.ShortNavigationBarCompact, NavigationSuiteType.ShortNavigationBarMedium,
    NavigationSuiteType.WideNavigationRailCollapsed, NavigationSuiteType.WideNavigationRailExpanded,
)

object CurrentInfo : NavigationEventInfo()

@Composable
fun Insets() {
    Box(Modifier.safeDrawingPadding().windowInsetsPadding(WindowInsets.safeGestures).imePadding())
    Box(Modifier.minimumInteractiveComponentSize())
}

@Composable
fun LazyAnimateItem(rows: List<String>) {
    LazyColumn { items(rows, key = { it }) { Text(it, Modifier.animateItem()) } }
    LazyVerticalGrid(GridCells.Adaptive(120.dp)) {}
}

@Composable
fun BackHandlerNew(onDone: () -> Unit) {
    val state = rememberNavigationEventState(currentInfo = CurrentInfo)
    NavigationBackHandler(state = state, isBackEnabled = true, onBackCancelled = {}, onBackCompleted = onDone)
}

@Composable
fun contrast(): Float =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
        LocalContext.current.getSystemService(UiModeManager::class.java).contrast else 0f

@Composable
fun ThemeNames() {
    val t = MaterialTheme.typography
    val s = MaterialTheme.shapes
    val c = MaterialTheme.colorScheme
    listOf(t.titleLargeEmphasized, t.bodyMediumEmphasized, t.displayMediumEmphasized)
    listOf(s.largeIncreased, s.extraLargeIncreased, s.extraExtraLarge)
    listOf(c.surfaceDim, c.surfaceBright, c.surfaceContainerLowest, c.surfaceContainerHighest, c.primaryFixed, c.outlineVariant)
    expressiveLightColorScheme()
    MotionScheme.standard().defaultSpatialSpec<Float>()
    MaterialTheme(colorScheme = c, shapes = s, typography = t) {}
}

@Composable
fun M3EStable(onClick: () -> Unit) {
    ContainedLoadingIndicatorProbe()
    CircularWavyProgressIndicator(progress = { 0.5f })
    VerticalFloatingToolbar(expanded = true) {}
    MediumFlexibleTopAppBar(title = {})
    IconButton(onClick = onClick, shapes = IconButtonDefaults.shapes()) {}
    FilledIconButton(onClick = onClick, shapes = IconButtonDefaults.shapes()) {}
    FloatingActionButtonMenu(
        expanded = true,
        button = { ToggleFloatingActionButton(checked = true, onCheckedChange = {}) {} }
    ) {
        FloatingActionButtonMenuItem(onClick = onClick, text = { Text("a") }, icon = {})
    }
    SplitButtonLayout(
        leadingButton = { SplitButtonDefaults.TonalLeadingButton(onClick = onClick) {} },
        trailingButton = { SplitButtonDefaults.OutlinedTrailingButton(checked = false, onCheckedChange = {}) {} }
    )
    SplitButtonDefaults.ElevatedLeadingButton(onClick = onClick) {}
    val slider = remember { SliderState(value = 0.5f) }
    Slider(state = slider, onValueChange = {})
    FloatingToolbarDefaults.exitAlwaysScrollBehavior(exitDirection = FloatingToolbarExitDirection.Bottom)
    ShortNavigationBar { ShortNavigationBarItem(selected = true, onClick = onClick, icon = {}, label = { Text("a") }) }
    WideNavigationRail { WideNavigationRailItem(railExpanded = false, selected = true, onClick = onClick, icon = {}, label = { Text("a") }) }
    Box(Modifier.clickable(interactionSource = null, indication = ripple(bounded = false, radius = 24.dp), onClick = onClick))
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ContainedLoadingIndicatorProbe() { ContainedLoadingIndicator() }

@OptIn(ExperimentalMaterial3AdaptiveApi::class)
@Composable
fun Panes() {
    val ld = rememberListDetailPaneScaffoldNavigator<Any>()
    NavigableListDetailPaneScaffold(navigator = ld, listPane = { AnimatedPane {} }, detailPane = { AnimatedPane {} })
    val sp = rememberSupportingPaneScaffoldNavigator<Any>()
    NavigableSupportingPaneScaffold(navigator = sp, mainPane = { AnimatedPane {} }, supportingPane = { AnimatedPane {} })
}

fun textStyles(state: TextFieldState) {
    state.edit {
        getSpanStyles(TextRange(0, length))
        getParagraphStyles(TextRange(0, length))
    }
}

fun misc(node: SemanticsNodeInteraction, shader: androidx.compose.ui.graphics.Shader) {
    node.assertIsToggleable().assertHasClickAction()
    ShaderBrush(shader)
    Color(1f, 0f, 0f, colorSpace = ColorSpaces.DisplayP3)
    Modifier.selectable(selected = true, onClick = {})
    Modifier.semantics { heading(); stateDescription = "x"; liveRegion = LiveRegionMode.Polite; contentDescription = "y" }
}
