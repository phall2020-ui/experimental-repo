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
                "Start voice note in \(.applicationName)",
                "Record voice note with \(.applicationName)",
                "New voice note \(.applicationName)"
            ],
            shortTitle: "Voice Note",
            systemImageName: "mic.circle.fill"
        )
    }
}
