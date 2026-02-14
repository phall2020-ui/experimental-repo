//
//  AIIntelligenceService.swift
//  IronFuel
//
//  Analyzes user data to provide smart, actionable insights on the dashboard.
//

import Foundation
import SwiftUI
import HealthKit
import SwiftData

@MainActor
@Observable
class AIIntelligenceService {
    
    struct Insight: Identifiable {
        let id = UUID()
        let title: String
        let message: String
        let color: Color
        let icon: String
        let type: InsightType
    }
    
    enum InsightType {
        case nutrition, activity, consistency, encouragement
    }
    
    // MARK: - Properties
    
    var currentInsight: Insight?
    
    // MARK: - Analysis Methods
    
    func generateInsight(
        profile: UserProfile?,
        todaySteps: Int,
        activeCalories: Int,
        totalProtein: Double,
        proteinGoal: Int,
        mealsLogged: Int,
        weightLogs: [WeightLog]
    ) {
        // Priority 1: Nutrition Gap
        if mealsLogged > 0 && totalProtein < Double(proteinGoal) * 0.5 {
            let gap = proteinGoal - Int(totalProtein)
            currentInsight = Insight(
                title: "Protein Optimization",
                message: "You're \(gap)g away from your protein goal. A high-protein snack now would be perfect for muscle recovery.",
                color: .orange,
                icon: "sparkles",
                type: .nutrition
            )
            return
        }
        
        // Priority 2: Activity Milestone
        if todaySteps > 8000 && todaySteps < 10000 {
            currentInsight = Insight(
                title: "Step Milestone",
                message: "You're at \(todaySteps) steps! Just a quick 10-minute walk will push you over your daily goal.",
                color: .blue,
                icon: "figure.walk",
                type: .activity
            )
            return
        }
        
        // Priority 3: Weight Trend
        if weightLogs.count >= 7 {
            let recent = Array(weightLogs.prefix(7))
            let first = recent.last?.weight ?? 0
            let last = recent.first?.weight ?? 0
            let diff = last - first
            
            if abs(diff) > 0.5 {
                let direction = diff > 0 ? "gain" : "loss"
                currentInsight = Insight(
                    title: "Weight Trend",
                    message: "Your weight has shown a \(String(format: "%.1f", abs(diff)))kg \(direction) this week. Your consistency is starting to show in the data.",
                    color: .purple,
                    icon: "chart.line.uptrend.xyaxis",
                    type: .consistency
                )
                return
            }
        }
        
        // Priority 4: Activity vs Calories
        if activeCalories > 500 && mealsLogged < 2 {
            currentInsight = Insight(
                title: "Energy Balance",
                message: "High activity detected (\(activeCalories) cal) but low fuel intake. Make sure to log your next meal to maintain energy levels.",
                color: .green,
                icon: "bolt.fill",
                type: .activity
            )
            return
        }
        
        // Default: Encouragement
        currentInsight = Insight(
            title: "Crushing It",
            message: mealsLogged == 0 ? "Start your day by logging your first meal. Every small step counts towards your goal!" : "You're doing great! Keep tracking to stay on top of your fitness journey.",
            color: .blue,
            icon: "sparkles",
            type: .encouragement
        )
    }
}
