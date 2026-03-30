import SwiftUI
import Charts

struct WeeklyProgressChart: View {
    let data: [NutritionManager.WeeklyProgressPoint]
    let targetCalories: Int
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("📈 Weekly Progress")
                .font(.headline)
            
            Chart {
                ForEach(data) { point in
                    BarMark(
                        x: .value("Day", point.date, unit: .day),
                        y: .value("Calories", point.calories)
                    )
                    .foregroundStyle(point.calories <= targetCalories ? Color.green : Color.orange)
                }
                
                RuleMark(y: .value("Target", targetCalories))
                    .foregroundStyle(.red.opacity(0.7))
                    .lineStyle(StrokeStyle(lineWidth: 2, dash: [5, 5]))
            }
            .frame(height: 150)
            .chartYAxisLabel("Calories")
            
            HStack {
                Circle().fill(.green).frame(width: 10, height: 10)
                Text("Under target").font(.caption)
                Circle().fill(.orange).frame(width: 10, height: 10)
                Text("Over target").font(.caption)
                Spacer()
            }
            .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 5)
    }
}
