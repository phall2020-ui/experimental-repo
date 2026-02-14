import SwiftUI

extension View {
    func ironGlassCard() -> some View {
        modifier(GlassModifier())
    }
    
    func ironPrimaryButton() -> some View {
        modifier(PrimaryButtonModifier())
    }
    
    func backgroundColor(_ color: Color) -> some View {
        background(color)
    }
}
