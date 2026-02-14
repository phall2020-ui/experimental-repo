import Foundation
import SwiftData
import SwiftUI

enum MealCategory: String, Codable, CaseIterable { case breakfast, lunch, dinner, snack }

enum CheatMealCategory: String, CaseIterable {
    case burgers = "Burgers"
    case chicken = "Chicken"
    case pizza = "Pizza"
    case mexican = "Mexican"
    case asian = "Asian"
    case subs = "Subs & Sandwiches"
    case sides = "Sides"
    case desserts = "Desserts"
    case drinks = "Drinks"
}

@Model
final class FoodItem {
    @Attribute(.unique) var id: UUID
    var name: String
    var calories: Int
    var protein: Double
    var carbs: Double
    var fats: Double
    var defaultServingSize: Double
    var barcode: String?
    var category: String?  // "Cheat Meal", "McDonald's", "KFC", etc.
    var restaurant: String?
    
    init(name: String, calories: Int, protein: Double, carbs: Double, fats: Double, defaultServingSize: Double = 100, barcode: String? = nil, category: String? = nil, restaurant: String? = nil) {
        self.id = UUID()
        self.name = name
        self.calories = calories
        self.protein = protein
        self.carbs = carbs
        self.fats = fats
        self.defaultServingSize = defaultServingSize
        self.barcode = barcode
        self.category = category
        self.restaurant = restaurant
    }
}

@Model
final class FoodLog {
    var timestamp: Date
    var foodName: String
    var servingSize: Double
    var calories: Int
    var protein: Double
    var carbs: Double
    var fats: Double
    var category: MealCategory
    
    init(timestamp: Date = Date(), foodName: String, servingSize: Double, calories: Int, protein: Double, carbs: Double, fats: Double, category: MealCategory) {
        self.timestamp = timestamp
        self.foodName = foodName
        self.servingSize = servingSize
        self.calories = calories
        self.protein = protein
        self.carbs = carbs
        self.fats = fats
        self.category = category
    }
}
