import Foundation

public enum FoodLookupSource: String, Codable, Sendable {
    case localCache = "Cache"
    case backend = "API"
}

public struct FoodLookupOutcome: Sendable {
    public let product: FoodProductDTO
    public let source: FoodLookupSource
    public let normalized: NormalizedBarcode
}

public enum FoodLookupError: Error, Sendable {
    case normalizationFailed
    case notFound
}

public actor FoodLookupService {
    private let backend: FoodBackendClient

    public init(cache: FoodBackendClient, backend: FoodBackendClient) {
        // The cache and backend are unified in OpenFoodFactsDirectClient
        self.backend = backend
    }

    public func lookup(rawBarcode: String) async throws -> FoodLookupOutcome {
        let normalized = try GS1Barcode.normalize(rawBarcode)

        for key in normalized.alternates {
            if let dto = try await backend.fetchByGTIN14(key) {
                return FoodLookupOutcome(product: dto, source: .backend, normalized: normalized)
            }
        }

        throw FoodLookupError.notFound
    }
}
