//
//  AIInsightCard.swift
//  IronFuel
//
//  A premium, Apple Intelligence-inspired card for the dashboard.
//

import SwiftUI

struct AIInsightCard: View {
    let insight: AIIntelligenceService.Insight
    
    @State private var appear = false
    @State private var shimmer = false
    
    var body: some View {
        ZStack {
            // iOS 18 inspired Mesh Gradient Background
            if #available(iOS 18.0, *) {
                MeshGradient(
                    width: 3,
                    height: 3,
                    points: [
                        [0, 0], [0.5, 0], [1, 0],
                        [0, 0.5], [appear ? 0.6 : 0.4, 0.5], [1, 0.5],
                        [0, 1], [0.5, 1], [1, 1]
                    ],
                    colors: [
                        .ironBackground, .ironBackground, .ironBackground,
                        .ironBackground, insight.color.opacity(0.3), .ironBackground,
                        .ironBackground, .ironBackground, .ironBackground
                    ]
                )
                .onAppear {
                    withAnimation(.easeInOut(duration: 4).repeatForever(autoreverses: true)) {
                        appear.toggle()
                    }
                }
            } else {
                Color.ironCardBg
            }
            
            // Glowing border
            RoundedRectangle(cornerRadius: Layout.cornerRadius)
                .stroke(
                    AngularGradient(
                        colors: [insight.color.opacity(0), insight.color.opacity(0.5), insight.color.opacity(0)],
                        center: .center,
                        angle: .degrees(shimmer ? 360 : 0)
                    ),
                    lineWidth: 2
                )
            
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Image(systemName: insight.icon)
                        .foregroundStyle(insight.color)
                        .font(.headline)
                        .symbolEffect(.bounce, value: shimmer)
                    
                    Text("Apple Intelligence")
                        .font(.caption2.bold())
                        .foregroundStyle(.secondary)
                        .kerning(1.2)
                        .textCase(.uppercase)
                    
                    Spacer()
                    
                    Circle()
                        .fill(insight.color)
                        .frame(width: 8, height: 8)
                        .blur(radius: 4)
                }
                
                Text(insight.title)
                    .font(.title3.bold())
                    .foregroundStyle(.white)
                
                Text(insight.message)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.8))
                    .lineLimit(3)
                    .fixedSize(horizontal: false, vertical: true)
                
                HStack {
                    Spacer()
                    Text("Live Analysis")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Image(systemName: "sparkles")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 4)
            }
            .padding(20)
        }
        .frame(height: 180)
        .clipShape(RoundedRectangle(cornerRadius: Layout.cornerRadius))
        .ironGlassCard()
        .onAppear {
            withAnimation(.linear(duration: 10).repeatForever(autoreverses: false)) {
                shimmer = true
            }
        }
    }
}

#Preview {
    AIInsightCard(insight: AIIntelligenceService.Insight(
        title: "Protein Optimization",
        message: "You're 40g away from your protein goal. A high-protein snack now would be perfect for muscle recovery.",
        color: .orange,
        icon: "sparkles",
        type: .nutrition
    ))
    .padding()
    .background(Color.ironBackground)
}
