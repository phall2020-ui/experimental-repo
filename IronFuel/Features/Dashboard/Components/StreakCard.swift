import SwiftUI

struct StreakCard: View {
    let streakData: NutritionManager.StreakData
    
    var body: some View {
        HStack(spacing: 20) {
            VStack(spacing: 4) {
                Text("🔥")
                    .font(.largeTitle)
                Text("\(streakData.currentStreak)")
                    .font(.title).bold()
                    .foregroundColor(.orange)
                Text("Current")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)
            
            Divider().frame(height: 60)
            
            VStack(spacing: 4) {
                Text("🏆")
                    .font(.largeTitle)
                Text("\(streakData.longestStreak)")
                    .font(.title).bold()
                    .foregroundColor(.yellow)
                Text("Best")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)
            
            Divider().frame(height: 60)
            
            VStack(spacing: 4) {
                Text("📊")
                    .font(.largeTitle)
                Text("\(streakData.totalDaysLogged)")
                    .font(.title).bold()
                    .foregroundColor(.blue)
                Text("Total Days")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 5)
    }
}
