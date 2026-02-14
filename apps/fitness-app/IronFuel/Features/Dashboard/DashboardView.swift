import SwiftUI
import SwiftData

struct DashboardView: View {
    @Environment(\.modelContext) private var modelContext
    @Binding var selectedTab: Int
    
    @Query(sort: \WeightLog.date, order: .reverse) private var weightLogs: [WeightLog]
    @Query private var userProfiles: [UserProfile]
    
    @State private var aiService = AIIntelligenceService()
    @State private var healthManager = HealthKitManager()
    
    private var profile: UserProfile? { userProfiles.first }
    
    private var todaySummary: (kcal: Int, protein: Double, carbs: Double, fats: Double)? {
        NutritionManager.shared.getDailySummary(for: Date(), context: modelContext)
    }
    
    private var trendWeight: Double? {
        NutritionManager.shared.calculateTrendWeight(logs: weightLogs)
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if let insight = aiService.currentInsight {
                        AIInsightCard(insight: insight)
                    }
                    
                    if let profile = profile {
                        DailySummaryCard(profile: profile, summary: todaySummary)
                            .onTapGesture { selectedTab = 2 }
                        
                        WeightTrackingCard(
                            currentWeight: profile.currentWeight,
                            trendWeight: trendWeight
                        )
                    }
                    
                    WeightTrendChart(weightLogs: Array(weightLogs.prefix(14)))
                }
                .padding()
            }
            .background(Color.ironBackground)
            .onAppear {
                Task {
                    await healthManager.requestAuthorization()
                    updateInsight()
                }
            }
            .onChange(of: todaySummary?.kcal) { updateInsight() }
            .onChange(of: healthManager.todaySteps) { updateInsight() }
        }
    }
    
    private func updateInsight() {
        aiService.generateInsight(
            profile: profile,
            todaySteps: healthManager.todaySteps,
            activeCalories: healthManager.todayActiveCalories,
            totalProtein: todaySummary?.protein ?? 0,
            proteinGoal: profile?.proteinGoal ?? 150,
            mealsLogged: 1, // Simplified for now since summary exists
            weightLogs: weightLogs
        )
    }
}
