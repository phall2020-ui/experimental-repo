import SwiftUI

struct Plate: Identifiable {
    let id = UUID()
    let weight: Double
    let color: Color
}

struct PlateCalculator {
    static func calculatePlates(targetWeight: Double, barWeight: Double = 45.0) -> [Plate] {
        guard targetWeight > barWeight else { return [] }
        
        let weightPerSide = (targetWeight - barWeight) / 2
        let availablePlates: [(Double, Color)] = [
            (45.0, .blue),
            (35.0, .yellow),
            (25.0, .green),
            (10.0, .white),
            (5.0, .orange),
            (2.5, .red)
        ]
        
        var result: [Plate] = []
        var remainingWeight = weightPerSide
        
        for (weight, color) in availablePlates {
            while remainingWeight >= weight {
                result.append(Plate(weight: weight, color: color))
                remainingWeight -= weight
            }
        }
        
        return result
    }
}
