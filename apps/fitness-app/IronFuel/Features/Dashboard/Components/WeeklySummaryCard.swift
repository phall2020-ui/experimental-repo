import SwiftUI

struct WeeklySummaryCard: View {
    let summary: NutritionManager.WeeklySummaryData?
    let targetCalories: Int
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("📊 Weekly Summary")
                    .font(.headline)
                Spacer()
                if let summary = summary {
                    Text("\(summary.daysLogged)/7 days logged")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            if let summary = summary {
                HStack(spacing: 20) {
                    VStack(spacing: 4) {
                        Text("\(summary.averageCalories)")
                            .font(.title)
                            .bold()
                            .foregroundColor(.orange)
                        Text("Avg Calories")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    
                    Divider()
                        .frame(height: 50)
                    
                    VStack(spacing: 4) {
                        Text("\(Int(summary.proteinAdherencePercent))%")
                            .font(.title)
                            .bold()
                            .foregroundColor(summary.proteinAdherencePercent >= 70 ? .green : .orange)
                        Text("Protein Goal")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                }
                .padding(.vertical, 8)
                
                HStack {
                    MacroLabel(name: "P", value: summary.averageProtein, color: .blue)
                    MacroLabel(name: "C", value: summary.averageCarbs, color: .green)
                    MacroLabel(name: "F", value: summary.averageFats, color: .orange)
                }
            } else {
                Text("Log food for 7 days to see your weekly summary")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 5)
    }
}

struct MacroLabel: View {
    let name: String
    let value: Double
    let color: Color
    
    var body: some View {
        VStack(spacing: 2) {
            Text(name)
                .font(.caption2)
                .bold()
                .foregroundColor(color)
            Text("\(Int(value))g")
                .font(.caption)
                .foregroundColor(.primary)
        }
        .frame(maxWidth: .infinity)
    }
}
