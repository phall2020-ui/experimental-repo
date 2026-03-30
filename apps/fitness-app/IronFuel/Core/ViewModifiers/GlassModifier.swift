import SwiftUI

struct GlassModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial)
            .background(Color.ironCardBg)
            .cornerRadius(Layout.cornerRadius)
            .overlay(
                RoundedRectangle(cornerRadius: Layout.cornerRadius)
                    .stroke(IronGradients.glassStroke, lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.4), radius: 10, x: 0, y: 5)
    }
}
