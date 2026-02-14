import SwiftUI
import SwiftData
import Charts

struct InsightsView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var profile: UserProfile?
    @State private var weeklySummary: NutritionManager.WeeklySummaryData?
    @State private var trendInsights: [NutritionManager.TrendInsight] = []
    @State private var todayMacros: (protein: Double, carbs: Double, fats: Double) = (0, 0, 0)
    @State private var weightCorrelation: NutritionManager.WeightNutritionCorrelation?
    @State private var streakData: NutritionManager.StreakData?
    @State private var progressData: [NutritionManager.WeeklyProgressPoint] = []
    @State private var todaySummary: (kcal: Int, protein: Double, carbs: Double, fats: Double)?
    @Query private var confirmations: [DailyConfirmation]
    
    @Query(sort: \WeightLog.date, order: .reverse) private var weightLogs: [WeightLog]
    
    private let nutritionManager = NutritionManager.shared
    
    private var dayConfirmed: Bool {
        let today = Calendar.current.startOfDay(for: Date())
        return confirmations.contains { Calendar.current.isDate($0.date, inSameDayAs: today) && $0.isConfirmed }
    }
    
    private func confirmDay() {
        let confirmation = DailyConfirmation(date: Date())
        modelContext.insert(confirmation)
        try? modelContext.save()
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    DailyConfirmationCard(
                        todaySummary: todaySummary,
                        profile: profile,
                        isConfirmed: dayConfirmed,
                        onConfirm: { confirmDay() }
                    )
                    
                    if let streak = streakData {
                        StreakCard(streakData: streak)
                    }
                    
                    WeeklySummaryCard(
                        summary: weeklySummary,
                        targetCalories: profile.map { nutritionManager.calculateCaloricTarget(profile: $0) } ?? 2000
                    )
                    
                    MacroPieChartView(
                        protein: weeklySummary?.averageProtein ?? todayMacros.protein,
                        carbs: weeklySummary?.averageCarbs ?? todayMacros.carbs,
                        fats: weeklySummary?.averageFats ?? todayMacros.fats
                    )
                    
                    if let correlation = weightCorrelation {
                        WeightNutritionCard(correlation: correlation)
                    }
                    
                    if !progressData.isEmpty {
                        WeeklyProgressChart(data: progressData, targetCalories: profile.map { nutritionManager.calculateCaloricTarget(profile: $0) } ?? 2000)
                    }
                    
                    TrendAnalysisCard(insights: trendInsights)
                }
                .padding()
            }
            .navigationTitle("Insights ⚡️")
            .onAppear { loadData() }
            .refreshable { loadData() }
        }
    }
    
    private func loadData() {
        let profileDescriptor = FetchDescriptor<UserProfile>()
        if let existingProfile = try? modelContext.fetch(profileDescriptor).first {
            profile = existingProfile
            weeklySummary = nutritionManager.getWeeklySummary(profile: existingProfile, context: modelContext)
            trendInsights = nutritionManager.getTrendAnalysis(profile: existingProfile, context: modelContext)
            weightCorrelation = nutritionManager.getWeightNutritionCorrelation(profile: existingProfile, weightLogs: weightLogs, context: modelContext)
        }
        
        streakData = nutritionManager.getStreakData(context: modelContext)
        progressData = nutritionManager.getWeeklyProgressData(weightLogs: weightLogs, context: modelContext)
        
        if let dailySummary = nutritionManager.getDailySummary(for: Date(), context: modelContext) {
            todayMacros = (dailySummary.protein, dailySummary.carbs, dailySummary.fats)
            todaySummary = dailySummary
        }
    }
}
