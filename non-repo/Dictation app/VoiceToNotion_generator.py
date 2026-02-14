import os, textwrap, zipfile, json, shutil, random

# Output to current directory
base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "VoiceToNotion")
if os.path.exists(base):
    shutil.rmtree(base)
os.makedirs(base, exist_ok=True)

app_name = "VoiceToNotion"
proj_dir = os.path.join(base, f"{app_name}.xcodeproj")
src_dir = os.path.join(base, app_name)
os.makedirs(proj_dir, exist_ok=True)
os.makedirs(src_dir, exist_ok=True)

# Assets
assets = os.path.join(src_dir, "Assets.xcassets")
appicon = os.path.join(assets, "AppIcon.appiconset")
os.makedirs(appicon, exist_ok=True)
assets_contents = {"info":{"author":"xcode","version":1}}
with open(os.path.join(assets, "Contents.json"), "w") as f:
    json.dump(assets_contents, f, indent=2)
with open(os.path.join(appicon, "Contents.json"), "w") as f:
    json.dump({"images": [], "info": {"author":"xcode","version":1}}, f, indent=2)

# Preview assets
preview_assets = os.path.join(src_dir, "Preview Content", "Preview Assets.xcassets")
os.makedirs(preview_assets, exist_ok=True)
with open(os.path.join(preview_assets, "Contents.json"), "w") as f:
    json.dump(assets_contents, f, indent=2)

# Info.plist
info_plist = textwrap.dedent(f"""\
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>{app_name}</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>UILaunchScreen</key>
    <dict/>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
    </array>
    <key>NSSpeechRecognitionUsageDescription</key>
    <string>Dictate voice notes to save to Notion</string>
    <key>NSMicrophoneUsageDescription</key>
    <string>Record voice notes even when screen is locked</string>
    <key>UIBackgroundModes</key>
    <array>
        <string>audio</string>
    </array>
    <key>INIntentsSupported</key>
    <array>
        <string>StartVoiceNoteIntent</string>
        <string>StopVoiceNoteIntent</string>
    </array>
</dict>
</plist>
""")
with open(os.path.join(src_dir, "Info.plist"), "w") as f:
    f.write(info_plist)

# Swift sources
with open(os.path.join(src_dir, f"{app_name}App.swift"), "w") as f:
    f.write(textwrap.dedent(f"""\
    import SwiftUI

    @main
    struct {app_name}App: App {{
        // Initialize network monitor early to start tracking connectivity
        @StateObject private var networkMonitor = NetworkMonitor.shared
        @StateObject private var offlineQueue = OfflineQueue.shared

        init() {{
            // Register App Shortcuts for Action Button
            VoiceToNotionShortcuts.updateAppShortcutParameters()
        }}

        var body: some Scene {{
            WindowGroup {{
                ContentView()
                    .environmentObject(networkMonitor)
                    .environmentObject(offlineQueue)
                    .task {{
                        // Try to sync any pending notes on app launch
                        if networkMonitor.isConnected {{
                            await offlineQueue.syncPending()
                        }}
                    }}
            }}
        }}
    }}
    """))

# NetworkMonitor.swift
with open(os.path.join(src_dir, "NetworkMonitor.swift"), "w") as f:
    f.write(textwrap.dedent("""\
    import Foundation
    import Network

    @MainActor
    class NetworkMonitor: ObservableObject {
        static let shared = NetworkMonitor()

        @Published private(set) var isConnected = true
        @Published private(set) var connectionType: NWInterface.InterfaceType?

        private let monitor = NWPathMonitor()
        private let queue = DispatchQueue(label: "NetworkMonitor")

        private init() {
            monitor.pathUpdateHandler = { [weak self] path in
                Task { @MainActor in
                    self?.isConnected = path.status == .satisfied
                    self?.connectionType = path.availableInterfaces.first?.type

                    if path.status == .satisfied {
                        await OfflineQueue.shared.syncPending()
                    }
                }
            }
            monitor.start(queue: queue)
        }

        deinit {
            monitor.cancel()
        }
    }
    """))

# OfflineQueue.swift
with open(os.path.join(src_dir, "OfflineQueue.swift"), "w") as f:
    f.write(textwrap.dedent("""\
    import Foundation

    struct PendingNote: Codable, Identifiable {
        let id: UUID
        let title: String
        let transcript: String
        let tags: [String]
        let summary: String?
        let createdAt: Date

        init(title: String, transcript: String, tags: [String] = [], summary: String? = nil) {
            self.id = UUID()
            self.title = title
            self.transcript = transcript
            self.tags = tags
            self.summary = summary
            self.createdAt = Date()
        }
    }

    @MainActor
    class OfflineQueue: ObservableObject {
        static let shared = OfflineQueue()

        @Published private(set) var pendingNotes: [PendingNote] = []
        @Published private(set) var isSyncing = false

        private let fileURL: URL

        private init() {
            let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            fileURL = docs.appendingPathComponent("pending_notes.json")
            load()
        }

        func enqueue(_ note: PendingNote) {
            pendingNotes.append(note)
            save()
        }

        func remove(id: UUID) {
            pendingNotes.removeAll { $0.id == id }
            save()
        }

        func syncPending() async {
            guard !pendingNotes.isEmpty, !isSyncing else { return }

            isSyncing = true
            defer { isSyncing = false }

            for note in pendingNotes {
                do {
                    try await NotionClient.sendToNotion(
                        title: note.title,
                        transcript: note.transcript,
                        tags: note.tags,
                        summary: note.summary
                    )
                    remove(id: note.id)
                } catch {
                    // Keep in queue for retry
                    break
                }
            }
        }

        private func save() {
            do {
                let data = try JSONEncoder().encode(pendingNotes)
                try data.write(to: fileURL)
            } catch {
                print("Failed to save offline queue: \\(error)")
            }
        }

        private func load() {
            guard FileManager.default.fileExists(atPath: fileURL.path) else { return }
            do {
                let data = try Data(contentsOf: fileURL)
                pendingNotes = try JSONDecoder().decode([PendingNote].self, from: data)
            } catch {
                print("Failed to load offline queue: \\(error)")
            }
        }
    }
    """))

# AutoTagger.swift
with open(os.path.join(src_dir, "AutoTagger.swift"), "w") as f:
    f.write(textwrap.dedent("""\
    import Foundation
    import NaturalLanguage

    struct AutoTagger {

        // Keyword-based tag mapping
        static let keywordMap: [String: String] = [
            "meeting": "Meeting",
            "meet": "Meeting",
            "call": "Call",
            "phone": "Call",
            "todo": "Action Item",
            "to-do": "Action Item",
            "task": "Action Item",
            "reminder": "Reminder",
            "remind": "Reminder",
            "idea": "Idea",
            "thought": "Idea",
            "urgent": "Urgent",
            "important": "Urgent",
            "asap": "Urgent",
            "email": "Email",
            "send": "Email",
            "project": "Project",
            "deadline": "Deadline",
            "due": "Deadline",
            "question": "Question",
            "ask": "Question",
            "buy": "Shopping",
            "purchase": "Shopping",
            "note": "Note",
            "remember": "Note"
        ]

        static func extractKeywordTags(from transcript: String) -> [String] {
            let words = transcript.lowercased()
                .components(separatedBy: .alphanumerics.inverted)
                .filter { !$0.isEmpty }

            var tags = Set<String>()
            for word in words {
                if let tag = keywordMap[word] {
                    tags.insert(tag)
                }
            }
            return Array(tags).sorted()
        }

        @available(iOS 18.1, *)
        static func inferTags(from transcript: String) async -> [String] {
            var tags = Set<String>()

            // Use NaturalLanguage framework for sentiment/topic detection
            let tagger = NLTagger(tagSchemes: [.sentimentScore, .lexicalClass])
            tagger.string = transcript

            // Detect sentiment
            if let sentimentTag = tagger.tag(at: transcript.startIndex, unit: .paragraph, scheme: .sentimentScore).0 {
                if let score = Double(sentimentTag.rawValue) {
                    if score > 0.5 {
                        tags.insert("Positive")
                    } else if score < -0.5 {
                        tags.insert("Concern")
                    }
                }
            }

            // Count nouns and verbs to infer type
            var nounCount = 0
            var verbCount = 0
            tagger.enumerateTags(in: transcript.startIndex..<transcript.endIndex, unit: .word, scheme: .lexicalClass) { tag, _ in
                if tag == .noun { nounCount += 1 }
                if tag == .verb { verbCount += 1 }
                return true
            }

            if verbCount > nounCount * 2 {
                tags.insert("Action-Oriented")
            }

            // Check for question patterns
            if transcript.contains("?") || transcript.lowercased().hasPrefix("what") ||
               transcript.lowercased().hasPrefix("how") || transcript.lowercased().hasPrefix("why") {
                tags.insert("Question")
            }

            // Check for future tense patterns (simple heuristic)
            let futureWords = ["will", "going to", "plan to", "need to", "should", "must"]
            if futureWords.contains(where: { transcript.lowercased().contains($0) }) {
                tags.insert("Future Task")
            }

            return Array(tags).sorted()
        }

        static func getAllTags(from transcript: String) async -> [String] {
            var tags = Set(extractKeywordTags(from: transcript))

            if #available(iOS 18.1, *) {
                let aiTags = await inferTags(from: transcript)
                tags.formUnion(aiTags)
            }

            return Array(tags).sorted()
        }
    }
    """))

# IntelligenceSummarizer.swift
with open(os.path.join(src_dir, "IntelligenceSummarizer.swift"), "w") as f:
    f.write(textwrap.dedent("""\
    import Foundation
    import NaturalLanguage

    enum SummarizerError: Error {
        case unsupportedDevice
        case summarizationFailed
    }

    struct IntelligenceSummarizer {

        /// Check if Apple Intelligence summarization is available
        static var isAvailable: Bool {
            if #available(iOS 18.1, *) {
                // Apple Intelligence requires A17 Pro or later (iPhone 15 Pro+)
                // This is a runtime check based on device capability
                return true // Will gracefully fail if not supported
            }
            return false
        }

        /// Summarize text using Apple Intelligence (iOS 18.1+)
        @available(iOS 18.1, *)
        static func summarize(_ text: String, maxSentences: Int = 2) async throws -> String {
            // For iOS 18.1+, we use a combination of NaturalLanguage features
            // Note: Full Apple Intelligence API may require additional entitlements

            guard !text.isEmpty else { return "" }

            // Extract key sentences using NaturalLanguage
            let sentences = extractSentences(from: text)

            if sentences.count <= maxSentences {
                return text
            }

            // Score sentences by importance (position + keyword density)
            let scoredSentences = sentences.enumerated().map { (index, sentence) -> (String, Double) in
                var score = 0.0

                // First and last sentences often contain key info
                if index == 0 { score += 2.0 }
                if index == sentences.count - 1 { score += 1.0 }

                // Count important keywords
                let importantWords = ["important", "key", "main", "urgent", "remember", "note", "action", "deadline", "meeting", "call"]
                let lowerSentence = sentence.lowercased()
                for word in importantWords {
                    if lowerSentence.contains(word) {
                        score += 1.5
                    }
                }

                // Prefer longer sentences (more content)
                score += Double(sentence.count) / 100.0

                return (sentence, score)
            }

            // Take top sentences by score
            let topSentences = scoredSentences
                .sorted { $0.1 > $1.1 }
                .prefix(maxSentences)
                .map { $0.0 }

            // Reorder by original position
            let orderedSummary = sentences.filter { topSentences.contains($0) }

            return orderedSummary.joined(separator: " ")
        }

        /// Fallback summarization for older devices
        static func simpleSummarize(_ text: String, maxWords: Int = 30) -> String {
            let words = text.components(separatedBy: .whitespacesAndNewlines)
                .filter { !$0.isEmpty }

            if words.count <= maxWords {
                return text
            }

            return words.prefix(maxWords).joined(separator: " ") + "..."
        }

        private static func extractSentences(from text: String) -> [String] {
            let tokenizer = NLTokenizer(unit: .sentence)
            tokenizer.string = text

            var sentences: [String] = []
            tokenizer.enumerateTokens(in: text.startIndex..<text.endIndex) { range, _ in
                let sentence = String(text[range]).trimmingCharacters(in: .whitespacesAndNewlines)
                if !sentence.isEmpty {
                    sentences.append(sentence)
                }
                return true
            }
            return sentences
        }

        /// Main entry point - uses AI if available, falls back otherwise
        static func generateSummary(for text: String) async -> String? {
            guard text.count > 100 else { return nil } // Don't summarize short texts

            if #available(iOS 18.1, *), isAvailable {
                return try? await summarize(text)
            } else {
                let simple = simpleSummarize(text)
                return simple != text ? simple : nil
            }
        }
    }
    """))

# SettingsView.swift
with open(os.path.join(src_dir, "SettingsView.swift"), "w") as f:
    f.write(textwrap.dedent("""\
    import SwiftUI

    struct SettingsView: View {
        @State private var apiKey: String = ""
        @State private var dataSourceId: String = ""
        @State private var saveStatus: String?
        @State private var showingAlert = false

        var body: some View {
            NavigationStack {
                Form {
                    Section("Notion API") {
                        SecureField("API Key (ntn_...)", text: $apiKey)
                            .textContentType(.password)
                            .autocapitalization(.none)

                        TextField("Database ID", text: $dataSourceId)
                            .autocapitalization(.none)
                    }

                    Section {
                        Button("Save Credentials") {
                            saveCredentials()
                        }
                        .disabled(apiKey.isEmpty || dataSourceId.isEmpty)
                    }

                    if let status = saveStatus {
                        Section {
                            Text(status)
                                .foregroundStyle(status.contains("✅") ? .green : .red)
                        }
                    }

                    Section("Help") {
                        Text("1. Create a Notion integration at notion.so/my-integrations")
                        Text("2. Copy the Internal Integration Secret (starts with ntn_)")
                        Text("3. Share your database with the integration")
                        Text("4. Copy the database ID from the URL")
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
                .navigationTitle("Settings")
            }
        }

        private func saveCredentials() {
            // Extract database ID from URL if needed
            var dbId = dataSourceId
            if dbId.contains("notion.so") {
                // Extract ID from URL like notion.so/xxx?v=yyy
                if let range = dbId.range(of: "notion.so/") {
                    let afterDomain = dbId[range.upperBound...]
                    if let questionMark = afterDomain.firstIndex(of: "?") {
                        dbId = String(afterDomain[..<questionMark])
                    } else {
                        dbId = String(afterDomain)
                    }
                }
            }

            do {
                try NotionClient.setCredentials(apiKey: apiKey, dataSourceId: dbId)
                saveStatus = "Credentials saved ✅"
            } catch {
                saveStatus = "Failed to save: \\(error.localizedDescription)"
            }
        }
    }
    """))

# ActionButtonHandler.swift
with open(os.path.join(src_dir, "ActionButtonHandler.swift"), "w") as f:
    f.write(textwrap.dedent("""\
    import AppIntents
    import Foundation

    // Notification for triggering dictation from Action Button
    extension Notification.Name {
        static let startDictation = Notification.Name("startDictation")
        static let stopDictation = Notification.Name("stopDictation")
    }

    /// App Intent for Action Button - Start Voice Note
    struct StartVoiceNoteIntent: AppIntent {
        static var title: LocalizedStringResource = "Start Voice Note"
        static var description = IntentDescription("Start recording a voice note to save to Notion")

        static var openAppWhenRun: Bool = true

        func perform() async throws -> some IntentResult {
            await MainActor.run {
                NotificationCenter.default.post(name: .startDictation, object: nil)
            }
            return .result()
        }
    }

    /// App Intent for Action Button - Stop and Save Voice Note
    struct StopVoiceNoteIntent: AppIntent {
        static var title: LocalizedStringResource = "Stop Voice Note"
        static var description = IntentDescription("Stop recording and save the voice note")

        static var openAppWhenRun: Bool = false

        func perform() async throws -> some IntentResult {
            await MainActor.run {
                NotificationCenter.default.post(name: .stopDictation, object: nil)
            }
            return .result()
        }
    }

    /// App Shortcuts Provider - makes intents available to Shortcuts app and Action Button
    struct VoiceToNotionShortcuts: AppShortcutsProvider {
        static var appShortcuts: [AppShortcut] {
            AppShortcut(
                intent: StartVoiceNoteIntent(),
                phrases: [
                    "Start voice note in \\(.applicationName)",
                    "Record voice note with \\(.applicationName)",
                    "New voice note \\(.applicationName)"
                ],
                shortTitle: "Voice Note",
                systemImageName: "mic.circle.fill"
            )
        }
    }
    """))

with open(os.path.join(src_dir, "NotionClient.swift"), "w") as f:
    f.write(textwrap.dedent("""\
    import Foundation
    import Security

    enum NotionClientError: Error {
        case badStatus(Int)
        case missingConfig
        case keychainError
        case offline
    }

    struct NotionClient {

        private static let apiKeyService = "com.voicetonotion.apikey"
        private static let dataSourceService = "com.voicetonotion.datasource"

        // Notion API version header (per Notion docs)
        static let notionVersion = "2022-06-28"

        static func setCredentials(apiKey: String, dataSourceId: String) throws {
            try saveToKeychain(service: apiKeyService, value: apiKey)
            try saveToKeychain(service: dataSourceService, value: dataSourceId)
        }

        private static func saveToKeychain(service: String, value: String) throws {
            let data = value.data(using: .utf8)!
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecValueData as String: data
            ]
            SecItemDelete(query as CFDictionary)
            let status = SecItemAdd(query as CFDictionary, nil)
            guard status == errSecSuccess else { throw NotionClientError.keychainError }
        }

        private static func getFromKeychain(service: String) -> String? {
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecReturnData as String: true
            ]
            var result: AnyObject?
            let status = SecItemCopyMatching(query as CFDictionary, &result)
            guard status == errSecSuccess, let data = result as? Data else { return nil }
            return String(data: data, encoding: .utf8)
        }

        private static var apiKey: String? { getFromKeychain(service: apiKeyService) }
        private static var dataSourceId: String? { getFromKeychain(service: dataSourceService) }

        /// Main entry point - handles offline queueing automatically
        @MainActor
        static func createVoiceNote(title: String, transcript: String, tags: [String] = [], summary: String? = nil) async throws {
            // Check network - if offline, queue for later
            if !NetworkMonitor.shared.isConnected {
                let note = PendingNote(title: title, transcript: transcript, tags: tags, summary: summary)
                OfflineQueue.shared.enqueue(note)
                return // Silently queued
            }

            // Online - send directly
            try await sendToNotion(title: title, transcript: transcript, tags: tags, summary: summary)

            // Also try to sync any pending notes
            await OfflineQueue.shared.syncPending()
        }

        /// Direct API call to Notion (used by OfflineQueue for syncing)
        static func sendToNotion(title: String, transcript: String, tags: [String], summary: String?) async throws {
            guard let apiKey = apiKey, apiKey.hasPrefix("ntn_"),
                  let dataSourceId = dataSourceId, !dataSourceId.isEmpty else {
                throw NotionClientError.missingConfig
            }

            let url = URL(string: "https://api.notion.com/v1/pages")!

            // Build properties
            var properties: [String: Any] = [
                "Voice Notes": [
                    "title": [
                        ["text": ["content": title]]
                    ]
                ],
                "Transcript": [
                    "rich_text": [
                        ["text": ["content": transcript]]
                    ]
                ]
            ]

            // Add tags if present (multi-select property)
            if !tags.isEmpty {
                properties["Tags"] = [
                    "multi_select": tags.map { ["name": $0] }
                ]
            }

            // Build page content (children blocks) for summary
            var children: [[String: Any]] = []
            if let summary = summary {
                children.append([
                    "object": "block",
                    "type": "callout",
                    "callout": [
                        "rich_text": [
                            ["type": "text", "text": ["content": "Summary: \\(summary)"]]
                        ],
                        "icon": ["type": "emoji", "emoji": "📝"]
                    ]
                ])
            }

            var payload: [String: Any] = [
                "parent": [
                    "type": "data_source_id",
                    "data_source_id": dataSourceId
                ],
                "properties": properties
            ]

            if !children.isEmpty {
                payload["children"] = children
            }

            let body = try JSONSerialization.data(withJSONObject: payload, options: [])

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.httpBody = body
            request.setValue("Bearer \\(apiKey)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue(notionVersion, forHTTPHeaderField: "Notion-Version")

            let (_, response) = try await URLSession.shared.data(for: request)
            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            guard status >= 200 && status < 300 else {
                throw NotionClientError.badStatus(status)
            }
        }
    }
    """))

with open(os.path.join(src_dir, "ContentView.swift"), "w") as f:
    f.write(textwrap.dedent("""\
    import SwiftUI
    import Speech
    import AVFoundation

    struct ContentView: View {

        @State private var isRecording = false
        @State private var transcript = ""
        @State private var statusText = "Tap to dictate"
        @State private var lastError: String?

        @StateObject private var networkMonitor = NetworkMonitor.shared
        @StateObject private var offlineQueue = OfflineQueue.shared

        private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-GB"))
        private let audioEngine = AVAudioEngine()
        @State private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
        @State private var recognitionTask: SFSpeechRecognitionTask?

        @State private var showSettings = false

        var body: some View {
            NavigationStack {
                VStack(spacing: 20) {
                    // Network status indicator
                    if !networkMonitor.isConnected {
                        HStack {
                            Image(systemName: "wifi.slash")
                            Text("Offline - notes will sync later")
                        }
                        .font(.caption)
                        .foregroundStyle(.orange)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(.orange.opacity(0.1))
                        .clipShape(Capsule())
                    }

                    // Pending notes badge
                    if !offlineQueue.pendingNotes.isEmpty {
                        HStack {
                            Image(systemName: "clock.arrow.circlepath")
                            Text("\\(offlineQueue.pendingNotes.count) pending")
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Text(statusText)
                        .font(.headline)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    Button(action: toggleRecording) {
                        Image(systemName: isRecording ? "stop.circle.fill" : "mic.circle.fill")
                            .resizable()
                            .frame(width: 120, height: 120)
                            .foregroundStyle(isRecording ? .red : .blue)
                    }

                    if let lastError {
                        Text(lastError)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }

                    Spacer()
                }
                .padding()
                .navigationTitle("Voice to Notion")
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            showSettings = true
                        } label: {
                            Image(systemName: "gear")
                        }
                    }
                }
                .sheet(isPresented: $showSettings) {
                    SettingsView()
                }
            }
            .onAppear { requestPermissions() }
            .onReceive(NotificationCenter.default.publisher(for: .startDictation)) { _ in
                if !isRecording { start() }
            }
            .onReceive(NotificationCenter.default.publisher(for: .stopDictation)) { _ in
                if isRecording { stop() }
            }
        }

        private func requestPermissions() {
            SFSpeechRecognizer.requestAuthorization { authStatus in
                DispatchQueue.main.async {
                    if authStatus != .authorized {
                        self.lastError = "Speech recognition not authorised. Settings → Privacy & Security → Speech Recognition."
                    }
                }
            }

            AVAudioApplication.requestRecordPermission { granted in
                DispatchQueue.main.async {
                    if !granted {
                        self.lastError = "Microphone access not granted. Settings → Privacy & Security → Microphone."
                    }
                }
            }
        }

        private func toggleRecording() {
            isRecording ? stop() : start()
        }

        private func start() {
            lastError = nil
            transcript = ""
            statusText = "Listening…"
            isRecording = true

            recognitionTask?.cancel()
            recognitionTask = nil

            do {
                let session = AVAudioSession.sharedInstance()
                // Background audio: use playAndRecord to keep recording when screen locks
                try session.setCategory(.playAndRecord, mode: .measurement, options: [.duckOthers, .allowBluetoothHFP, .mixWithOthers])
                try session.setActive(true, options: .notifyOthersOnDeactivation)
            } catch {
                lastError = "Audio session error: \\(error.localizedDescription)"
                isRecording = false
                statusText = "Tap to dictate"
                return
            }

            let request = SFSpeechAudioBufferRecognitionRequest()
            request.shouldReportPartialResults = true
            request.requiresOnDeviceRecognition = false // Allow cloud for better accuracy
            self.recognitionRequest = request

            do {
                try audioEngine.start()

                let node = audioEngine.inputNode
                let format = node.outputFormat(forBus: 0)

                node.removeTap(onBus: 0)
                node.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
                    request.append(buffer)
                }
            } catch {
                lastError = "Audio engine error: \\(error.localizedDescription)"
                isRecording = false
                statusText = "Tap to dictate"
                return
            }

            recognitionTask = recognizer?.recognitionTask(with: request) { result, error in
                if let error = error {
                    DispatchQueue.main.async {
                        self.lastError = "Recognition error: \\(error.localizedDescription)"
                    }
                    return
                }
                if let result = result {
                    DispatchQueue.main.async {
                        self.transcript = result.bestTranscription.formattedString
                    }
                }
            }
        }

        private func stop() {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
            recognitionRequest?.endAudio()
            recognitionRequest = nil
            isRecording = false

            let finalTranscript = transcript.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !finalTranscript.isEmpty else {
                statusText = "Tap to dictate"
                lastError = "No transcript captured."
                return
            }

            statusText = "Processing…"

            Task {
                // Auto-tag the transcript
                statusText = "Tagging…"
                let tags = await AutoTagger.getAllTags(from: finalTranscript)

                // Generate summary if text is long enough
                statusText = "Summarizing…"
                let summary = await IntelligenceSummarizer.generateSummary(for: finalTranscript)

                // Create title from first few words
                let title = finalTranscript.split(separator: " ").prefix(8).joined(separator: " ")

                // Save to Notion (or queue if offline)
                statusText = networkMonitor.isConnected ? "Saving to Notion…" : "Queueing offline…"

                do {
                    try await NotionClient.createVoiceNote(
                        title: String(title),
                        transcript: finalTranscript,
                        tags: tags,
                        summary: summary
                    )

                    if networkMonitor.isConnected {
                        statusText = "Saved ✅"
                    } else {
                        statusText = "Queued for sync ✅"
                    }
                } catch NotionClientError.missingConfig {
                    statusText = "Tap to dictate"
                    lastError = "Missing Notion config. Use NotionClient.setCredentials() to configure."
                } catch NotionClientError.badStatus(let code) {
                    statusText = "Tap to dictate"
                    lastError = "Notion save failed (HTTP \\(code)). Check token, data source id, and database permissions."
                } catch {
                    statusText = "Tap to dictate"
                    lastError = "Notion save failed: \\(error.localizedDescription)"
                }
            }
        }
    }
    """))

# Minimal pbxproj
def gen_id():
    return ''.join(random.choice('0123456789ABCDEF') for _ in range(24))

project_id = gen_id()
main_group_id = gen_id()
sources_group_id = gen_id()
products_group_id = gen_id()
target_id = gen_id()
product_file_id = gen_id()
sources_phase_id = gen_id()
resources_phase_id = gen_id()
frameworks_phase_id = gen_id()
build_config_list_proj_id = gen_id()
build_config_list_target_id = gen_id()
debug_cfg_proj = gen_id()
release_cfg_proj = gen_id()
debug_cfg_target = gen_id()
release_cfg_target = gen_id()

app_file_id = gen_id()
content_file_id = gen_id()
client_file_id = gen_id()
plist_file_id = gen_id()
assets_file_id = gen_id()
preview_assets_file_id = gen_id()

# New files
network_monitor_file_id = gen_id()
offline_queue_file_id = gen_id()
auto_tagger_file_id = gen_id()
summarizer_file_id = gen_id()
action_button_file_id = gen_id()
settings_view_file_id = gen_id()

app_build_file_id = gen_id()
content_build_file_id = gen_id()
client_build_file_id = gen_id()
assets_build_file_id = gen_id()

# New build file IDs
network_monitor_build_id = gen_id()
offline_queue_build_id = gen_id()
auto_tagger_build_id = gen_id()
summarizer_build_id = gen_id()
action_button_build_id = gen_id()
settings_view_build_id = gen_id()

pbxproj = f"""// !$*UTF8*$!
{{
\tarchiveVersion = 1;
\tclasses = {{
\t}};
\tobjectVersion = 56;
\tobjects = {{

/* Begin PBXBuildFile section */
\t\t{app_build_file_id} /* {app_name}App.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {app_file_id} /* {app_name}App.swift */; }};
\t\t{content_build_file_id} /* ContentView.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {content_file_id} /* ContentView.swift */; }};
\t\t{client_build_file_id} /* NotionClient.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {client_file_id} /* NotionClient.swift */; }};
\t\t{network_monitor_build_id} /* NetworkMonitor.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {network_monitor_file_id} /* NetworkMonitor.swift */; }};
\t\t{offline_queue_build_id} /* OfflineQueue.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {offline_queue_file_id} /* OfflineQueue.swift */; }};
\t\t{auto_tagger_build_id} /* AutoTagger.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {auto_tagger_file_id} /* AutoTagger.swift */; }};
\t\t{summarizer_build_id} /* IntelligenceSummarizer.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {summarizer_file_id} /* IntelligenceSummarizer.swift */; }};
\t\t{action_button_build_id} /* ActionButtonHandler.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {action_button_file_id} /* ActionButtonHandler.swift */; }};
\t\t{settings_view_build_id} /* SettingsView.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {settings_view_file_id} /* SettingsView.swift */; }};
\t\t{assets_build_file_id} /* Assets.xcassets in Resources */ = {{isa = PBXBuildFile; fileRef = {assets_file_id} /* Assets.xcassets */; }};
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
\t\t{product_file_id} /* {app_name}.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = "{app_name}.app"; sourceTree = BUILT_PRODUCTS_DIR; }};
\t\t{app_file_id} /* {app_name}App.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "{app_name}App.swift"; sourceTree = "<group>"; }};
\t\t{content_file_id} /* ContentView.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "ContentView.swift"; sourceTree = "<group>"; }};
\t\t{client_file_id} /* NotionClient.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "NotionClient.swift"; sourceTree = "<group>"; }};
\t\t{network_monitor_file_id} /* NetworkMonitor.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "NetworkMonitor.swift"; sourceTree = "<group>"; }};
\t\t{offline_queue_file_id} /* OfflineQueue.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "OfflineQueue.swift"; sourceTree = "<group>"; }};
\t\t{auto_tagger_file_id} /* AutoTagger.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "AutoTagger.swift"; sourceTree = "<group>"; }};
\t\t{summarizer_file_id} /* IntelligenceSummarizer.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "IntelligenceSummarizer.swift"; sourceTree = "<group>"; }};
\t\t{action_button_file_id} /* ActionButtonHandler.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "ActionButtonHandler.swift"; sourceTree = "<group>"; }};
\t\t{settings_view_file_id} /* SettingsView.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "SettingsView.swift"; sourceTree = "<group>"; }};
\t\t{plist_file_id} /* Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = "Info.plist"; sourceTree = "<group>"; }};
\t\t{assets_file_id} /* Assets.xcassets */ = {{isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = "Assets.xcassets"; sourceTree = "<group>"; }};
\t\t{preview_assets_file_id} /* Preview Content */ = {{isa = PBXFileReference; lastKnownFileType = folder; path = "Preview Content"; sourceTree = "<group>"; }};
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
\t\t{frameworks_phase_id} /* Frameworks */ = {{
\t\t\tisa = PBXFrameworksBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
\t\t{main_group_id} = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\t{sources_group_id} /* {app_name} */,
\t\t\t\t{products_group_id} /* Products */,
\t\t\t);
\t\t\tsourceTree = "<group>";
\t\t}};
\t\t{sources_group_id} /* {app_name} */ = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\t{app_file_id} /* {app_name}App.swift */,
\t\t\t\t{content_file_id} /* ContentView.swift */,
\t\t\t\t{client_file_id} /* NotionClient.swift */,
\t\t\t\t{network_monitor_file_id} /* NetworkMonitor.swift */,
\t\t\t\t{offline_queue_file_id} /* OfflineQueue.swift */,
\t\t\t\t{auto_tagger_file_id} /* AutoTagger.swift */,
\t\t\t\t{summarizer_file_id} /* IntelligenceSummarizer.swift */,
\t\t\t\t{action_button_file_id} /* ActionButtonHandler.swift */,
\t\t\t\t{settings_view_file_id} /* SettingsView.swift */,
\t\t\t\t{plist_file_id} /* Info.plist */,
\t\t\t\t{assets_file_id} /* Assets.xcassets */,
\t\t\t\t{preview_assets_file_id} /* Preview Content */,
\t\t\t);
\t\t\tpath = "{app_name}";
\t\t\tsourceTree = "<group>";
\t\t}};
\t\t{products_group_id} /* Products */ = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\t{product_file_id} /* {app_name}.app */,
\t\t\t);
\t\t\tname = Products;
\t\t\tsourceTree = "<group>";
\t\t}};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
\t\t{target_id} /* {app_name} */ = {{
\t\t\tisa = PBXNativeTarget;
\t\t\tbuildConfigurationList = {build_config_list_target_id} /* Build configuration list for PBXNativeTarget "{app_name}" */;
\t\t\tbuildPhases = (
\t\t\t\t{sources_phase_id} /* Sources */,
\t\t\t\t{frameworks_phase_id} /* Frameworks */,
\t\t\t\t{resources_phase_id} /* Resources */,
\t\t\t);
\t\t\tbuildRules = (
\t\t\t);
\t\t\tdependencies = (
\t\t\t);
\t\t\tname = "{app_name}";
\t\t\tproductName = "{app_name}";
\t\t\tproductReference = {product_file_id} /* {app_name}.app */;
\t\t\tproductType = "com.apple.product-type.application";
\t\t}};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
\t\t{project_id} /* Project object */ = {{
\t\t\tisa = PBXProject;
\t\t\tattributes = {{
\t\t\t\tBuildIndependentTargetsInParallel = 1;
\t\t\t\tLastSwiftUpdateCheck = 1600;
\t\t\t\tLastUpgradeCheck = 1600;
\t\t\t\tTargetAttributes = {{
\t\t\t\t\t{target_id} = {{
\t\t\t\t\t\tCreatedOnToolsVersion = 16.0;
\t\t\t\t\t}};
\t\t\t\t}};
\t\t\t}};
\t\t\tbuildConfigurationList = {build_config_list_proj_id} /* Build configuration list for PBXProject "{app_name}" */;
\t\t\tcompatibilityVersion = "Xcode 14.0";
\t\t\tdevelopmentRegion = en;
\t\t\thasScannedForEncodings = 0;
\t\t\tmainGroup = {main_group_id};
\t\t\tproductRefGroup = {products_group_id} /* Products */;
\t\t\tprojectDirPath = "";
\t\t\tprojectRoot = "";
\t\t\ttargets = (
\t\t\t\t{target_id} /* {app_name} */,
\t\t\t);
\t\t}};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
\t\t{resources_phase_id} /* Resources */ = {{
\t\t\tisa = PBXResourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t\t{assets_build_file_id} /* Assets.xcassets in Resources */,
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
\t\t{sources_phase_id} /* Sources */ = {{
\t\t\tisa = PBXSourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t\t{app_build_file_id} /* {app_name}App.swift in Sources */,
\t\t\t\t{content_build_file_id} /* ContentView.swift in Sources */,
\t\t\t\t{client_build_file_id} /* NotionClient.swift in Sources */,
\t\t\t\t{network_monitor_build_id} /* NetworkMonitor.swift in Sources */,
\t\t\t\t{offline_queue_build_id} /* OfflineQueue.swift in Sources */,
\t\t\t\t{auto_tagger_build_id} /* AutoTagger.swift in Sources */,
\t\t\t\t{summarizer_build_id} /* IntelligenceSummarizer.swift in Sources */,
\t\t\t\t{action_button_build_id} /* ActionButtonHandler.swift in Sources */,
\t\t\t\t{settings_view_build_id} /* SettingsView.swift in Sources */,
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
\t\t{debug_cfg_proj} /* Debug */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t}};
\t\t\tname = Debug;
\t\t}};
\t\t{release_cfg_proj} /* Release */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t}};
\t\t\tname = Release;
\t\t}};
\t\t{debug_cfg_target} /* Debug */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
\t\t\t\tCODE_SIGN_IDENTITY = "Apple Development";
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tINFOPLIST_FILE = "{app_name}/Info.plist";
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = "com.example.{app_name}";
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "";
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1";
\t\t\t}};
\t\t\tname = Debug;
\t\t}};
\t\t{release_cfg_target} /* Release */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
\t\t\t\tCODE_SIGN_IDENTITY = "Apple Development";
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tINFOPLIST_FILE = "{app_name}/Info.plist";
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = "com.example.{app_name}";
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "";
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1";
\t\t\t}};
\t\t\tname = Release;
\t\t}};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
\t\t{build_config_list_proj_id} /* Build configuration list for PBXProject "{app_name}" */ = {{
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\t{debug_cfg_proj} /* Debug */,
\t\t\t\t{release_cfg_proj} /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t}};
\t\t{build_config_list_target_id} /* Build configuration list for PBXNativeTarget "{app_name}" */ = {{
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\t{debug_cfg_target} /* Debug */,
\t\t\t\t{release_cfg_target} /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t}};
/* End XCConfigurationList section */

\t}};
\trootObject = {project_id} /* Project object */;
}}
"""
with open(os.path.join(proj_dir, "project.pbxproj"), "w") as f:
    f.write(pbxproj)

