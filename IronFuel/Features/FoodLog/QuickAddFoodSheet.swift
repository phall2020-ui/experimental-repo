import SwiftUI
import SwiftData

struct QuickAddFoodSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    let mealCategory: MealCategory
    let selectedDate: Date
    
    @State private var name: String = ""
    @State private var calories: String = ""
    @State private var protein: String = ""
    @State private var carbs: String = ""
    @State private var fats: String = ""
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Basic Info") {
                    TextField("Food Name", text: $name)
                    TextField("Calories", text: $calories).keyboardType(.numberPad)
                }
                
                Section("Macros (optional)") {
                    TextField("Protein (g)", text: $protein).keyboardType(.numberPad)
                    TextField("Carbs (g)", text: $carbs).keyboardType(.numberPad)
                    TextField("Fats (g)", text: $fats).keyboardType(.numberPad)
                }
            }
            .navigationTitle("Quick Add")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let log = FoodLog(
                            timestamp: selectedDate,
                            foodName: name.isEmpty ? "Quick Add" : name,
                            servingSize: 100,
                            calories: Int(calories) ?? 0,
                            protein: Double(protein) ?? 0,
                            carbs: Double(carbs) ?? 0,
                            fats: Double(fats) ?? 0,
                            category: mealCategory
                        )
                        modelContext.insert(log)
                        dismiss()
                    }.disabled(calories.isEmpty)
                }
            }
        }
    }
}
