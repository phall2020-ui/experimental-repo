import Foundation
import SwiftData

enum Gender: String, Codable { case male, female }

enum ActivityLevel: Double, Codable, CaseIterable {
    case sedentary = 1.2
    case lightlyActive = 1.375
    case moderatelyActive = 1.55
    case veryActive = 1.725
    
    var description: String {
        switch self {
        case .sedentary: return "Sedentary (Little/no exercise)"
        case .lightlyActive: return "Lightly Active (1-3 days/week)"
        case .moderatelyActive: return "Moderately Active (3-5 days/week)"
        case .veryActive: return "Very Active (6-7 days/week)"
        }
    }
}

@Model
class DailyConfirmation {
    @Attribute(.unique) var id: String // Use date string as unique ID
    var date: Date
    var isConfirmed: Bool
    
    init(date: Date, isConfirmed: Bool = true) {
        let startOfDay = Calendar.current.startOfDay(for: date)
        self.date = startOfDay
        self.id = startOfDay.ISO8601Format()
        self.isConfirmed = isConfirmed
    }
}

@Model
final class UserProfile {
    var gender: Gender = Gender.male
    var age: Int = 30
    var heightCm: Double = 175.0
    var activityLevel: ActivityLevel = ActivityLevel.moderatelyActive
    var goalRatePerWeekKg: Double = -0.5

    var currentWeight: Double = 70.0
    var caloricGoal: Int = 2500
    var proteinGoal: Int = 150
    var carbsGoal: Int = 250
    var fatsGoal: Int = 70

    // Meal percentage distribution (sum should equal 100)
    var breakfastPercentage: Int = 25
    var lunchPercentage: Int = 35
    var dinnerPercentage: Int = 30
    var snackPercentage: Int = 10

    init(currentWeight: Double = 70.0, caloricGoal: Int = 2500, proteinGoal: Int = 150, carbsGoal: Int = 250, fatsGoal: Int = 70, breakfastPercentage: Int = 25, lunchPercentage: Int = 35, dinnerPercentage: Int = 30, snackPercentage: Int = 10) {
        self.currentWeight = currentWeight
        self.caloricGoal = caloricGoal
        self.proteinGoal = proteinGoal
        self.carbsGoal = carbsGoal
        self.fatsGoal = fatsGoal
        self.breakfastPercentage = breakfastPercentage
        self.lunchPercentage = lunchPercentage
        self.dinnerPercentage = dinnerPercentage
        self.snackPercentage = snackPercentage
    }
}

@Model
final class WeightLog {
    var date: Date
    var weight: Double
    
    init(date: Date = Date(), weight: Double) {
        self.date = Calendar.current.startOfDay(for: date)
        self.weight = weight
    }
}
