import Foundation
import SwiftData
import SwiftUI

@Observable
class TrainingManager {
    static let shared = TrainingManager()
    private init() {}
    
    func calculatePlates(targetWeight: Double, barWeight: Double = 45.0) -> [Plate] {
        let oneSideWeight = (targetWeight - barWeight) / 2.0
        if oneSideWeight <= 0 { return [] }
        
        let availablePlates: [(Double, SwiftUI.Color)] = [
            (45.0, .blue), (35.0, .yellow), (25.0, .green),
            (10.0, .white), (5.0, .red), (2.5, .black)
        ]
        
        var remaining = oneSideWeight
        var result: [Plate] = []
        
        for (weight, color) in availablePlates {
            while remaining >= weight {
                result.append(Plate(weight: weight, color: color))
                remaining -= weight
            }
        }
        return result
    }
    
    func calculateEstimated1RM(weight: Double, reps: Int) -> Double {
        if reps == 1 { return weight }
        if reps == 0 { return 0 }
        return weight * (1 + Double(reps) / 30.0)
    }
    
    @MainActor
    func getGhostSets(for exerciseName: String, context: ModelContext) -> [ExerciseSet] {
        let descriptor = FetchDescriptor<WorkoutExercise>(
            predicate: #Predicate { $0.exerciseName == exerciseName },
            sortBy: [SortDescriptor(\.workout?.startTime, order: .reverse)]
        )
        do {
            let results = try context.fetch(descriptor)
            if let lastSession = results.first {
                return lastSession.sets
                    .sorted(by: { $0.orderIndex < $1.orderIndex })
                    .map { oldSet in
                        ExerciseSet(weight: oldSet.weight, reps: oldSet.reps, orderIndex: oldSet.orderIndex, type: oldSet.type)
                    }
            }
        } catch {
            print("Error fetching ghost sets: \(error)")
        }
        return [ExerciseSet(weight: 45, reps: 10, orderIndex: 0)]
    }
}
