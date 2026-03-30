import SwiftUI

struct WeightNutritionCard: View {
    let correlation: NutritionManager.WeightNutritionCorrelation
    
    var weightChangeText: String {
        let change = correlation.weightChange
        if abs(change) < 0.1 {
            return "No change"
        } else if change < 0 {
            return "\(String(format: "%.1f", abs(change)))kg lost"
        } else {
            return "\(String(format: "%.1f", change))kg gained"
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("⚖️ NutriWeight Correlation")
                    .font(.headline)
                Spacer()
                HStack(spacing: 4) {
                    Image(systemName: correlation.correlation.icon)
                    Text(correlation.correlation.rawValue)
                }
                .font(.caption).bold()
                .foregroundColor(correlation.correlation.color)
            }
            
            Text("Over the past \(correlation.daysAnalyzed) days, your nutrition and weight show a **\(correlation.correlation.rawValue)** correlation.")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            HStack(spacing: 15) {
                CorrelationStat(label: "Actual", value: weightChangeText)
                Divider().frame(height: 30)
                CorrelationStat(label: "Expected", value: "\(String(format: "%.1f", correlation.expectedWeightChange))kg")
                Divider().frame(height: 30)
                CorrelationStat(label: "Avg Kcal", value: "\(correlation.avgDailyCalories)")
            }
            .padding(.top, 4)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 5)
    }
}

struct CorrelationStat: View {
    let label: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
            Text(value)
                .font(.subheadline).bold()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
