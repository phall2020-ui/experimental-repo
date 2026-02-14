import SwiftUI

struct DailySummaryCard: View {
    @Bindable var profile: UserProfile
    var summary: (kcal: Int, protein: Double, carbs: Double, fats: Double)?
    
    var caloricTarget: Int { NutritionManager.shared.calculateCaloricTarget(profile: profile) }
    private var today: Date { Date() }
    
    private var weekdayString: String {
        today.formatted(.dateTime.weekday(.wide))
    }
    
    var body: some View {
        let remaining = max(0, caloricTarget - (summary?.kcal ?? 0))
        let consumedCalories = summary?.kcal ?? 0
        let progress = caloricTarget > 0 ? Double(consumedCalories) / Double(caloricTarget) : 0
        let clampedProgress = min(max(progress, 0), 1)
        
        GlassCardView(
            title: "Today",
            subtitle: weekdayString,
            caloriesLeft: remaining,
            caloriesDetail: "\(consumedCalories) / \(caloricTarget) kcal",
            progress: clampedProgress,
            macroItems: [
                (label: "Protein", amount: "\(Int(summary?.protein ?? 0))g", color: .orange),
                (label: "Fat", amount: "\(Int(summary?.fats ?? 0))g", color: .green)
            ]
        )
    }
}
