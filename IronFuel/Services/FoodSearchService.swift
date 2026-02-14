import Foundation
import SwiftData

struct FoodSearchResult: Identifiable, Sendable {
    let id = UUID()
    let name: String
    let brand: String?
    let calories: Int
    let protein: Double
    let carbs: Double
    let fats: Double
    let servingSize: Double
    let servingDescription: String?
    let source: FoodSearchSource
}

enum FoodSearchSource: String, Sendable {
    case localCache
    case recentLogs
    case savedFoods
    case onlineAPI
}

protocol NutritionAPIClient: Sendable {
    func searchFoods(_ query: String) async throws -> [FoodSearchResult]
}

struct USDANutritionAPIClient: NutritionAPIClient {
    let apiKey: String
    let session: URLSession

    init(apiKey: String, session: URLSession = .shared) {
        self.apiKey = apiKey
        self.session = session
    }

    func searchFoods(_ query: String) async throws -> [FoodSearchResult] {
        var components = URLComponents(string: "https://api.nal.usda.gov/fdc/v1/foods/search")!
        components.queryItems = [
            URLQueryItem(name: "api_key", value: apiKey),
            URLQueryItem(name: "query", value: query),
            URLQueryItem(name: "pageSize", value: "20"),
            URLQueryItem(name: "dataType", value: "Foundation,SR Legacy")
        ]

        guard let url = components.url else { throw URLError(.badURL) }

        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, resp) = try await session.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            return []
        }

        let decoder = JSONDecoder()
        let response = try decoder.decode(USDASearchResponse.self, from: data)

        return response.foods.map { food in
            let nutrients = food.foodNutrients
            let kcal = nutrients.first(where: { $0.nutrientName.contains("Energy") && $0.unitName == "KCAL" })?.value ?? 0
            let protein = nutrients.first(where: { $0.nutrientName.contains("Protein") })?.value ?? 0
            let carbs = nutrients.first(where: { $0.nutrientName.contains("Carbohydrate") })?.value ?? 0
            let fat = nutrients.first(where: { $0.nutrientName.contains("Total lipid") })?.value ?? 0

            return FoodSearchResult(
                name: food.description,
                brand: food.brandOwner,
                calories: Int(kcal),
                protein: protein,
                carbs: carbs,
                fats: fat,
                servingSize: food.servingSize ?? 100,
                servingDescription: food.servingSizeUnit,
                source: .onlineAPI
            )
        }
    }
}

private struct USDASearchResponse: Codable {
    let foods: [USDAFood]
}

private struct USDAFood: Codable {
    let description: String
    let brandOwner: String?
    let servingSize: Double?
    let servingSizeUnit: String?
    let foodNutrients: [USDANutrient]
}

private struct USDANutrient: Codable {
    let nutrientName: String
    let unitName: String
    let value: Double
}

actor FoodSearchService {
    private let context: ModelContext
    private let nutritionAPI: NutritionAPIClient?

    init(context: ModelContext, nutritionAPI: NutritionAPIClient? = nil) {
        self.context = context
        self.nutritionAPI = nutritionAPI
    }
    
    var hasOnlineSource: Bool { nutritionAPI != nil }

    func searchLocal(_ query: String) throws -> [FoodSearchResult] {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return [] }
        var results: [FoodSearchResult] = []
        let normalizedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)

        // Saved foods
        let savedFoodsDescriptor = FetchDescriptor<FoodItem>(
            predicate: #Predicate { item in item.name.localizedStandardContains(normalizedQuery) },
            sortBy: [SortDescriptor(\.name)]
        )
        if let savedFoods = try? context.fetch(savedFoodsDescriptor) {
            results.append(contentsOf: savedFoods.prefix(5).map { food in
                FoodSearchResult(name: food.name, brand: food.restaurant, calories: food.calories, protein: food.protein, carbs: food.carbs, fats: food.fats, servingSize: food.defaultServingSize, servingDescription: "\(Int(food.defaultServingSize))g", source: .savedFoods)
            })
        }
        
        // Recent logs
        let logsDescriptor = FetchDescriptor<FoodLog>(
            predicate: #Predicate { log in log.foodName.localizedStandardContains(normalizedQuery) },
            sortBy: [SortDescriptor(\.timestamp, order: .reverse)]
        )
        if let recentLogs = try? context.fetch(logsDescriptor) {
            var seen = Set<String>()
            let uniqueLogs = recentLogs.filter { log in
                let key = log.foodName.lowercased()
                if seen.contains(key) { return false }
                seen.insert(key)
                return true
            }
            results.append(contentsOf: uniqueLogs.prefix(5).map { log in
                FoodSearchResult(name: log.foodName, brand: nil, calories: log.calories, protein: log.protein, carbs: log.carbs, fats: log.fats, servingSize: log.servingSize, servingDescription: "\(Int(log.servingSize))g", source: .recentLogs)
            })
        }
        
        // Cached products
        let productsDescriptor = FetchDescriptor<FoodProduct>(
            predicate: #Predicate { product in
                product.name.localizedStandardContains(normalizedQuery) ||
                (product.brand != nil && product.brand!.localizedStandardContains(normalizedQuery))
            },
            sortBy: [SortDescriptor(\.lastVerifiedAt, order: .reverse)]
        )
        if let cachedProducts = try? context.fetch(productsDescriptor) {
            results.append(contentsOf: cachedProducts.prefix(5).map { product in
                let nutrients = product.nutrients
                return FoodSearchResult(name: product.name, brand: product.brand, calories: Int(nutrients?.kcalPer100g ?? 0), protein: nutrients?.proteinPer100g ?? 0, carbs: nutrients?.carbsPer100g ?? 0, fats: nutrients?.fatPer100g ?? 0, servingSize: product.servingSizeG ?? 100, servingDescription: product.servingDescription, source: .localCache)
            })
        }
        
        return results
    }
    
    func searchRemote(_ query: String) async throws -> [FoodSearchResult] {
        guard let api = nutritionAPI, !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return [] }
        return try await api.searchFoods(query)
    }

    func search(_ query: String, includeOnline: Bool = false) async throws -> [FoodSearchResult] {
        var results = try searchLocal(query)
        if includeOnline && results.isEmpty {
            let remote = try await searchRemote(query)
            results.append(contentsOf: remote)
        }
        return results
    }
}
