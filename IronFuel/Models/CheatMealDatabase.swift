import Foundation
import SwiftData

// MARK: - Cheat Meals Database Implementation

struct CheatMealDatabase {
    
    static let allMeals: [(name: String, calories: Int, protein: Double, carbs: Double, fats: Double, serving: Double, restaurant: String, category: CheatMealCategory)] = [
        // === McDONALD'S ===
        ("Big Mac", 550, 25, 45, 30, 1, "McDonald's", .burgers),
        ("Quarter Pounder with Cheese", 520, 30, 42, 26, 1, "McDonald's", .burgers),
        ("McChicken", 400, 14, 40, 21, 1, "McDonald's", .chicken),
        ("Chicken McNuggets (6pc)", 250, 15, 15, 15, 1, "McDonald's", .chicken),
        ("Chicken McNuggets (20pc)", 830, 49, 51, 50, 1, "McDonald's", .chicken),
        ("Large Fries", 490, 7, 66, 23, 1, "McDonald's", .sides),
        ("McFlurry Oreo", 510, 12, 80, 17, 1, "McDonald's", .desserts),
        ("Double Cheeseburger", 450, 25, 34, 24, 1, "McDonald's", .burgers),
        ("Filet-O-Fish", 390, 16, 39, 19, 1, "McDonald's", .burgers),
        ("Egg McMuffin", 310, 17, 30, 13, 1, "McDonald's", .burgers),
        
        // === BURGER KING ===
        ("Whopper", 660, 28, 49, 40, 1, "Burger King", .burgers),
        ("Whopper with Cheese", 740, 32, 50, 46, 1, "Burger King", .burgers),
        ("Double Whopper", 900, 48, 49, 56, 1, "Burger King", .burgers),
        ("Chicken Royale", 570, 24, 48, 31, 1, "Burger King", .chicken),
        ("Bacon Double Cheeseburger", 370, 22, 27, 19, 1, "Burger King", .burgers),
        
        // === KFC ===
        ("Original Recipe Chicken Breast", 390, 39, 11, 21, 1, "KFC", .chicken),
        ("Original Recipe Chicken Thigh", 280, 19, 9, 18, 1, "KFC", .chicken),
        ("Zinger Burger", 450, 22, 40, 22, 1, "KFC", .chicken),
        ("Boneless Banquet", 680, 35, 60, 32, 1, "KFC", .chicken),
        ("Popcorn Chicken (Large)", 560, 28, 36, 33, 1, "KFC", .chicken),
        ("Gravy (Regular)", 70, 2, 10, 2, 1, "KFC", .sides),
        ("Coleslaw (Regular)", 150, 1, 14, 10, 1, "KFC", .sides),
        ("Fries (Regular)", 280, 4, 38, 12, 1, "KFC", .sides),
        
        // === NANDO'S ===
        ("1/2 Chicken", 550, 65, 2, 32, 1, "Nando's", .chicken),
        ("Butterfly Chicken", 340, 53, 1, 14, 1, "Nando's", .chicken),
        ("Chicken Thighs (3pc)", 380, 30, 0, 28, 1, "Nando's", .chicken),
        ("Peri-Peri Chips (Regular)", 340, 5, 45, 15, 1, "Nando's", .sides),
        ("Spicy Rice (Regular)", 250, 6, 48, 4, 1, "Nando's", .sides),
        ("Garlic Bread", 180, 4, 22, 9, 1, "Nando's", .sides),
        
        // === SUBWAY ===
        ("Meatball Marinara (Footlong)", 960, 44, 108, 36, 1, "Subway", .subs),
        ("Italian BMT (Footlong)", 820, 38, 90, 32, 1, "Subway", .subs),
        ("Chicken Teriyaki (Footlong)", 740, 48, 100, 14, 1, "Subway", .subs),
        ("Tuna (Footlong)", 940, 40, 90, 44, 1, "Subway", .subs),
        ("Steak & Cheese (Footlong)", 740, 48, 90, 20, 1, "Subway", .subs),
        ("Turkey Breast (6 inch)", 280, 18, 46, 4, 1, "Subway", .subs),
        ("Cookies (3 pack)", 540, 6, 72, 24, 1, "Subway", .desserts),
        
        // === DOMINO'S ===
        ("Pepperoni Passion (Medium, whole)", 1800, 78, 168, 86, 1, "Domino's", .pizza),
        ("Pepperoni Passion (1 slice)", 225, 10, 21, 11, 1, "Domino's", .pizza),
        ("Mighty Meaty (Medium, whole)", 1920, 90, 168, 92, 1, "Domino's", .pizza),
        ("Mighty Meaty (1 slice)", 240, 11, 21, 12, 1, "Domino's", .pizza),
        ("Margherita (Medium, whole)", 1440, 60, 168, 56, 1, "Domino's", .pizza),
        ("Texas BBQ (Medium, whole)", 1760, 84, 176, 76, 1, "Domino's", .pizza),
        ("Garlic Pizza Bread", 670, 18, 72, 34, 1, "Domino's", .sides),
        ("Chicken Strippers (7pc)", 470, 42, 24, 22, 1, "Domino's", .sides),
        ("Cookies (4 pack)", 680, 8, 92, 32, 1, "Domino's", .desserts),
        
        // === PIZZA HUT ===
        ("Super Supreme (Medium, whole)", 2160, 96, 192, 104, 1, "Pizza Hut", .pizza),
        ("Meat Feast (Medium, whole)", 2080, 104, 184, 100, 1, "Pizza Hut", .pizza),
        ("Stuffed Crust Margherita (1 slice)", 280, 12, 28, 14, 1, "Pizza Hut", .pizza),
        ("Garlic Bread (4pc)", 460, 10, 52, 24, 1, "Pizza Hut", .sides),
        
        // === FIVE GUYS ===
        ("Cheeseburger", 840, 47, 40, 55, 1, "Five Guys", .burgers),
        ("Bacon Cheeseburger", 920, 51, 40, 62, 1, "Five Guys", .burgers),
        ("Little Hamburger", 480, 23, 39, 26, 1, "Five Guys", .burgers),
        ("Cajun Fries (Regular)", 520, 8, 60, 28, 1, "Five Guys", .sides),
        ("Cajun Fries (Large)", 950, 14, 110, 51, 1, "Five Guys", .sides),
        ("Bacon Dog", 620, 22, 40, 42, 1, "Five Guys", .burgers),
        
        // === TACO BELL ===
        ("Crunchy Taco", 170, 8, 13, 10, 1, "Taco Bell", .mexican),
        ("Crunchy Taco Supreme", 190, 8, 14, 11, 1, "Taco Bell", .mexican),
        ("Burrito Supreme - Beef", 390, 16, 43, 16, 1, "Taco Bell", .mexican),
        ("Quesadilla - Chicken", 510, 27, 37, 28, 1, "Taco Bell", .mexican),
        ("Nachos BellGrande", 740, 16, 82, 38, 1, "Taco Bell", .mexican),
        ("Cinnamon Twists", 170, 1, 26, 7, 1, "Taco Bell", .desserts),
        
        // === CHIPOTLE ===
        ("Chicken Burrito (Full Build)", 1050, 58, 102, 42, 1, "Chipotle", .mexican),
        ("Steak Bowl", 680, 42, 52, 32, 1, "Chipotle", .mexican),
        ("Chicken Quesadilla", 780, 48, 52, 42, 1, "Chipotle", .mexican),
        ("Chips & Guacamole", 770, 10, 73, 49, 1, "Chipotle", .sides),
        
        // === CHINESE TAKEAWAY ===
        ("Sweet & Sour Chicken Balls", 680, 28, 68, 32, 1, "Chinese Takeaway", .asian),
        ("Chicken Chow Mein", 520, 32, 58, 16, 1, "Chinese Takeaway", .asian),
        ("Egg Fried Rice (Large)", 480, 12, 72, 16, 1, "Chinese Takeaway", .asian),
        ("Crispy Aromatic Duck (Quarter)", 620, 38, 4, 50, 1, "Chinese Takeaway", .asian),
        ("Spring Rolls (4pc)", 320, 8, 36, 16, 1, "Chinese Takeaway", .asian),
        ("Prawn Crackers", 280, 2, 24, 20, 1, "Chinese Takeaway", .sides),
        
        // === INDIAN TAKEAWAY ===
        ("Chicken Tikka Masala", 580, 42, 22, 36, 1, "Indian Takeaway", .asian),
        ("Lamb Bhuna", 640, 38, 14, 48, 1, "Indian Takeaway", .asian),
        ("Pilau Rice", 350, 8, 62, 8, 1, "Indian Takeaway", .sides),
        ("Naan Bread", 320, 10, 52, 8, 1, "Indian Takeaway", .sides),
        ("Onion Bhaji (2pc)", 280, 6, 28, 16, 1, "Indian Takeaway", .sides),
        ("Samosa (2pc)", 340, 8, 36, 18, 1, "Indian Takeaway", .sides),
        
        // === GREGGS ===
        ("Sausage Roll", 327, 7, 24, 22, 1, "Greggs", .subs),
        ("Steak Bake", 408, 13, 35, 24, 1, "Greggs", .subs),
        ("Chicken Bake", 457, 17, 38, 27, 1, "Greggs", .subs),
        ("Vegan Sausage Roll", 312, 11, 26, 18, 1, "Greggs", .subs),
        ("Festive Bake", 458, 14, 37, 28, 1, "Greggs", .subs),
        ("Yum Yum (3 pack)", 450, 4, 54, 24, 1, "Greggs", .desserts),
        
        // === DRINKS ===
        ("Coca-Cola (500ml)", 210, 0, 53, 0, 1, "Drinks", .drinks),
        ("Coca-Cola (Large McDonald's)", 290, 0, 76, 0, 1, "McDonald's", .drinks),
        ("Milkshake Chocolate (Large)", 580, 14, 92, 18, 1, "McDonald's", .drinks),
        ("Fanta Orange (500ml)", 225, 0, 54, 0, 1, "Drinks", .drinks),
        ("Costa Latte (Large)", 180, 10, 16, 8, 1, "Costa", .drinks),
        ("Starbucks Frappuccino (Grande)", 380, 5, 60, 14, 1, "Starbucks", .drinks),
        
        // === DESSERTS ===
        ("Ben & Jerry's Cookie Dough (500ml)", 1200, 16, 140, 62, 1, "Ice Cream", .desserts),
        ("Häagen-Dazs Salted Caramel (500ml)", 1160, 16, 112, 72, 1, "Ice Cream", .desserts),
        ("Krispy Kreme Original Glazed", 190, 3, 22, 11, 1, "Krispy Kreme", .desserts),
        ("Krispy Kreme Chocolate Dreamcake", 350, 4, 42, 19, 1, "Krispy Kreme", .desserts),
    ]
    
    @MainActor
    static func seedDatabase(context: ModelContext) {
        // Check if already seeded
        let descriptor = FetchDescriptor<FoodItem>(predicate: #Predicate { $0.category == "Cheat Meal" })
        let existingCount = (try? context.fetchCount(descriptor)) ?? 0
        
        guard existingCount == 0 else { return }  // Already seeded
        
        for meal in allMeals {
            let foodItem = FoodItem(
                name: "\(meal.restaurant) - \(meal.name)",
                calories: meal.calories,
                protein: meal.protein,
                carbs: meal.carbs,
                fats: meal.fats,
                defaultServingSize: meal.serving,
                category: "Cheat Meal",
                restaurant: meal.restaurant
            )
            context.insert(foodItem)
        }
        
        try? context.save()
        print("🍔 Cheat meals database seeded with \(allMeals.count) items")
    }
    
    static func getRestaurants() -> [String] {
        Array(Set(allMeals.map { $0.restaurant })).sorted()
    }
    
    static func getMealsByRestaurant(_ restaurant: String) -> [(name: String, calories: Int, protein: Double, carbs: Double, fats: Double, serving: Double, restaurant: String, category: CheatMealCategory)] {
        allMeals.filter { $0.restaurant == restaurant }
    }
    
    static func getMealsByCategory(_ category: CheatMealCategory) -> [(name: String, calories: Int, protein: Double, carbs: Double, fats: Double, serving: Double, restaurant: String, category: CheatMealCategory)] {
        allMeals.filter { $0.category == category }
    }
}
