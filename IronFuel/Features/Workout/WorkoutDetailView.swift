import SwiftUI
import SwiftData

struct WorkoutDetailView: View {
    @Bindable var workout: WorkoutSession
    @Environment(\.modelContext) private var modelContext
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                headerView.padding(.horizontal)
                
                ForEach(workout.exercises.sorted(by: { $0.orderIndex < $1.orderIndex })) { exercise in
                    exerciseView(exercise: exercise)
                }.padding(.horizontal)
            }.padding(.vertical)
        }
        .navigationTitle(workout.title)
        .background(Color.ironBackground)
    }
    
    private var headerView: some View {
        VStack(spacing: 8) {
            Text(workout.startTime.formatted(date: .long, time: .shortened)).font(.headline).foregroundColor(.ironTextPrimary)
            if let gym = workout.gym {
                Text(gym.name).font(.subheadline).foregroundColor(.ironPrimary)
            }
            if let endTime = workout.endTime {
                let duration = Int(endTime.timeIntervalSince(workout.startTime) / 60)
                Text("\(duration) minutes").font(.subheadline).foregroundColor(.ironTextSecondary)
            }
        }.padding().ironGlassCard()
    }
    
    private func exerciseView(exercise: WorkoutExercise) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(exercise.exerciseName).font(.headline).foregroundColor(.ironPrimary)
            
            VStack(spacing: 0) {
                HStack {
                    Text("SET").font(.caption2).foregroundColor(.ironTextSecondary).frame(width: 40)
                    Text("KG").font(.caption2).foregroundColor(.ironTextSecondary).frame(maxWidth: .infinity)
                    Text("REPS").font(.caption2).foregroundColor(.ironTextSecondary).frame(maxWidth: .infinity)
                }.padding(.vertical, 8).background(Color.ironCardDark.opacity(0.5))
                
                ForEach(exercise.sets.sorted(by: { $0.orderIndex < $1.orderIndex })) { set in
                    HStack {
                        Text("\(set.orderIndex + 1)").font(.subheadline).foregroundColor(.ironTextSecondary).frame(width: 40)
                        Text("\(set.weight, specifier: "%.1f")").font(.subheadline).frame(maxWidth: .infinity)
                        Text("\(set.reps)").font(.subheadline).frame(maxWidth: .infinity)
                    }.padding(.vertical, 8)
                    Divider().overlay(Color.ironCardBg)
                }
            }.background(Color.ironCardDark.opacity(0.8)).cornerRadius(12).overlay(RoundedRectangle(cornerRadius: 12).stroke(IronGradients.glassStroke, lineWidth: 1))
        }.padding().ironGlassCard()
    }
}
