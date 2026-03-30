import SwiftUI

struct WeightTrackingCard: View {
    let currentWeight: Double
    let trendWeight: Double?
    
    var weightChange: Double? {
        guard let trend = trendWeight else { return nil }
        return currentWeight - trend
    }
    
    var body: some View {
        VStack(alignment: .leading) {
            Text("Weight Today")
                .font(.headline)
            
            HStack(spacing: 15) {
                VStack(alignment: .leading) {
                    Text("\(currentWeight, specifier: "%.1f") kg")
                        .font(.largeTitle)
                        .bold()
                    Text("Last Weigh-in")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                if let trend = trendWeight {
                    VStack(alignment: .leading) {
                        Text("\(trend, specifier: "%.1f") kg")
                            .font(.title2)
                            .foregroundColor(.purple)
                        Text("7-Day Trend")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                if let change = weightChange {
                    VStack {
                        Image(systemName: change > 0.05 ? "arrow.up.right" : (change < -0.05 ? "arrow.down.right" : "equal"))
                            .foregroundColor(change > 0.05 ? .red : (change < -0.05 ? .green : .gray))
                        Text("\(abs(change), specifier: "%.1f") kg")
                            .font(.caption)
                            .foregroundColor(.secondary)
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
