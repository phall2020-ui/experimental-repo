import Foundation
import Combine

@MainActor
public final class FoodScanViewModel: ObservableObject {
    public enum State: Equatable {
        case idle
        case scanning
        case lookingUp
        case found(name: String, brand: String?)
        case notFound
        case error(message: String)
    }
    
    @Published public private(set) var state: State = .idle
    @Published public private(set) var lastOutcome: FoodLookupOutcome?
    
    private let lookupService: FoodLookupService
    
    public init(lookupService: FoodLookupService) {
        self.lookupService = lookupService
    }
    
    public func handleScannedBarcode(_ code: String) {
        if case .lookingUp = state { return } 
        state = .lookingUp
        
        Task {
            do {
                let outcome = try await lookupService.lookup(rawBarcode: code)
                self.lastOutcome = outcome
                self.state = .found(name: outcome.product.name, brand: outcome.product.brand)
            } catch FoodLookupError.notFound {
                self.state = .notFound
            } catch {
                self.state = .error(message: error.localizedDescription)
            }
        }
    }
    
    public func reset() {
        lastOutcome = nil
        state = .idle
    }
}
