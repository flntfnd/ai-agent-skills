"""The wrapper table: which sample gets which scaffolding.

A sample is one ```kotlin fence. Its key is <skill>__<file>__<n>, n being the fence's position in
that file, counted from 0. Insert or remove a fence and the keys after it shift: update this table.
gen.py fails if a fence has no row here, or a row has no fence.

Row fields, all optional:
  mode      'body' (default): the fence is statements, wrapped in a @Composable function.
            'top': the fence is top-level declarations, emitted as is.
            'split': top-level up to the line starting with `split`, statements after it.
  params    parameters of the wrapping function. Style-local values arrive here, typed.
  pre       statements placed before the fence inside the wrapper.
  top       top-level stubs for this sample only (a stub screen, a local token object).
  imports   explicit imports on top of the default star imports in gen.py.
  tokens    shared token packages this sample imports (see TOKENS).
  wrap_from (marker, open, close): wraps the fence from `marker` to its end in open/close.
"""
F0='() -> Unit'
# Fences that aren't compiled, and why.
SKIP={
 'android_platform__theme_and_color__0':'Gradle build script, not library source. project/lib/build.gradle.kts carries the same lines.',
 'android_platform__theme_and_color__1':'Gradle build script, not library source. The material3 pin is in project/gradle/libs.versions.toml.',
}
# Fences that define shared tokens. Compiled once in these packages, straight from the skill that
# owns them, and imported by the samples that ask for them. A sample using a token name its owner
# doesn't define fails.
TOKENS={
 'motion_design__cross_platform_tokens__0':'tokens.motion',
 'android_platform__components_and_navigation__0':'tokens.spacing',
 'android_platform__typography_shape_motion__1':'tokens.type',
 'android_platform__typography_shape_motion__0':'tokens.type',
 'android_platform__theme_and_color__2':'tokens.theme',
}
SPEC={
 # ---- android-platform
 'android_platform__components_and_navigation__0':{'mode':'top'},
 'android_platform__components_and_navigation__1':{'params':'uploadFraction: Float'},
 'android_platform__components_and_navigation__2':{'params':f'onUndo: {F0}, onRedo: {F0}, pinned: Boolean, onPinnedChange: (Boolean) -> Unit'},
 'android_platform__components_and_navigation__3':{'params':'options: List<String>, selectedIndex: Int, onSelect: (Int) -> Unit'},
 'android_platform__components_and_navigation__4':{'params':f'onSave: {F0}'},
 'android_platform__components_and_navigation__5':{'params':f'expanded: Boolean, onCompose: {F0}, onBold: {F0}, onItalic: {F0}'},
 'android_platform__components_and_navigation__6':{'params':f'onAdd: {F0}, fabVisible: Boolean'},
 'android_platform__components_and_navigation__7':{},
 'android_platform__components_and_navigation__8':{'imports':['androidx.window.core.layout.WindowSizeClass']},
 'android_platform__components_and_navigation__9':{'mode':'top','top':'@Composable fun HomeScreen() {}\n@Composable fun LibraryScreen() {}\n@Composable fun ProfileScreen() {}'},
 'android_platform__components_and_navigation__10':{'mode':'top',
   'imports':['kotlinx.serialization.Serializable','androidx.navigation3.runtime.*','androidx.navigation3.ui.*','androidx.compose.material3.adaptive.navigation3.*'],
   'top':'@Composable fun InboxScreen(onOpen: (String) -> Unit) {}\n@Composable fun ThreadScreen(threadId: String) {}\n@Composable fun EmptyThreadPlaceholder() {}'},
 'android_platform__components_and_navigation__11':{'params':f'selectionMode: Boolean, exitSelectionMode: {F0}, panelOpen: Boolean, closePanel: {F0}',
   'pre':'var panelScale by remember { mutableFloatStateOf(1f) }',
   'top':'object PanelTokens { const val maxShrink = 0.1f }',
   'imports':['androidx.activity.compose.BackHandler','androidx.activity.compose.PredictiveBackHandler','androidx.activity.BackEventCompat','kotlinx.coroutines.flow.Flow','kotlin.coroutines.cancellation.CancellationException']},
 'android_platform__custom_rendering__0':{'mode':'top','top':'object WaveformTokens { val height = 80.dp; val strokeWidth = 2.dp; const val amplitude = 0.9f }'},
 'android_platform__custom_rendering__1':{'mode':'top'},
 'android_platform__custom_rendering__2':{'mode':'split','split':'// Call site gates','params':'aberration: Float','top':'@Composable fun Artwork() {}',
   'imports':['android.graphics.RuntimeShader','android.graphics.RenderEffect']},
 'android_platform__custom_rendering__3':{'params':'radiusPx: Float','top':'object BlurTokens { val backdrop = 16.dp }',
   'imports':['android.graphics.ColorMatrix','android.graphics.ColorMatrixColorFilter','android.graphics.Shader']},
 'android_platform__custom_rendering__4':{'params':'articleBody: String, termsUrl: String',
   'wrap_from':('// Paragraph-level styling','val rest = buildAnnotatedString {','}')},
 'android_platform__custom_rendering__5':{},
 'android_platform__interaction_and_accessibility__0':{'params':f'onOpen: {F0}'},
 'android_platform__interaction_and_accessibility__1':{},
 'android_platform__interaction_and_accessibility__2':{'params':f'checked: Boolean, onCheckedChange: (Boolean) -> Unit, onOpen: {F0}','imports':['androidx.compose.foundation.selection.toggleable']},
 'android_platform__theme_and_color__2':{'mode':'top','tokens':['tokens.type']},
 'android_platform__theme_and_color__3':{'imports':['android.app.UiModeManager']},
 'android_platform__theme_and_color__4':{'mode':'top'},
 'android_platform__typography_shape_motion__0':{'mode':'top'},
 'android_platform__typography_shape_motion__1':{'mode':'top'},
 'android_platform__typography_shape_motion__2':{},
 'android_platform__typography_shape_motion__3':{'params':f'onSave: {F0}'},
 'android_platform__typography_shape_motion__4':{'mode':'top','imports':['androidx.graphics.shapes.*']},
 'android_platform__typography_shape_motion__5':{'params':'expanded: Boolean','tokens':['tokens.spacing']},
 # ---- motion-design
 'motion_design__cross_platform_tokens__0':{'mode':'top'},
 'motion_design__cross_platform_tokens__1':{'params':'target: Float','tokens':['tokens.motion']},
 'motion_design__android_compose__0':{'tokens':['tokens.motion']},
 'motion_design__android_compose__1':{'top':'@Composable fun App() {}'},
 'motion_design__android_compose__2':{'params':'isPressed: Boolean, isExpanded: Boolean, target: Float','tokens':['tokens.motion']},
 'motion_design__android_compose__3':{'params':'painter: Painter, thumbnailSize: Dp','pre':'var showDetail by remember { mutableStateOf(false) }'},
 'motion_design__android_compose__4':{'params':'velocity: Float','pre':'val scope = rememberCoroutineScope()'},
 'motion_design__android_compose__5':{'params':'offsetX: Float, alpha: Float'},
 'motion_design__android_compose__6':{'top':'@Composable fun AmbientBackground() {}\n@Composable fun StaticBackground() {}','imports':['android.animation.ValueAnimator']},
 # ---- color-system
 'color_system__implementation__0':{'mode':'top'},
 # ---- visual-styles (style-local tokens arrive as typed parameters)
 'visual_styles__bento_grid__0':{'params':'columns: Int, gridGap: Dp','top':'@Composable fun BentoTile(featured: Boolean = false) {}'},
 'visual_styles__brutalism_pure__0':{'params':f'interaction: MutableInteractionSource, label: String, ruleWidth: Dp, padding: Dp, onClick: {F0}'},
 'visual_styles__calm_anti_distraction__0':{'params':'chromeVisible: Boolean, article: String','top':'@Composable fun TopBar() {}','tokens':['tokens.motion']},
 'visual_styles__claymorphism__0':{'params':f'interaction: MutableInteractionSource, shape: Shape, fill: Color, onClick: {F0}','tokens':['tokens.motion'],
   'imports':['androidx.compose.ui.graphics.shadow.Shadow']},
 'visual_styles__editorial_structural__0':{'params':'label: String, headline: String, amount: String'},
 'visual_styles__futuristic_scifi__0':{'params':'value: String, shape: Shape, glowSm: Dp, glowMd: Dp, glowLg: Dp','imports':['androidx.compose.ui.graphics.shadow.Shadow']},
 'visual_styles__glassmorphism__0':{'params':'overlayVisible: Boolean, glassBlur: Dp, glassFillAlpha: Float, shape: Shape',
   'top':'@Composable fun Background(modifier: Modifier) {}\n@Composable fun Panel(modifier: Modifier) {}'},
 'visual_styles__kinetic_typography__0':{'params':'visible: Boolean, headline: String','tokens':['tokens.motion']},
 'visual_styles__neo_brutalism__0':{'params':f'hardOffset: Dp, borderWidth: Dp, onClick: {F0}','tokens':['tokens.motion'],'imports':['androidx.compose.ui.graphics.shadow.Shadow']},
 'visual_styles__neo_minimalism__0':{'params':'title: String'},
 'visual_styles__neumorphism__0':{'params':'interaction: MutableInteractionSource, shape: Shape, toneLight: Color, toneDark: Color','imports':['androidx.compose.ui.graphics.shadow.Shadow']},
 'visual_styles__organic_biomorphic__0':{'params':'blobRounding: List<CornerRounding>, gradientForest: List<Color>, blobInset: Dp','imports':['androidx.graphics.shapes.RoundedPolygon','androidx.graphics.shapes.CornerRounding','androidx.graphics.shapes.toPath']},
 'visual_styles__retro_computing__0':{'params':'scanlinePeriod: Dp, scanlineColor: Color'},
 'visual_styles__texture_tactile__0':{'params':'grainMedium: Float'},
}
