import Foundation

public protocol FoodBackendClient: Sendable {
    func fetchByGTIN14(_ gtin14: String) async throws -> FoodProductDTO?
    func getProduct(gtin14: String) async throws -> FoodProductDTO?
    func upsertProduct(_ product: FoodProductDTO) async throws
}

public struct HTTPFoodBackendClient: FoodBackendClient {
    public let baseURL: URL
    public let session: URLSession
    
    public init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }
    
    public func fetchByGTIN14(_ gtin14: String) async throws -> FoodProductDTO? {
        var url = baseURL
        url.append(path: "/v1/foods/gtin14/\(gtin14)")
        
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        
        let (data, resp) = try await session.data(for: req)
        guard let http = resp as? HTTPURLResponse else { return nil }
        
        if http.statusCode == 404 { return nil }
        guard (200...299).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(FoodProductDTO.self, from: data)
    }
    
    public func getProduct(gtin14: String) async throws -> FoodProductDTO? {
        // HTTPFoodBackendClient doesn't have a local cache
        return nil
    }
    
    public func upsertProduct(_ product: FoodProductDTO) async throws {
        // No-op for HTTP client (no local persistence)
    }
}
