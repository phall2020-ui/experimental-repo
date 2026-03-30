import SwiftUI
import Charts

struct WeightTrendChart: View {
    var weightLogs: [WeightLog]
    
    var body: some View {
        VStack(alignment: .leading) {
            Text("Weight Progress")
                .font(.headline)
                .padding(.leading)
            
            if weightLogs.count >= 2 {
                Chart {
                    ForEach(weightLogs.sorted(by: { $0.date < $1.date }), id: \.date) { log in
                        LineMark(
                            x: .value("Date", log.date),
                            y: .value("Weight", log.weight)
                        )
                        .symbol(.circle)
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.purple, .blue],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        
                        PointMark(
                            x: .value("Date", log.date),
                            y: .value("Weight", log.weight)
                        )
                        .foregroundStyle(.purple)
                    }
                }
                .chartYAxisLabel("Weight (kg)")
                .chartXAxis(.hidden)
                .padding(.top, 10)
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.system(size: 40))
                        .foregroundColor(.gray.opacity(0.5))
                    
                    Text("Track your weight progress")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    Text("Log at least 2 weigh-ins to see your trend chart")
                        .font(.caption)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 30)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 5)
    }
}
