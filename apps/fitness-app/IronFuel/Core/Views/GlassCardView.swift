import SwiftUI

struct GlassCardView: View {
    let title: String
    let subtitle: String
    let caloriesLeft: Int
    let caloriesDetail: String
    let progress: Double
    let macroItems: [(label: String, amount: String, color: Color)]
    
    var body: some View {
        VStack(spacing: 20) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .foregroundColor(.ironTextPrimary)
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundColor(.ironTextSecondary)
                }
                Spacer()
                Image(systemName: "flame.fill")
                    .foregroundColor(.orange)
                    .font(.title2)
            }
            
            HStack(spacing: 30) {
                ZStack {
                    Circle()
                        .stroke(Color.ironCardDark, lineWidth: 10)
                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(
                            IronGradients.primary,
                            style: StrokeStyle(lineWidth: 10, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                    
                    VStack(spacing: 2) {
                        Text("\(caloriesLeft)")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundColor(.ironTextPrimary)
                        Text("Remaining")
                            .font(.caption2)
                            .foregroundColor(.ironTextSecondary)
                            .textCase(.uppercase)
                    }
                }
                .frame(width: 120, height: 120)
                
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(caloriesDetail)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.ironTextPrimary)
                        Text("Consumed / Budget")
                            .font(.caption2)
                            .foregroundColor(.ironTextSecondary)
                    }
                    
                    HStack(spacing: 15) {
                        ForEach(0..<macroItems.count, id: \.self) { index in
                            let item = macroItems[index]
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.amount)
                                    .font(.system(.subheadline, design: .rounded))
                                    .fontWeight(.bold)
                                    .foregroundColor(item.color)
                                Text(item.label)
                                    .font(.system(size: 10))
                                    .foregroundColor(.ironTextSecondary)
                                    .textCase(.uppercase)
                            }
                        }
                    }
                }
            }
        }
        .padding(Layout.padding)
        .ironGlassCard()
    }
}
