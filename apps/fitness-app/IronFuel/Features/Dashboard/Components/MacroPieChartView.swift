import SwiftUI
import Charts

struct MacroPieChartView: View {
    let protein: Double
    let carbs: Double
    let fats: Double
    
    var total: Double { protein + carbs + fats }
    
    var macroData: [(name: String, value: Double, color: Color)] {
        [
            ("Protein", protein, .blue),
            ("Carbs", carbs, .green),
            ("Fats", fats, .orange)
        ]
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("🥧 Macro Distribution")
                .font(.headline)
            
            if total > 0 {
                HStack(spacing: 20) {
                    Chart(macroData, id: \.name) { item in
                        SectorMark(
                            angle: .value("Grams", item.value),
                            innerRadius: .ratio(0.5),
                            angularInset: 2
                        )
                        .foregroundStyle(item.color)
                        .cornerRadius(4)
                    }
                    .frame(width: 120, height: 120)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(macroData, id: \.name) { item in
                            HStack(spacing: 8) {
                                Circle()
                                    .fill(item.color)
                                    .frame(width: 12, height: 12)
                                VStack(alignment: .leading) {
                                    Text(item.name)
                                        .font(.caption)
                                        .bold()
                                    Text("\(Int(item.value))g (\(Int((item.value / total) * 100))%)")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .center)
            } else {
                Text("No macro data available yet")
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
