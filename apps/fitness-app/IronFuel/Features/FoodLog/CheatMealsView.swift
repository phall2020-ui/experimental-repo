import SwiftUI
import SwiftData

/// Type alias for cheat meal data from the database
typealias CheatMeal = (name: String, calories: Int, protein: Double, carbs: Double, fats: Double, serving: Double, restaurant: String, category: CheatMealCategory)

struct CheatMealsView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    let mealCategory: MealCategory
    var onSelected: (CheatMealCategory) -> Void
    
    @State private var searchText = ""
    
    var filteredMeals: [CheatMeal] {
        let all = CheatMealDatabase.allMeals
        if searchText.isEmpty { return all }
        return all.filter { $0.name.localizedCaseInsensitiveContains(searchText) || $0.restaurant.localizedCaseInsensitiveContains(searchText) }
    }
    
    var body: some View {
        NavigationStack {
            List {
                ForEach(filteredMeals, id: \.name) { meal in
                    Button { logMeal(meal) } label: {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(meal.name).font(.headline).foregroundColor(.ironTextPrimary)
                                Text(meal.restaurant).font(.caption).foregroundColor(.ironTextSecondary)
                            }
                            Spacer()
                            VStack(alignment: .trailing) {
                                Text("\(meal.calories) kcal").font(.subheadline.bold()).foregroundColor(.ironWarning)
                                Text("P:\(Int(meal.protein)) C:\(Int(meal.carbs)) F:\(Int(meal.fats))").font(.caption2).foregroundColor(.ironTextSecondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Cheat Meals")
            .searchable(text: $searchText, prompt: "Search restaurant or meal")
            .background(Color.ironBackground)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
        }
    }
    
    private func logMeal(_ meal: CheatMeal) {
        let log = FoodLog(
            timestamp: Date(),
            foodName: "\(meal.restaurant) \(meal.name)",
            servingSize: 100,
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fats: meal.fats,
            category: mealCategory
        )
        modelContext.insert(log)
        dismiss()
    }
}
