import SwiftUI

struct DailyConfirmationCard: View {
    let todaySummary: (kcal: Int, protein: Double, carbs: Double, fats: Double)?
    let profile: UserProfile?
    let isConfirmed: Bool
    let onConfirm: () -> Void
    
    var targetCalories: Int {
        profile.map { NutritionManager.shared.calculateCaloricTarget(profile: $0) } ?? 2000
    }
    
    var proteinGoal: Int { profile?.proteinGoal ?? 150 }
    
    var encouragingMessage: String {
        guard let summary = todaySummary else {
            return "📝 Start logging your meals to track progress!"
        }
        
        let caloriesDiff = summary.kcal - targetCalories
        let proteinMet = summary.protein >= Double(proteinGoal)
        
        if isConfirmed {
            return "✅ Day confirmed! Great job staying accountable!"
        }
        
        if caloriesDiff <= 0 && proteinMet {
            return "🎯 Perfect day! Under calories AND hit protein goal!"
        } else if caloriesDiff <= 0 && !proteinMet {
            return "💪 Good calorie control! Try to get more protein tomorrow."
        } else if caloriesDiff > 0 && caloriesDiff <= 200 && proteinMet {
            return "👍 Solid effort! Just slightly over, great protein intake."
        } else if caloriesDiff > 200 {
            return "📊 \(caloriesDiff) over target. Tomorrow's a new day—stay consistent!"
        } else {
            return "🌟 Keep logging to see your progress!"
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("📅 Today's Summary")
                    .font(.headline)
                Spacer()
                if isConfirmed {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundColor(.green)
                }
            }
            
            if let summary = todaySummary {
                HStack(spacing: 15) {
                    VStack {
                        Text("\(summary.kcal)")
                            .font(.title2).bold()
                            .foregroundColor(summary.kcal <= targetCalories ? .green : .orange)
                        Text("/ \(targetCalories)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("kcal")
                            .font(.caption2)
                    }
                    
                    Divider().frame(height: 40)
                    
                    VStack {
                        Text("\(Int(summary.protein))g")
                            .font(.title2).bold()
                            .foregroundColor(summary.protein >= Double(proteinGoal) ? .green : .orange)
                        Text("/ \(proteinGoal)g")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("protein")
                            .font(.caption2)
                    }
                    
                    Spacer()
                }
                .frame(maxWidth: .infinity)
            }
            
            Text(encouragingMessage)
                .font(.subheadline)
                .foregroundColor(.primary)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            if todaySummary != nil && !isConfirmed {
                Button(action: onConfirm) {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Confirm Today's Diary")
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.green)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 5)
    }
}
