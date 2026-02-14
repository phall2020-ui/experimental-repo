import SwiftUI
import SwiftData

struct WorkoutHistoryListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \WorkoutSession.startTime, order: .reverse) private var workouts: [WorkoutSession]
    
    var body: some View {
        List {
            ForEach(workouts) { workout in
                NavigationLink(destination: WorkoutDetailView(workout: workout)) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(workout.title).font(.headline).foregroundColor(.ironTextPrimary)
                        HStack {
                            Text(workout.startTime.formatted(date: .abbreviated, time: .shortened)).font(.caption)
                            Spacer()
                            Text("\(workout.exercises.count) exercises").font(.caption)
                        }.foregroundColor(.ironTextSecondary)
                    }
                }
            }.onDelete(perform: deleteWorkouts)
        }
        .navigationTitle("Workout History")
        .background(Color.ironBackground)
    }
    
    private func deleteWorkouts(at offsets: IndexSet) {
        for index in offsets { modelContext.delete(workouts[index]) }
    }
}
