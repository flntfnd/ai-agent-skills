import SwiftUI

// Scaffolding for the sample check. Nothing here is a library token.
// Motion, Spacing, Radius, Typography, GlassTokens, GlassLevel, and Color.Semantic are read
// from the skills on every run (see OWNERS in extract.py). Don't redefine them here.

// ---- Tokens the samples name but no skill defines in Swift ----
// apple-platform calls these "project tokens".
enum Size {
    static let fabAction: CGFloat = 48
    static let fabPrimary: CGFloat = 56
}
enum Opacity {
    static let inactive: Double = 0.5
}

// ---- Style-local tokens: declared in one visual-styles file's Token Modifications ----
extension Size {
    static let borderWidth: CGFloat = 2        // neo-brutalism
    static let hardShadowOffset: CGFloat = 4   // neo-brutalism
    static let rule: CGFloat = 1               // brutalism-pure
    static let measure: CGFloat = 600          // calm-anti-distraction
}
extension Color.Semantic.Background {
    static let toneLight = Color.white         // neumorphism
    static let toneDark = Color.black          // neumorphism
}
enum Effect {
    enum Blur { static let md: CGFloat = 16 }  // glassmorphism
    enum Glow { static let sm: CGFloat = 8 }   // futuristic-scifi
    enum Scanline {                            // retro-computing
        static let period: CGFloat = 4
        static let thickness: CGFloat = 2
        static let color = Color.black.opacity(0.08)
    }
}
extension Typography {
    enum Tracking { static let label: CGFloat = 1 }    // editorial-structural
    enum Leading { static let reading: CGFloat = 8 }   // calm-anti-distraction
}

// ---- Views and models the samples refer to but don't define ----
struct Placeholder: View {
    init() {}
    init<T>(_ value: T) {}
    var body: some View { Color.clear }
}
typealias FeedView = Placeholder
typealias LibraryView = Placeholder
typealias CartView = Placeholder
typealias SearchView = Placeholder
typealias HeroImage = Placeholder
typealias DetailBody = Placeholder
typealias AccountButton = Placeholder
typealias UndoButton = Placeholder
typealias RedoButton = Placeholder
typealias ExportButton = Placeholder
typealias ClearAllButton = Placeholder
typealias ShareButton = Placeholder
typealias FeedList = Placeholder
typealias SheetContent = Placeholder
typealias InfoSheet = Placeholder
typealias PlayerControls = Placeholder
typealias VideoSurface = Placeholder
typealias CardView = Placeholder
typealias LoadingDot = Placeholder
typealias Thumbnail = Placeholder
typealias Detail = Placeholder
typealias DetailView = Placeholder
typealias DetailSheet = Placeholder
typealias LandmarkRow = Placeholder

struct Item: Identifiable, Hashable {
    let id = UUID()
    var name = ""
    var symbol = "star"
    var group = "a"
    var icon = "star"
    var title = ""
    var color = Color.blue
    func perform() {}
}
struct Landmark: Identifiable, Hashable { let id = UUID() }
struct ShaderUniforms { var time: Float = 0 }
struct AudioEngine { var currentSamples: [Float] = [] }
enum Pane { case events, reminders }
enum Phase { case idle, failed }
struct BentoTile: View { let title: String; var body: some View { Text(title) } }
struct BentoDetail: View { let id: String; var body: some View { Text(id) } }

// ---- State the fragments assume ----
// extract.py pastes each line a sample uses into that sample's wrapper struct.
// One declaration per line.
#if SAMPLE_MEMBERS
    @State var isExpanded = false
    @State var isActive = false
    @State var isPresented = false
    @State var isFloating = false
    @State var isMuted = false
    @State var isConnecting = false
    @State var isSyncing = false
    @State var showSheet = false
    @State var showInfo = false
    @State var showDetail = false
    @State var offset = CGSize.zero
    @State var selection: Item?
    @State var selectedItem: Item?
    @State var stickerToDelete: Item?
    @State var pane = Pane.events
    @State var phase = Phase.idle
    @State var landmarks: [Landmark] = []
    @State var count = 0
    @State var total = 0
    @State var downloadCount = 0
    @State var notificationCount = 0
    @State var selectedTab = 0
    @State var dropCount = 0
    @State var saveCount = 0
    @Namespace var namespace
    let items: [Item] = []
    let tools: [Item] = []
    let actions: [Item] = []
    let item = Item()
    let audioEngine = AudioEngine()
    let card = Placeholder()
    let time: Float = 0
    let intensity: Float = 0
    let amplitude: Float = 0
    let currentPhase: CGFloat = 0
    func openStore() {}
    func focusField() {}
    func delete(_ item: Item) {}
#endif
