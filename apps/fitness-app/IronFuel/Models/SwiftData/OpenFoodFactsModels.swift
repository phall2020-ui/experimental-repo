import Foundation
import SwiftData

public struct FoodNutrients: Codable, Sendable, Equatable {
    public var kcalPer100g: Double?
    public var proteinPer100g: Double?
    public var carbsPer100g: Double?
    public var fatPer100g: Double?
    public var fibrePer100g: Double?
    
    public init(kcalPer100g: Double? = nil,
                proteinPer100g: Double? = nil,
                carbsPer100g: Double? = nil,
                fatPer100g: Double? = nil,
                fibrePer100g: Double? = nil) {
        self.kcalPer100g = kcalPer100g
        self.proteinPer100g = proteinPer100g
        self.carbsPer100g = carbsPer100g
        self.fatPer100g = fatPer100g
        self.fibrePer100g = fibrePer100g
    }
}

@Model
public final class FoodProduct {
    @Attribute(.unique) public var gtin14: String
    
    public var name: String
    public var brand: String?
    public var imageURL: String?
    
    public var servingSizeG: Double?
    public var servingDescription: String?
    
    public var nutrientsBlob: Data?
    
    public var source: String?
    public var lastVerifiedAt: Date?
    
    public init(gtin14: String,
                name: String,
                brand: String? = nil,
                imageURL: String? = nil,
                servingSizeG: Double? = nil,
                servingDescription: String? = nil,
                nutrients: FoodNutrients? = nil,
                source: String? = nil,
                lastVerifiedAt: Date? = nil) {
        self.gtin14 = gtin14
        self.name = name
        self.brand = brand
        self.imageURL = imageURL
        self.servingSizeG = servingSizeG
        self.servingDescription = servingDescription
        self.source = source
        self.lastVerifiedAt = lastVerifiedAt
        self.nutrientsBlob = nutrients.flatMap { try? JSONEncoder().encode($0) }
    }
    
    public var nutrients: FoodNutrients? {
        get {
            guard let nutrientsBlob else { return nil }
            return try? JSONDecoder().decode(FoodNutrients.self, from: nutrientsBlob)
        }
        set {
            nutrientsBlob = newValue.flatMap { try? JSONEncoder().encode($0) }
        }
    }
}

@Model
public final class UserFoodDefault {
    @Attribute(.unique) public var key: String
    
    public var userId: String
    public var gtin14: String
    
    public var defaultServingG: Double?
    public var defaultServingCount: Double?
    public var defaultMealSlot: String?
    public var lastUsedAt: Date?
    
    public init(userId: String, gtin14: String) {
        self.userId = userId
        self.gtin14 = gtin14
        self.key = "\(userId)|\(gtin14)"
    }
}

public struct FoodProductDTO: Codable, Sendable {
    public var gtin14: String
    public var name: String
    public var brand: String?
    public var imageURL: String?
    public var servingSizeG: Double?
    public var servingDescription: String?
    public var nutrients: FoodNutrients?
    public var source: String?
    public var lastVerifiedAt: Date?
    
    public init(
        gtin14: String,
        name: String,
        brand: String? = nil,
        imageURL: String? = nil,
        servingSizeG: Double? = nil,
        servingDescription: String? = nil,
        nutrients: FoodNutrients? = nil,
        source: String? = nil,
        lastVerifiedAt: Date? = nil
    ) {
        self.gtin14 = gtin14
        self.name = name
        self.brand = brand
        self.imageURL = imageURL
        self.servingSizeG = servingSizeG
        self.servingDescription = servingDescription
        self.nutrients = nutrients
        self.source = source
        self.lastVerifiedAt = lastVerifiedAt
    }
    
    public func toModel() -> FoodProduct {
        FoodProduct(
            gtin14: gtin14,
            name: name,
            brand: brand,
            imageURL: imageURL,
            servingSizeG: servingSizeG,
            servingDescription: servingDescription,
            nutrients: nutrients,
            source: source,
            lastVerifiedAt: lastVerifiedAt
        )
    }
}

extension FoodProductDTO {
    public init(model: FoodProduct) {
        self.gtin14 = model.gtin14
        self.name = model.name
        self.brand = model.brand
        self.imageURL = model.imageURL
        self.servingSizeG = model.servingSizeG
        self.servingDescription = model.servingDescription
        self.nutrients = model.nutrients
        self.source = model.source
        self.lastVerifiedAt = model.lastVerifiedAt
    }
}
