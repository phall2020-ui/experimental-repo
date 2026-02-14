import SwiftUI
import SwiftData

struct EditFoodLogSheet: View {
    @Bindable var foodLog: FoodLog
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Details") {
                    TextField("Name", text: $foodLog.foodName)
                    Picker("Meal", selection: $foodLog.category) {
                        ForEach(MealCategory.allCases, id: \.self) { meal in
                            Text(meal.rawValue.capitalized).tag(meal)
                        }
                    }
                }
                
                Section("Nutrition") {
                    HStack {
                        Text("Calories")
                        Spacer()
                        TextField("kcal", value: $foodLog.calories, format: .number).keyboardType(.numberPad).multilineTextAlignment(.trailing)
                    }
                    HStack {
                        Text("Protein")
                        Spacer()
                        TextField("g", value: $foodLog.protein, format: .number).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                    }
                    HStack {
                        Text("Carbs")
                        Spacer()
                        TextField("g", value: $foodLog.carbs, format: .number).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                    }
                    HStack {
                        Text("Fats")
                        Spacer()
                        TextField("g", value: $foodLog.fats, format: .number).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                    }
                }
                
                Section {
                    Button(role: .destructive) { modelContext.delete(foodLog); dismiss() } label: {
                        Text("Delete Entry").frame(maxWidth: .infinity)
                    }
                }
            }
            .navigationTitle("Edit Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
    }
}
