import Foundation
import SwiftData
import SwiftUI
import CoreLocation

enum ExerciseType: String, Codable, CaseIterable { case weightAndReps, bodyweight, duration }
enum SetType: String, Codable, CaseIterable { case warmup, working, failure, drop }
enum MuscleGroup: String, Codable, CaseIterable { case chest, back, legs, shoulders, arms, abs, cardio, other }

@Model
final class GymLocation {
    @Attribute(.unique) var id: UUID
    var name: String
    var latitude: Double
    var longitude: Double
    var radiusMeters: Double
    
    init(name: String, latitude: Double, longitude: Double, radiusMeters: Double = 100) {
        self.id = UUID()
        self.name = name
        self.latitude = latitude
        self.longitude = longitude
        self.radiusMeters = radiusMeters
    }
    
    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}

@Model
final class Exercise {
    @Attribute(.unique) var id: UUID
    var name: String
    var muscleGroup: MuscleGroup
    
    init(name: String, muscleGroup: MuscleGroup) {
        self.id = UUID()
        self.name = name
        self.muscleGroup = muscleGroup
    }
}

@Model
final class WorkoutSession {
    @Attribute(.unique) var id: UUID
    var startTime: Date
    var endTime: Date?
    var title: String
    
    @Relationship(deleteRule: .cascade)
    var exercises: [WorkoutExercise] = []
    
    var gym: GymLocation?
    
    init(startTime: Date = Date(), title: String = "New Workout", gym: GymLocation? = nil) {
        self.id = UUID()
        self.startTime = startTime
        self.title = title
        self.gym = gym
    }
    
    var totalVolume: Double {
        exercises.reduce(0) { $0 + $1.volume }
    }
}

@Model
final class WorkoutExercise {
    var id: UUID
    var exerciseName: String
    var orderIndex: Int
    
    @Relationship(deleteRule: .cascade)
    var sets: [ExerciseSet] = []
    
    var workout: WorkoutSession?
    var exerciseRef: Exercise?
    
    init(exerciseName: String, orderIndex: Int, exerciseRef: Exercise? = nil) {
        self.id = UUID()
        self.exerciseName = exerciseName
        self.orderIndex = orderIndex
        self.exerciseRef = exerciseRef
    }
    
    var volume: Double {
        sets.filter { $0.isCompleted }.reduce(0) { $0 + ($1.weight * Double($1.reps)) }
    }
}

@Model
final class ExerciseSet {
    var id: UUID
    var weight: Double
    var reps: Int
    var rpe: Int?
    var isCompleted: Bool
    var type: SetType
    var orderIndex: Int
    
    var exercise: WorkoutExercise?
    
    init(weight: Double, reps: Int, orderIndex: Int, type: SetType = .working) {
        self.id = UUID()
        self.weight = weight
        self.reps = reps
        self.isCompleted = false
        self.type = type
        self.orderIndex = orderIndex
    }
}

struct WeightliftingConstants {
    static let defaultExercises: [(name: String, muscleGroup: MuscleGroup)] = [
        ("Bench Press", .chest),
        ("Incline Bench Press", .chest),
        ("Decline Bench Press", .chest),
        ("Dumbbell Fly", .chest),
        ("Cable Crossover", .chest),
        ("Push Up", .chest),
        ("Squat", .legs),
        ("Front Squat", .legs),
        ("Leg Press", .legs),
        ("Leg Extension", .legs),
        ("Leg Curl", .legs),
        ("Romanian Deadlift", .legs),
        ("Lunges", .legs),
        ("Calf Raise", .legs),
        ("Deadlift", .back),
        ("Barbell Row", .back),
        ("Dumbbell Row", .back),
        ("Lat Pulldown", .back),
        ("Pull Up", .back),
        ("Chin Up", .back),
        ("Seated Row", .back),
        ("T-Bar Row", .back),
        ("Face Pull", .back),
        ("Overhead Press", .shoulders),
        ("Dumbbell Shoulder Press", .shoulders),
        ("Lateral Raise", .shoulders),
        ("Front Raise", .shoulders),
        ("Rear Delt Fly", .shoulders),
        ("Shrugs", .shoulders),
        ("Barbell Curl", .arms),
        ("Dumbbell Curl", .arms),
        ("Hammer Curl", .arms),
        ("Preacher Curl", .arms),
        ("Tricep Pushdown", .arms),
        ("Overhead Tricep Extension", .arms),
        ("Skull Crushers", .arms),
        ("Dips", .arms),
        ("Close Grip Bench Press", .arms),
        ("Crunch", .abs),
        ("Plank", .abs),
        ("Hanging Leg Raise", .abs),
        ("Cable Crunch", .abs),
        ("Ab Wheel Rollout", .abs),
        ("Russian Twist", .abs),
        ("Running", .cardio),
        ("Cycling", .cardio),
        ("Rowing", .cardio),
        ("Stair Climber", .cardio),
        ("Jump Rope", .cardio)
    ]
}
