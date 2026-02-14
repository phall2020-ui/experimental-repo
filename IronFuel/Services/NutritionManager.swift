import Foundation
import SwiftData
import SwiftUI

@Observable
class NutritionManager {
    static let shared = NutritionManager()
    private init() {}
    
    private func calculateBMR(profile: UserProfile) -> Double {
        let weight = profile.currentWeight
        let height = profile.heightCm
        let age = profile.age
        
        if profile.gender == .male {
            return (10 * weight) + (6.25 * height) - (5 * Double(age)) + 5
        } else {
            return (10 * weight) + (6.25 * height) - (5 * Double(age)) - 161
        }
    }
    
    func calculateTDEE(profile: UserProfile) -> Int {
        let bmr = calculateBMR(profile: profile)
        let tdee = bmr * profile.activityLevel.rawValue
        return Int(tdee.rounded())
    }
    
    @MainActor
    func calculateCaloricTarget(profile: UserProfile) -> Int {
        let tdee = Double(calculateTDEE(profile: profile))
        let kcalPerKg = 7700.0
        let dailyAdjustment = (profile.goalRatePerWeekKg * kcalPerKg) / 7.0
        let target = tdee + dailyAdjustment
        return Int(max(1200.0, target).rounded())
    }
    
    func calculateTrendWeight(logs: [WeightLog]) -> Double? {
        let sorted = logs.sorted { $0.date > $1.date }
        guard !sorted.isEmpty else { return nil }
        guard sorted.count >= 7 else { return sorted.first?.weight }
        
        let last7 = Array(sorted.prefix(7))
        let sum = last7.reduce(0.0) { $0 + $1.weight }
        return sum / Double(last7.count)
    }
    
    @MainActor
    func getDailySummary(for date: Date, context: ModelContext) -> (kcal: Int, protein: Double, carbs: Double, fats: Double)? {
        let start = Calendar.current.startOfDay(for: date)
        let end = Calendar.current.date(byAdding: .day, value: 1, to: start)!
        
        let predicate = #Predicate<FoodLog> { log in
            log.timestamp >= start && log.timestamp < end
        }
        
        let descriptor = FetchDescriptor<FoodLog>(predicate: predicate)
        
        do {
            let logs = try context.fetch(descriptor)
            guard !logs.isEmpty else { return nil }
            
            let totalKcal = logs.reduce(0) { $0 + $1.calories }
            let totalProtein = logs.reduce(0.0) { $0 + $1.protein }
            let totalCarbs = logs.reduce(0.0) { $0 + $1.carbs }
            let totalFats = logs.reduce(0.0) { $0 + $1.fats }
            
            return (totalKcal, totalProtein, totalCarbs, totalFats)
        } catch {
            print("Error fetching daily food logs: \(error)")
            return nil
        }
    }
    
    // MARK: - Weekly Summary
    
    struct WeeklySummaryData {
        let averageCalories: Int
        let averageProtein: Double
        let averageCarbs: Double
        let averageFats: Double
        let proteinAdherencePercent: Double
        let daysLogged: Int
    }
    
    @MainActor
    func getWeeklySummary(profile: UserProfile, context: ModelContext) -> WeeklySummaryData? {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        guard let weekAgo = calendar.date(byAdding: .day, value: -7, to: today) else { return nil }
        
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: today)!
        
        let predicate = #Predicate<FoodLog> { log in
            log.timestamp >= weekAgo && log.timestamp < tomorrow
        }
        
        let descriptor = FetchDescriptor<FoodLog>(predicate: predicate)
        
        do {
            let logs = try context.fetch(descriptor)
            guard !logs.isEmpty else { return nil }
            
            // Group logs by day
            var dailyTotals: [Date: (kcal: Int, protein: Double, carbs: Double, fats: Double)] = [:]
            
            for log in logs {
                let day = calendar.startOfDay(for: log.timestamp)
                let current = dailyTotals[day] ?? (0, 0, 0, 0)
                dailyTotals[day] = (
                    current.kcal + log.calories,
                    current.protein + log.protein,
                    current.carbs + log.carbs,
                    current.fats + log.fats
                )
            }
            
            let daysLogged = dailyTotals.count
            guard daysLogged > 0 else { return nil }
            
            let totalKcal = dailyTotals.values.reduce(0) { $0 + $1.kcal }
            let totalProtein = dailyTotals.values.reduce(0.0) { $0 + $1.protein }
            let totalCarbs = dailyTotals.values.reduce(0.0) { $0 + $1.carbs }
            let totalFats = dailyTotals.values.reduce(0.0) { $0 + $1.fats }
            
            // Calculate protein adherence (days meeting protein goal)
            let proteinGoal = Double(profile.proteinGoal)
            let daysMeetingProtein = dailyTotals.values.filter { $0.protein >= proteinGoal }.count
            let adherencePercent = (Double(daysMeetingProtein) / 7.0) * 100.0
            
            return WeeklySummaryData(
                averageCalories: totalKcal / daysLogged,
                averageProtein: totalProtein / Double(daysLogged),
                averageCarbs: totalCarbs / Double(daysLogged),
                averageFats: totalFats / Double(daysLogged),
                proteinAdherencePercent: adherencePercent,
                daysLogged: daysLogged
            )
        } catch {
            print("Error fetching weekly summary: \(error)")
            return nil
        }
    }
    
    // MARK: - Trend Analysis
    
    struct TrendInsight: Identifiable {
        let id = UUID()
        let message: String
        let trend: TrendDirection
        let icon: String
    }
    
    enum TrendDirection {
        case up, down, neutral
        
        var color: SwiftUI.Color {
            switch self {
            case .up: return .green
            case .down: return .red
            case .neutral: return .gray
            }
        }
    }
    
    @MainActor
    func getTrendAnalysis(profile: UserProfile, context: ModelContext) -> [TrendInsight] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        
        guard let thisWeekStart = calendar.date(byAdding: .day, value: -7, to: today),
              let lastWeekStart = calendar.date(byAdding: .day, value: -14, to: today) else { return [] }
        
        // Fetch this week's logs
        let thisWeekPredicate = #Predicate<FoodLog> { log in
            log.timestamp >= thisWeekStart && log.timestamp < today
        }
        let thisWeekDescriptor = FetchDescriptor<FoodLog>(predicate: thisWeekPredicate)
        
        // Fetch last week's logs
        let lastWeekPredicate = #Predicate<FoodLog> { log in
            log.timestamp >= lastWeekStart && log.timestamp < thisWeekStart
        }
        let lastWeekDescriptor = FetchDescriptor<FoodLog>(predicate: lastWeekPredicate)
        
        do {
            let thisWeekLogs = try context.fetch(thisWeekDescriptor)
            let lastWeekLogs = try context.fetch(lastWeekDescriptor)
            
            var insights: [TrendInsight] = []
            
            // Calculate weekly averages
            let thisWeekProtein = thisWeekLogs.reduce(0.0) { $0 + $1.protein }
            let lastWeekProtein = lastWeekLogs.reduce(0.0) { $0 + $1.protein }
            
            let thisWeekCalories = thisWeekLogs.reduce(0) { $0 + $1.calories }
            let lastWeekCalories = lastWeekLogs.reduce(0) { $0 + $1.calories }
            
            // Protein trend
            if lastWeekProtein > 0 {
                let proteinChange = ((thisWeekProtein - lastWeekProtein) / lastWeekProtein) * 100
                if abs(proteinChange) >= 5 {
                    let direction: TrendDirection = proteinChange > 0 ? .up : .down
                    let verb = proteinChange > 0 ? "improved" : "decreased"
                    insights.append(TrendInsight(
                        message: "Your protein intake \(verb) \(Int(abs(proteinChange)))% this week",
                        trend: direction,
                        icon: proteinChange > 0 ? "arrow.up.right.circle.fill" : "arrow.down.right.circle.fill"
                    ))
                }
            }
            
            // Calorie consistency
            if lastWeekCalories > 0 {
                let calorieChange = ((Double(thisWeekCalories) - Double(lastWeekCalories)) / Double(lastWeekCalories)) * 100
                if abs(calorieChange) < 10 {
                    insights.append(TrendInsight(
                        message: "Great calorie consistency! Staying within 10% of last week",
                        trend: .neutral,
                        icon: "checkmark.circle.fill"
                    ))
                } else if calorieChange > 10 {
                    insights.append(TrendInsight(
                        message: "Calorie intake up \(Int(calorieChange))% from last week",
                        trend: .up,
                        icon: "flame.fill"
                    ))
                }
            }
            
            // Logging consistency
            let thisWeekDays = Set(thisWeekLogs.map { calendar.startOfDay(for: $0.timestamp) }).count
            if thisWeekDays >= 6 {
                insights.append(TrendInsight(
                    message: "Excellent tracking! You logged \(thisWeekDays) of 7 days",
                    trend: .up,
                    icon: "star.fill"
                ))
            } else if thisWeekDays >= 4 {
                insights.append(TrendInsight(
                    message: "Good effort! \(thisWeekDays) days logged this week",
                    trend: .neutral,
                    icon: "hand.thumbsup.fill"
                ))
            } else if thisWeekDays > 0 {
                insights.append(TrendInsight(
                    message: "Try to log more consistently - only \(thisWeekDays) days tracked",
                    trend: .down,
                    icon: "exclamationmark.triangle.fill"
                ))
            }
            
            // Empty state
            if insights.isEmpty && thisWeekLogs.isEmpty {
                insights.append(TrendInsight(
                    message: "Start logging to see your trends!",
                    trend: .neutral,
                    icon: "chart.line.uptrend.xyaxis"
                ))
            }
            
            return insights
        } catch {
            print("Error fetching trend analysis: \(error)")
            return []
        }
    }
    
    // MARK: - Weight vs Nutrition Correlation
    
    struct WeightNutritionCorrelation {
        let weightChange: Double  // in kg
        let avgDailyCalories: Int
        let avgDailyDeficit: Int  // positive = deficit, negative = surplus
        let expectedWeightChange: Double  // based on calories
        let daysAnalyzed: Int
        let correlation: CorrelationType
    }
    
    enum CorrelationType: String {
        case onTrack = "On Track"
        case aheadOfPlan = "Ahead of Plan"
        case behindPlan = "Behind Plan"
        case noData = "Insufficient Data"
        
        var color: SwiftUI.Color {
            switch self {
            case .onTrack: return .green
            case .aheadOfPlan: return .blue
            case .behindPlan: return .orange
            case .noData: return .gray
            }
        }
        
        var icon: String {
            switch self {
            case .onTrack: return "checkmark.circle.fill"
            case .aheadOfPlan: return "arrow.up.circle.fill"
            case .behindPlan: return "arrow.down.circle.fill"
            case .noData: return "questionmark.circle.fill"
            }
        }
    }
    
    @MainActor
    func getWeightNutritionCorrelation(profile: UserProfile, weightLogs: [WeightLog], context: ModelContext) -> WeightNutritionCorrelation? {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        guard let twoWeeksAgo = calendar.date(byAdding: .day, value: -14, to: today) else { return nil }
        
        // Get weight change over 2 weeks
        let recentWeights = weightLogs
            .filter { $0.date >= twoWeeksAgo }
            .sorted { $0.date < $1.date }
        
        guard recentWeights.count >= 2 else { return nil }
        
        let startWeight = recentWeights.first!.weight
        let endWeight = recentWeights.last!.weight
        let weightChange = endWeight - startWeight
        
        // Get food logs for the same period
        let predicate = #Predicate<FoodLog> { log in
            log.timestamp >= twoWeeksAgo && log.timestamp < today
        }
        let descriptor = FetchDescriptor<FoodLog>(predicate: predicate)
        
        do {
            let logs = try context.fetch(descriptor)
            guard !logs.isEmpty else { return nil }
            
            // Group by day and calculate daily totals
            var dailyCalories: [Date: Int] = [:]
            for log in logs {
                let day = calendar.startOfDay(for: log.timestamp)
                dailyCalories[day, default: 0] += log.calories
            }
            
            let daysLogged = dailyCalories.count
            guard daysLogged >= 3 else { return nil }
            
            let totalCalories = dailyCalories.values.reduce(0, +)
            let avgDailyCalories = totalCalories / daysLogged
            
            // Calculate TDEE and deficit/surplus
            let tdee = calculateTDEE(profile: profile)
            let avgDailyDeficit = tdee - avgDailyCalories
            
            // Expected weight change: 7700 kcal ≈ 1kg
            let totalDeficit = avgDailyDeficit * daysLogged
            let expectedWeightChange = Double(totalDeficit) / 7700.0 * -1  // negative deficit = weight loss
            
            // Determine correlation type
            let correlation: CorrelationType
            let actualVsExpected = weightChange - expectedWeightChange
            
            if abs(actualVsExpected) < 0.3 {
                correlation = .onTrack
            } else if weightChange < expectedWeightChange {
                correlation = .aheadOfPlan  // Lost more than expected
            } else {
                correlation = .behindPlan  // Lost less than expected
            }
            
            return WeightNutritionCorrelation(
                weightChange: weightChange,
                avgDailyCalories: avgDailyCalories,
                avgDailyDeficit: avgDailyDeficit,
                expectedWeightChange: expectedWeightChange,
                daysAnalyzed: daysLogged,
                correlation: correlation
            )
        } catch {
            print("Error calculating weight-nutrition correlation: \(error)")
            return nil
        }
    }
    
    // MARK: - Streak Tracking
    
    struct StreakData {
        let currentStreak: Int
        let longestStreak: Int
        let totalDaysLogged: Int
        let lastLogDate: Date?
    }
    
    @MainActor
    func getStreakData(context: ModelContext) -> StreakData {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        
        let descriptor = FetchDescriptor<FoodLog>(sortBy: [SortDescriptor(\.timestamp, order: .reverse)])
        
        do {
            let logs = try context.fetch(descriptor)
            guard !logs.isEmpty else {
                return StreakData(currentStreak: 0, longestStreak: 0, totalDaysLogged: 0, lastLogDate: nil)
            }
            
            let loggedDays = Set(logs.map { calendar.startOfDay(for: $0.timestamp) }).sorted(by: >)
            let totalDays = loggedDays.count
            let lastLogDate = loggedDays.first
            
            var currentStreak = 0
            var checkDate = today
            
            for day in loggedDays {
                if day == checkDate || day == calendar.date(byAdding: .day, value: -1, to: checkDate) {
                    currentStreak += 1
                    checkDate = day
                } else if day < calendar.date(byAdding: .day, value: -1, to: checkDate)! {
                    break
                }
            }
            
            var longestStreak = 0
            var tempStreak = 1
            let sortedDays = loggedDays.sorted()
            
            for i in 1..<sortedDays.count {
                let prevDay = sortedDays[i - 1]
                let currentDay = sortedDays[i]
                
                if let nextDay = calendar.date(byAdding: .day, value: 1, to: prevDay), nextDay == currentDay {
                    tempStreak += 1
                } else {
                    longestStreak = max(longestStreak, tempStreak)
                    tempStreak = 1
                }
            }
            longestStreak = max(longestStreak, tempStreak)
            
            return StreakData(
                currentStreak: currentStreak,
                longestStreak: longestStreak,
                totalDaysLogged: totalDays,
                lastLogDate: lastLogDate
            )
        } catch {
            print("Error fetching streak data: \(error)")
            return StreakData(currentStreak: 0, longestStreak: 0, totalDaysLogged: 0, lastLogDate: nil)
        }
    }
    
    // MARK: - Weekly Progress Data
    
    struct WeeklyProgressPoint: Identifiable {
        let id = UUID()
        let date: Date
        let calories: Int
        let weight: Double?
    }
    
    @MainActor
    func getWeeklyProgressData(weightLogs: [WeightLog], context: ModelContext) -> [WeeklyProgressPoint] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        
        var points: [WeeklyProgressPoint] = []
        
        for dayOffset in (0..<7).reversed() {
            guard let date = calendar.date(byAdding: .day, value: -dayOffset, to: today) else { continue }
            let nextDay = calendar.date(byAdding: .day, value: 1, to: date)!
            
            let predicate = #Predicate<FoodLog> { log in
                log.timestamp >= date && log.timestamp < nextDay
            }
            let descriptor = FetchDescriptor<FoodLog>(predicate: predicate)
            
            do {
                let logs = try context.fetch(descriptor)
                let dailyCalories = logs.reduce(0) { $0 + $1.calories }
                let weight = weightLogs.first { calendar.isDate($0.date, inSameDayAs: date) }?.weight
                
                points.append(WeeklyProgressPoint(date: date, calories: dailyCalories, weight: weight))
            } catch {
                points.append(WeeklyProgressPoint(date: date, calories: 0, weight: nil))
            }
        }
        
        return points
    }
}
