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

    // Hardcoded fallbacks (set your own values here to avoid re-entering in Settings)
    // WARNING: Shipping secrets in code is insecure; keep this for personal builds only.
    private static let fallbackApiKey: String = "ntn_D62952956804geiuotTIegSoOvzeJ8azFDw8wTK7Ok2cBO"
    private static let fallbackDataSourceId: String = "2d21773a96c080958907c803bd2717a3"

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

    private static var apiKey: String? {
        let bundled = fallbackApiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        if !bundled.isEmpty { return bundled }
        return getFromKeychain(service: apiKeyService)
    }

    private static var dataSourceId: String? {
        let bundled = fallbackDataSourceId.trimmingCharacters(in: .whitespacesAndNewlines)
        if !bundled.isEmpty { return bundled }
        return getFromKeychain(service: dataSourceService)
    }

    /// Main entry point - handles offline queueing automatically
    @MainActor
    static func createVoiceNote(title: String, transcript: String, tags: [String] = [], summary: String? = nil, action: String? = nil, dueDate: Date? = nil) async throws {
        // Check network - if offline, queue for later
        if !NetworkMonitor.shared.isConnected {
            let note = PendingNote(title: title, transcript: transcript, tags: tags, summary: summary, action: action, dueDate: dueDate)
            OfflineQueue.shared.enqueue(note)
            return // Silently queued
        }

        // Online - send directly
        try await sendToNotion(title: title, transcript: transcript, tags: tags, summary: summary, action: action, dueDate: dueDate)

        // Also try to sync any pending notes
        await OfflineQueue.shared.syncPending()
    }

    /// Direct API call to Notion (used by OfflineQueue for syncing)
    static func sendToNotion(title: String, transcript: String, tags: [String], summary: String?, action: String? = nil, dueDate: Date? = nil) async throws {
        guard let apiKey = apiKey, (apiKey.hasPrefix("ntn_") || apiKey.hasPrefix("secret_")),
              let dataSourceId = dataSourceId, !dataSourceId.isEmpty else {
            throw NotionClientError.missingConfig
        }

        let url = URL(string: "https://api.notion.com/v1/pages")!

        // Build properties
        // Property names must match the actual Notion database schema (Brain dump database)
        var properties: [String: Any] = [
            "Task / thought": [
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

        // Add tags if present (multi-select property named "Category" in the database)
        if !tags.isEmpty {
            properties["Category"] = [
                "multi_select": tags.map { ["name": $0] }
            ]
        }

        // Add extracted action items
        if let action = action, !action.isEmpty {
            properties["Action"] = [
                "rich_text": [
                    ["text": ["content": action]]
                ]
            ]
        }

        // Add due date (ISO 8601 format for Notion)
        if let dueDate = dueDate {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withFullDate]
            properties["Task due"] = [
                "date": [
                    "start": formatter.string(from: dueDate)
                ]
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
                        ["type": "text", "text": ["content": "Summary: \(summary)"]]
                    ],
                    "icon": ["type": "emoji", "emoji": "📝"]
                ]
            ])
        }

        var payload: [String: Any] = [
            "parent": [
                "database_id": dataSourceId
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
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(notionVersion, forHTTPHeaderField: "Notion-Version")

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? -1
        guard status >= 200 && status < 300 else {
            if let errorBody = String(data: data, encoding: .utf8) {
                print("Notion error \(status): \(errorBody)")
            }
            throw NotionClientError.badStatus(status)
        }
    }
}
