import SwiftUI

struct IronGradients {
    static let primary = LinearGradient(
        colors: [.ironPrimary, .ironPurple],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let glassStroke = LinearGradient(
        colors: [.white.opacity(0.3), .white.opacity(0.05)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
