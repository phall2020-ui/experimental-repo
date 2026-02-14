import SwiftUI

struct TrendAnalysisCard: View {
    let insights: [NutritionManager.TrendInsight]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("📈 Trend Analysis")
                .font(.headline)
            
            if insights.isEmpty {
                Text("Keep logging to unlock trend insights!")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                VStack(spacing: 10) {
                    ForEach(insights) { insight in
                        HStack(spacing: 12) {
                            Image(systemName: insight.icon)
                                .font(.title2)
                                .foregroundColor(insight.trend.color)
                                .frame(width: 32)
                            
                            Text(insight.message)
                                .font(.subheadline)
                                .foregroundColor(.primary)
                            
                            Spacer()
                        }
                        .padding(.vertical, 6)
                        .padding(.horizontal, 10)
                        .background(insight.trend.color.opacity(0.1))
                        .cornerRadius(8)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 5)
    }
}
