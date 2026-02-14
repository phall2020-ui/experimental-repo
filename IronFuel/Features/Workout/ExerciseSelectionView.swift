import SwiftUI
import SwiftData

struct ExerciseSelectionView: View {
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \Exercise.name) private var exercises: [Exercise]
    
    var onSelect: (Exercise) -> Void
    @State private var searchText = ""
    
    var filteredExercises: [Exercise] {
        if searchText.isEmpty { return exercises }
        else { return exercises.filter { $0.name.localizedCaseInsensitiveContains(searchText) } }
    }
    
    var body: some View {
        NavigationStack {
            List {
                ForEach(filteredExercises) { exercise in
                    Button { onSelect(exercise); dismiss() } label: {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(exercise.name).font(.headline).foregroundColor(.ironTextPrimary)
                                Text(exercise.muscleGroup.rawValue.capitalized).font(.caption).foregroundColor(.ironTextSecondary)
                            }
                            Spacer()
                            Image(systemName: "plus.circle").foregroundColor(.ironPrimary)
                        }
                    }
                }
            }
            .navigationTitle("Select Exercise")
            .searchable(text: $searchText, prompt: "Search exercises")
            .background(Color.ironBackground)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
    }
}
