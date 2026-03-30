import SwiftUI
import Speech
import AVFoundation

struct ContentView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            DictationView()
                .tabItem {
                    Label("Dictate", systemImage: "mic.fill")
                }
                .tag(0)
            
            TodoListView()
                .tabItem {
                    Label("Todos", systemImage: "checklist")
                }
                .tag(1)
        }
    }
}

struct DictationView: View {

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
    @State private var showTodoCreated = false

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
                        Text("\(offlineQueue.pendingNotes.count) pending")
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
                
                if showTodoCreated {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                        Text("Todo item(s) created")
                            .font(.subheadline)
                    }
                    .padding()
                    .background(.green.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .animation(.spring(), value: showTodoCreated)
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

        if #available(iOS 17, *) {
            AVAudioApplication.requestRecordPermission { granted in
                DispatchQueue.main.async {
                    if !granted {
                        self.lastError = "Microphone access not granted. Settings → Privacy & Security → Microphone."
                    }
                }
            }
        } else {
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                DispatchQueue.main.async {
                    if !granted {
                        self.lastError = "Microphone access not granted. Settings → Privacy & Security → Microphone."
                    }
                }
            }
        }
    }

    private func toggleRecording() {
        isRecording ? stop() : start()
    }

    private func start() {
        guard recognizer != nil else {
            lastError = "Speech recognizer unavailable for this locale."
            statusText = "Tap to dictate"
            return
        }

        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized:
            break
        case .denied, .restricted:
            lastError = "Speech recognition not authorised. Settings → Privacy & Security → Speech Recognition."
            statusText = "Tap to dictate"
            return
        case .notDetermined:
            requestPermissions()
            return
        @unknown default:
            lastError = "Speech recognition permission unknown."
            statusText = "Tap to dictate"
            return
        }

        if #available(iOS 17, *) {
            let micPermission = AVAudioApplication.shared.recordPermission
            switch micPermission {
            case .granted:
                break
            case .undetermined:
                requestPermissions()
                return
            case .denied:
                fallthrough
            @unknown default:
                lastError = "Microphone access not granted. Settings → Privacy & Security → Microphone."
                statusText = "Tap to dictate"
                return
            }
        } else {
            let micPermission = AVAudioSession.sharedInstance().recordPermission
            switch micPermission {
            case .granted:
                break
            case .undetermined:
                requestPermissions()
                return
            case .denied:
                fallthrough
            @unknown default:
                lastError = "Microphone access not granted. Settings → Privacy & Security → Microphone."
                statusText = "Tap to dictate"
                return
            }
        }

        lastError = nil
        transcript = ""
        statusText = "Listening…"

        recognitionTask?.cancel()
        recognitionTask = nil

        do {
            let session = AVAudioSession.sharedInstance()
            // Background audio: use playAndRecord to keep recording when screen locks
            try session.setCategory(.playAndRecord, mode: .measurement, options: [.duckOthers, .allowBluetoothHFP, .mixWithOthers])
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            lastError = "Audio session error: \(error.localizedDescription)"
            isRecording = false
            statusText = "Tap to dictate"
            return
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.requiresOnDeviceRecognition = false // Allow cloud for better accuracy
        self.recognitionRequest = request

        do {
            let node = audioEngine.inputNode
            let format = node.outputFormat(forBus: 0)

            node.removeTap(onBus: 0)
            node.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
                request.append(buffer)
            }
            audioEngine.prepare()
            try audioEngine.start()
        } catch {
            lastError = "Audio engine error: \(error.localizedDescription)"
            isRecording = false
            statusText = "Tap to dictate"
            return
        }

        isRecording = true
        recognitionTask = recognizer?.recognitionTask(with: request) { result, error in
            if let error = error {
                DispatchQueue.main.async {
                    self.lastError = "Recognition error: \(error.localizedDescription)"
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
            await MainActor.run { statusText = "Tagging…" }
            let tags = await AutoTagger.getAllTags(from: finalTranscript)

            await MainActor.run { statusText = "Summarizing…" }
            let summary = await IntelligenceSummarizer.generateSummary(for: finalTranscript)

            await MainActor.run { statusText = "Extracting actions…" }
            let action = await ActionExtractor.extractActions(from: finalTranscript)
            let dueDate = await ActionExtractor.extractDueDate(from: finalTranscript)

            // Auto-create todo items if actions were extracted
            if let action = action {
                // Actions from extractor can be semi-colon separated (see ActionExtractor.swift:95)
                let individualActions = action.components(separatedBy: "; ")
                await MainActor.run {
                    for individualAction in individualActions {
                        TodoListManager.shared.addItem(individualAction)
                    }
                    showTodoCreated = true
                }
            }

            let title = finalTranscript.split(separator: " ").prefix(8).joined(separator: " ")

            await MainActor.run {
                statusText = networkMonitor.isConnected ? "Saving to Notion…" : "Queueing offline…"
            }

            do {
                try await NotionClient.createVoiceNote(
                    title: String(title),
                    transcript: finalTranscript,
                    tags: tags,
                    summary: summary,
                    action: action,
                    dueDate: dueDate
                )

                await MainActor.run {
                    if networkMonitor.isConnected {
                        statusText = "Saved ✅"
                    } else {
                        statusText = "Queued for sync ✅"
                    }
                    
                    // Hide todo feedback after 3 seconds
                    if showTodoCreated {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                            showTodoCreated = false
                        }
                    }
                }
            } catch NotionClientError.missingConfig {
                await MainActor.run {
                    statusText = "Tap to dictate"
                    lastError = "Missing Notion config. Use NotionClient.setCredentials() to configure."
                }
            } catch NotionClientError.badStatus(let code) {
                await MainActor.run {
                    statusText = "Tap to dictate"
                    if code == 401 {
                        lastError = "Notion auth failed (401). Check API key and share the database with your integration."
                    } else if code == 403 {
                        lastError = "Notion permission error (403). Share the database with your integration."
                    } else {
                        lastError = "Notion save failed (HTTP \(code)). Check token, database id, and permissions."
                    }
                }
            } catch {
                await MainActor.run {
                    statusText = "Tap to dictate"
                    lastError = "Notion save failed: \(error.localizedDescription)"
                }
            }
        }
    }
}
