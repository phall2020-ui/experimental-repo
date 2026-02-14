//
//  HealthKitManager.swift
//  IronFuel
//
//  Manages HealthKit authorization and data queries for live dashboard data.
//

import Foundation
import HealthKit
import SwiftUI

@MainActor
@Observable
class HealthKitManager {
    
    // MARK: - Published Properties
    
    var todaySteps: Int = 0
    var todayActiveCalories: Int = 0
    var stepGoal: Int = 10000
    var isAuthorized: Bool = false
    var authorizationError: String? = nil
    
    // MARK: - Private Properties
    
    private let healthStore = HKHealthStore()
    private var observerQueries: [HKQuery] = []
    
    // MARK: - Initialization
    
    init() {
        // Check if HealthKit is available on this device
        guard HKHealthStore.isHealthDataAvailable() else {
            authorizationError = "HealthKit is not available on this device"
            return
        }
    }
    
    // MARK: - Authorization
    
    func requestAuthorization() async {
        guard HKHealthStore.isHealthDataAvailable() else {
            authorizationError = "HealthKit is not available"
            return
        }
        
        // Types we want to read
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
        ]
        
        // Types we want to write (for future weight sync)
        let typesToWrite: Set<HKSampleType> = [
            HKObjectType.quantityType(forIdentifier: .bodyMass)!
        ]
        
        do {
            try await healthStore.requestAuthorization(toShare: typesToWrite, read: typesToRead)
            isAuthorized = true
            authorizationError = nil
            
            // Start fetching data
            await fetchTodayData()
            setupObservers()
        } catch {
            authorizationError = error.localizedDescription
            isAuthorized = false
        }
    }
    
    // MARK: - Data Fetching
    
    func fetchTodayData() async {
        await fetchTodaySteps()
        await fetchTodayActiveCalories()
    }
    
    private func fetchTodaySteps() async {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return }
        
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: Date(), options: .strictStartDate)
        
        do {
            let steps = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Int, Error>) in
                let query = HKStatisticsQuery(
                    quantityType: stepType,
                    quantitySamplePredicate: predicate,
                    options: .cumulativeSum
                ) { _, result, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                        return
                    }
                    
                    let sum = result?.sumQuantity()?.doubleValue(for: .count()) ?? 0
                    continuation.resume(returning: Int(sum))
                }
                healthStore.execute(query)
            }
            todaySteps = steps
        } catch {
            print("Error fetching steps: \(error)")
        }
    }
    
    private func fetchTodayActiveCalories() async {
        guard let energyType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) else { return }
        
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: Date(), options: .strictStartDate)
        
        do {
            let calories = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Int, Error>) in
                let query = HKStatisticsQuery(
                    quantityType: energyType,
                    quantitySamplePredicate: predicate,
                    options: .cumulativeSum
                ) { _, result, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                        return
                    }
                    
                    let sum = result?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
                    continuation.resume(returning: Int(sum))
                }
                healthStore.execute(query)
            }
            todayActiveCalories = calories
        } catch {
            print("Error fetching active calories: \(error)")
        }
    }
    
    // MARK: - Background Observers
    
    private func setupObservers() {
        // Observer for steps - updates in real-time as new data comes in
        if let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) {
            let stepQuery = HKObserverQuery(sampleType: stepType, predicate: nil) { [weak self] _, _, error in
                if error == nil {
                    Task { @MainActor in
                        await self?.fetchTodaySteps()
                    }
                }
            }
            healthStore.execute(stepQuery)
            observerQueries.append(stepQuery)
        }
        
        // Observer for active energy
        if let energyType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) {
            let energyQuery = HKObserverQuery(sampleType: energyType, predicate: nil) { [weak self] _, _, error in
                if error == nil {
                    Task { @MainActor in
                        await self?.fetchTodayActiveCalories()
                    }
                }
            }
            healthStore.execute(energyQuery)
            observerQueries.append(energyQuery)
        }
    }
    
    // MARK: - Cleanup
    
    func stopObserving() {
        for query in observerQueries {
            healthStore.stop(query)
        }
        observerQueries.removeAll()
    }
    
    // MARK: - Computed Properties
    
    var stepsProgress: Double {
        guard stepGoal > 0 else { return 0 }
        return min(Double(todaySteps) / Double(stepGoal), 1.0)
    }
    
    var formattedSteps: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return formatter.string(from: NSNumber(value: todaySteps)) ?? "\(todaySteps)"
    }
    
    var formattedStepGoal: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return formatter.string(from: NSNumber(value: stepGoal)) ?? "\(stepGoal)"
    }
}
