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
                    SecureField("API Key (secret_...)", text: $apiKey)
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
                    Text("2. Copy the Internal Integration Secret (starts with secret_)")
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
            saveStatus = "Failed to save: \(error.localizedDescription)"
        }
    }
}
