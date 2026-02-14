import SwiftUI

@main
struct VoiceToNotionApp: App {
    // Initialize network monitor early to start tracking connectivity
    @StateObject private var networkMonitor = NetworkMonitor.shared
    @StateObject private var offlineQueue = OfflineQueue.shared

    init() {
        // Register App Shortcuts for Action Button
        VoiceToNotionShortcuts.updateAppShortcutParameters()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(networkMonitor)
                .environmentObject(offlineQueue)
                .task {
                    // Try to sync any pending notes on app launch
                    if networkMonitor.isConnected {
                        await offlineQueue.syncPending()
                    }
                }
                .onOpenURL { url in
                    // Handle deep link from widget
                    if url.scheme == "voicetonotion" && url.host == "dictate" {
                        // Small delay to ensure the view is ready
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            NotificationCenter.default.post(name: .startDictation, object: nil)
                        }
                    }
                }
        }
    }
}
