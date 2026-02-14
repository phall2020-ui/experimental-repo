import Foundation

/// A client that directly calls the OpenFoodFacts API, eliminating the need for a local backend server.
public struct OpenFoodFactsDirectClient: FoodBackendClient {
    private let session: URLSession
    private let baseURL = "https://world.openfoodfacts.org/api/v2"
    
    public init(session: URLSession = .shared) {
        self.session = session
    }
    
    public func fetchByGTIN14(_ gtin14: String) async throws -> FoodProductDTO? {
        let lookupCodes = generateLookupCodes(from: gtin14)
        
        for code in lookupCodes {
            if let product = try await fetchProduct(barcode: code, originalGTIN: gtin14) {
                return product
            }
        }
        
        return nil
    }
    
    public func getProduct(gtin14: String) async throws -> FoodProductDTO? {
        // OpenFoodFacts is a stateless API — no local cache
        return nil
    }
    
    public func upsertProduct(_ product: FoodProductDTO) async throws {
        // No-op for direct API client (no local persistence)
    }
    
    private func generateLookupCodes(from gtin14: String) -> [String] {
        var codes: [String] = []
        codes.append(gtin14)
        
        let stripped = gtin14.drop(while: { $0 == "0" })
        if !stripped.isEmpty && String(stripped) != gtin14 {
            codes.append(String(stripped))
        }
        
        if gtin14.count == 14 && gtin14.hasPrefix("0") {
            codes.append(String(gtin14.dropFirst()))
        }
        
        if gtin14.count >= 12 {
            let upc12 = String(gtin14.suffix(12))
            if !codes.contains(upc12) {
                codes.append(upc12)
            }
        }
        
        return codes
    }
    
    private func fetchProduct(barcode: String, originalGTIN: String) async throws -> FoodProductDTO? {
        guard let url = URL(string: "\(baseURL)/product/\(barcode)") else { return nil }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("IronFuel-iOS-App/1.0", forHTTPHeaderField: "User-Agent")
        
        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            return nil
        }
        
        // Decode OpenFoodFacts JSON response
        do {
            let offResponse = try JSONDecoder().decode(OFFProductResponse.self, from: data)
            guard offResponse.status == 1, let offProduct = offResponse.product else {
                return nil
            }
            
            return FoodProductDTO(
                gtin14: originalGTIN,
                name: offProduct.productName ?? offProduct.genericName ?? "Unknown Product",
                brand: offProduct.brands,
                servingSizeG: offProduct.servingQuantity,
                nutrients: FoodNutrients(
                    kcalPer100g: offProduct.nutriments?.energyKcal100g,
                    proteinPer100g: offProduct.nutriments?.proteins100g,
                    carbsPer100g: offProduct.nutriments?.carbohydrates100g,
                    fatPer100g: offProduct.nutriments?.fat100g
                )
            )
        } catch {
            print("Decode error: \(error)")
            return nil
        }
    }
}

// MARK: - OpenFoodFacts Response Models

private struct OFFProductResponse: Decodable {
    let status: Int
    let product: OFFProduct?
}

private struct OFFProduct: Decodable {
    let productName: String?
    let genericName: String?
    let brands: String?
    let servingQuantity: Double?
    let nutriments: OFFNutriments?
    
    enum CodingKeys: String, CodingKey {
        case productName = "product_name"
        case genericName = "generic_name"
        case brands
        case servingQuantity = "serving_quantity"
        case nutriments
    }
}

private struct OFFNutriments: Decodable {
    let energyKcal100g: Double?
    let proteins100g: Double?
    let carbohydrates100g: Double?
    let fat100g: Double?
    
    enum CodingKeys: String, CodingKey {
        case energyKcal100g = "energy-kcal_100g"
        case proteins100g = "proteins_100g"
        case carbohydrates100g = "carbohydrates_100g"
        case fat100g = "fat_100g"
    }
}

