import SwiftUI
import UniformTypeIdentifiers

struct TodoItem: Identifiable, Codable, Equatable {
    let id: UUID
    var text: String
    var isCompleted: Bool
    
    init(id: UUID = UUID(), text: String, isCompleted: Bool = false) {
        self.id = id
        self.text = text
        self.isCompleted = isCompleted
    }
}

class TodoListManager: ObservableObject {
    static let shared = TodoListManager()
    
    @Published var items: [TodoItem] = []
    
    private let userDefaultsKey = "VoiceToNotion.TodoItems"
    
    init() {
        loadItems()
    }
    
    func loadItems() {
        if let data = UserDefaults.standard.data(forKey: userDefaultsKey),
           let decoded = try? JSONDecoder().decode([TodoItem].self, from: data) {
            items = decoded
        }
    }
    
    func saveItems() {
        if let encoded = try? JSONEncoder().encode(items) {
            UserDefaults.standard.set(encoded, forKey: userDefaultsKey)
        }
    }
    
    func addItem(_ text: String) {
        let item = TodoItem(text: text)
        items.append(item)
        saveItems()
    }
    
    func toggleItem(_ item: TodoItem) {
        if let index = items.firstIndex(where: { $0.id == item.id }) {
            items[index].isCompleted.toggle()
            saveItems()
        }
    }
    
    func deleteItem(_ item: TodoItem) {
        items.removeAll { $0.id == item.id }
        saveItems()
    }
    
    func deleteItems(at offsets: IndexSet) {
        items.remove(atOffsets: offsets)
        saveItems()
    }
    
    func moveItems(from source: IndexSet, to destination: Int) {
        items.move(fromOffsets: source, toOffset: destination)
        saveItems()
    }
    
    func clearCompleted() {
        items.removeAll { $0.isCompleted }
        saveItems()
    }
    
    func clearAll() {
        items.removeAll()
        saveItems()
    }
    
    /// Generates a formatted todo list string for copying
    func formattedListForCopy(includeCompleted: Bool = true) -> String {
        let itemsToInclude = includeCompleted ? items : items.filter { !$0.isCompleted }
        
        guard !itemsToInclude.isEmpty else {
            return "No items in todo list"
        }
        
        return itemsToInclude.map { item in
            let checkbox = item.isCompleted ? "☑" : "☐"
            return "\(checkbox) \(item.text)"
        }.joined(separator: "\n")
    }
    
    /// Generates a markdown-style checklist
    func markdownList(includeCompleted: Bool = true) -> String {
        let itemsToInclude = includeCompleted ? items : items.filter { !$0.isCompleted }
        
        guard !itemsToInclude.isEmpty else {
            return "No items in todo list"
        }
        
        return itemsToInclude.map { item in
            let checkbox = item.isCompleted ? "[x]" : "[ ]"
            return "- \(checkbox) \(item.text)"
        }.joined(separator: "\n")
    }
    
    /// Generates a plain text bullet list (no checkboxes)
    func plainBulletList(includeCompleted: Bool = true) -> String {
        let itemsToInclude = includeCompleted ? items : items.filter { !$0.isCompleted }
        
        guard !itemsToInclude.isEmpty else {
            return "No items in todo list"
        }
        
        return itemsToInclude.map { "• \($0.text)" }.joined(separator: "\n")
    }
}

struct TodoListView: View {
    @ObservedObject private var manager = TodoListManager.shared
    @State private var newItemText = ""
    @State private var showCopyOptions = false
    @State private var copiedFeedback = false
    @FocusState private var isTextFieldFocused: Bool
    
    var body: some View {
        VStack(spacing: 0) {
            // Header with copy button
            HStack {
                Text("Todo List")
                    .font(.title2.bold())
                
                Spacer()
                
                if !manager.items.isEmpty {
                    Button {
                        showCopyOptions = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: copiedFeedback ? "checkmark" : "doc.on.doc")
                            Text(copiedFeedback ? "Copied!" : "Copy")
                        }
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(copiedFeedback ? .green : .blue)
                    }
                    .animation(.easeInOut, value: copiedFeedback)
                }
            }
            .padding(.horizontal)
            .padding(.top)
            .padding(.bottom, 8)
            
            // Add new item
            HStack(spacing: 12) {
                TextField("Add a new task...", text: $newItemText)
                    .textFieldStyle(.roundedBorder)
                    .focused($isTextFieldFocused)
                    .onSubmit {
                        addNewItem()
                    }
                
                Button {
                    addNewItem()
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.blue)
                }
                .disabled(newItemText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding(.horizontal)
            .padding(.bottom, 12)
            
            Divider()
            
            // Todo list
            if manager.items.isEmpty {
                Spacer()
                VStack(spacing: 12) {
                    Image(systemName: "checklist")
                        .font(.system(size: 48))
                        .foregroundStyle(.secondary.opacity(0.5))
                    Text("No tasks yet")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                    Text("Add items above or dictate a note")
                        .font(.subheadline)
                        .foregroundStyle(.tertiary)
                }
                Spacer()
            } else {
                List {
                    ForEach(manager.items) { item in
                        TodoItemRow(item: item) {
                            manager.toggleItem(item)
                        } onDelete: {
                            manager.deleteItem(item)
                        }
                    }
                    .onDelete { offsets in
                        manager.deleteItems(at: offsets)
                    }
                    .onMove { source, destination in
                        manager.moveItems(from: source, to: destination)
                    }
                }
                .listStyle(.plain)
            }
            
            // Bottom actions
            if !manager.items.isEmpty {
                Divider()
                HStack {
                    let completedCount = manager.items.filter { $0.isCompleted }.count
                    let totalCount = manager.items.count
                    
                    Text("\(completedCount)/\(totalCount) completed")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    Spacer()
                    
                    if completedCount > 0 {
                        Button("Clear Completed") {
                            withAnimation {
                                manager.clearCompleted()
                            }
                        }
                        .font(.caption)
                        .foregroundStyle(.orange)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }
        }
        .confirmationDialog("Copy Todo List", isPresented: $showCopyOptions, titleVisibility: .visible) {
            Button("Copy as Checklist (☐)") {
                copyToClipboard(manager.formattedListForCopy())
            }
            Button("Copy as Markdown") {
                copyToClipboard(manager.markdownList())
            }
            Button("Copy as Bullet List") {
                copyToClipboard(manager.plainBulletList())
            }
            Button("Copy Uncompleted Only") {
                copyToClipboard(manager.formattedListForCopy(includeCompleted: false))
            }
            Button("Cancel", role: .cancel) {}
        }
    }
    
    private func addNewItem() {
        let trimmed = newItemText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        
        withAnimation {
            manager.addItem(trimmed)
            newItemText = ""
        }
    }
    
    private func copyToClipboard(_ text: String) {
        UIPasteboard.general.string = text
        
        copiedFeedback = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            copiedFeedback = false
        }
    }
}

struct TodoItemRow: View {
    let item: TodoItem
    let onToggle: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                    onToggle()
                }
            } label: {
                Image(systemName: item.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(item.isCompleted ? .green : .secondary)
            }
            .buttonStyle(.plain)
            
            Text(item.text)
                .strikethrough(item.isCompleted, color: .secondary)
                .foregroundStyle(item.isCompleted ? .secondary : .primary)
            
            Spacer()
        }
        .contentShape(Rectangle())
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            Button(role: .destructive) {
                withAnimation {
                    onDelete()
                }
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }
}

#Preview {
    TodoListView()
}
