import SwiftUI

struct PrimaryButtonModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .font(.headline)
            .foregroundColor(.white)
            .padding()
            .frame(maxWidth: .infinity)
            .background(IronGradients.primary)
            .cornerRadius(Layout.cornerRadius)
            .shadow(color: .ironPrimary.opacity(0.5), radius: 8, x: 0, y: 4)
    }
}
