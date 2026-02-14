import SwiftUI
import SwiftData

@main
struct IronFuelApp: App {
    var container: ModelContainer = {
        let schema = Schema([
            UserProfile.self,
            WeightLog.self,
            FoodItem.self,
            FoodLog.self,
            WorkoutSession.self,
            WorkoutExercise.self,
            ExerciseSet.self,
            FoodProduct.self,
            UserFoodDefault.self,
            GymLocation.self,
            Exercise.self,
            DailyConfirmation.self
        ])
        return try! ModelContainer(for: schema)
    }()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onAppear {
                    let context = container.mainContext
                    CheatMealDatabase.seedDatabase(context: context)
                    SeedData.seedAll(context: context)
                }
                .onOpenURL { url in
                    handleDeepLink(url)
                }
        }
        .modelContainer(container)
    }
    
    private func handleDeepLink(_ url: URL) {
        print("Deep link received: \(url)")
    }
}

struct ContentView: View {
    @State private var selectedTab: Int = 0
    
    init() {
        // App-wide appearance customization
        let appearance = UITabBarAppearance()
        appearance.configureWithDefaultBackground()
        appearance.backgroundColor = UIColor(Color.ironBackground)
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
    
    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView(selectedTab: $selectedTab)
                .tabItem { Label("Dashboard", systemImage: "house.fill") }
                .tag(0)
            
            WorkoutDashboardView()
                .tabItem { Label("Lift", systemImage: "dumbbell.fill") }
                .tag(1)
            
            FoodLogView()
                .tabItem { Label("Nutrition", systemImage: "fork.knife.circle.fill") }
                .tag(2)
            
            InsightsView()
                .tabItem { Label("Insights", systemImage: "chart.bar.fill") }
                .tag(3)
        }
        .accentColor(.ironPrimary)
    }
}
