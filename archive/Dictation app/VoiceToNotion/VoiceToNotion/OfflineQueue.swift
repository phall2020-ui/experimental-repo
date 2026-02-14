import Foundation

struct PendingNote: Codable, Identifiable {
    let id: UUID
    let title: String
    let transcript: String
    let tags: [String]
    let summary: String?
    let action: String?
    let dueDate: Date?
    let createdAt: Date

    init(title: String, transcript: String, tags: [String] = [], summary: String? = nil, action: String? = nil, dueDate: Date? = nil) {
        self.id = UUID()
        self.title = title
        self.transcript = transcript
        self.tags = tags
        self.summary = summary
        self.action = action
        self.dueDate = dueDate
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
                    summary: note.summary,
                    action: note.action,
                    dueDate: note.dueDate
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
            print("Failed to save offline queue: \(error)")
        }
    }

    private func load() {
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return }
        do {
            let data = try Data(contentsOf: fileURL)
            pendingNotes = try JSONDecoder().decode([PendingNote].self, from: data)
        } catch {
            print("Failed to load offline queue: \(error)")
        }
    }
}
