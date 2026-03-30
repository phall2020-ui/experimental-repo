import SwiftUI
import SwiftData

struct FoodLogView: View {
    @Environment(\.modelContext) private var modelContext
    
    @State private var selectedDate: Date = Calendar.current.startOfDay(for: Date())
    @State private var weekDates: [Date] = []
    
    @StateObject private var cameraPermission = CameraPermission()
    @State private var showingScanSheet = false
    @State private var showCameraDeniedAlert = false
    
    @State private var showQuickAddMenu = false
    @State private var selectedMealForAdd: MealCategory = .breakfast
    
    @State private var showLogFoodSheet: Bool = false
    @State private var showCheatMeals: Bool = false
    @State private var showQuickAddSheet: Bool = false
    @State private var showVoiceLogging: Bool = false
    @State private var showMealScan: Bool = false
    
    @State private var collapsedSections: Set<MealCategory> = []
    
    @Query(sort: \FoodLog.timestamp, order: .reverse) private var foodLogs: [FoodLog]
    @Query private var profiles: [UserProfile]
    
    private var profile: UserProfile? { profiles.first }
    
    private var calorieGoal: Int {
        guard let profile = profile else { return 2060 }
        return NutritionManager.shared.calculateCaloricTarget(profile: profile)
    }
    
    private var proteinGoal: Int { profile?.proteinGoal ?? 150 }
    
    private var dailyLogs: [FoodLog] {
        foodLogs.filter { Calendar.current.isDate($0.timestamp, inSameDayAs: selectedDate) }
    }
    
    private var totalCalories: Int { dailyLogs.reduce(0) { $0 + $1.calories } }
    private var totalProtein: Double { dailyLogs.reduce(0) { $0 + $1.protein } }
    private var totalCarbs: Double { dailyLogs.reduce(0) { $0 + $1.carbs } }
    private var totalFats: Double { dailyLogs.reduce(0) { $0 + $1.fats } }
    
    private func logsFor(meal: MealCategory) -> [FoodLog] {
        dailyLogs.filter { $0.category == meal }
    }
    
    private func caloriesFor(meal: MealCategory) -> Int {
        logsFor(meal: meal).reduce(0) { $0 + $1.calories }
    }
    
    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                ScrollView {
                    VStack(spacing: 0) {
                        weekDaySelector.padding(.horizontal).padding(.top, 8)
                        calorieSummaryCard.padding(.horizontal).padding(.top, 16)
                        
                        VStack(spacing: 0) {
                            ForEach(MealCategory.allCases, id: \.self) { meal in
                                mealSection(for: meal)
                            }
                        }.padding(.top, 16)
                        
                        NavigationLink(destination: FoodHistoryView()) {
                            Text("View all").font(.subheadline).foregroundColor(.ironPrimary)
                        }.padding(.vertical, 16)
                        
                        Spacer().frame(height: 100)
                    }
                }.background(Color.ironBackground)
                floatingAddButton
            }
            .navigationTitle("Today")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Text("\(max(0, calorieGoal - totalCalories))").font(.headline).foregroundColor(.ironTextPrimary)
                }
            }
            .onAppear { setupWeekDates() }
            .sheet(isPresented: $showingScanSheet) { FoodScanSheet(selectedMealCategory: selectedMealForAdd) { } }
            .sheet(isPresented: $showQuickAddSheet) { QuickAddFoodSheet(mealCategory: selectedMealForAdd, selectedDate: selectedDate) }
            .sheet(isPresented: $showCheatMeals) { CheatMealsView(mealCategory: selectedMealForAdd) { _ in } }
            .sheet(isPresented: $showVoiceLogging) { VoiceDictationSheet { handleVoiceResult($0) } }
            .alert("Camera permission needed", isPresented: $showCameraDeniedAlert) {
                Button("OK", role: .cancel) {}
                Button("Open Settings") { if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) } }
            } message: { Text("Enable camera access in Settings to scan barcodes.") }
        }
    }
    
    private var weekDaySelector: some View {
        HStack(spacing: 0) {
            ForEach(weekDates, id: \.self) { date in
                let isSelected = Calendar.current.isDate(date, inSameDayAs: selectedDate)
                let hasLogs = foodLogs.contains { Calendar.current.isDate($0.timestamp, inSameDayAs: date) }
                let isToday = Calendar.current.isDateInToday(date)
                
                Button { withAnimation { selectedDate = date } } label: {
                    VStack(spacing: 6) {
                        Text(date.formatted(.dateTime.weekday(.narrow))).font(.caption2).foregroundColor(isSelected ? .ironTextPrimary : .ironTextSecondary)
                        ZStack {
                            if hasLogs {
                                Circle().fill(Color.ironPrimary).frame(width: 28, height: 28)
                                Image(systemName: "checkmark").font(.caption2.bold()).foregroundColor(.white)
                            } else if isToday {
                                Circle().strokeBorder(Color.ironTextSecondary.opacity(0.3), lineWidth: 1).frame(width: 28, height: 28)
                                Circle().fill(Color.ironPrimary).frame(width: 6, height: 6)
                            } else {
                                Circle().strokeBorder(Color.ironTextSecondary.opacity(0.3), lineWidth: 1).frame(width: 28, height: 28)
                            }
                        }
                    }
                }.frame(maxWidth: .infinity)
            }
        }.padding(.vertical, 12)
    }
    
    private var calorieSummaryCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                Text("Calories").font(.subheadline).foregroundColor(.ironTextSecondary)
                Spacer()
                Text("\(totalCalories) cal").font(.title2).fontWeight(.bold).foregroundColor(.ironTextPrimary)
                Text("/ \(calorieGoal)").font(.subheadline).foregroundColor(.ironTextSecondary)
            }
            VStack(alignment: .leading, spacing: 8) {
                Text("Macros").font(.subheadline).foregroundColor(.ironTextSecondary)
                HStack(spacing: 24) {
                    macroItem(value: Int(totalCarbs), label: "Carbs", color: .blue)
                    macroItem(value: Int(totalFats), label: "Fat", color: .pink)
                    macroItem(value: Int(totalProtein), label: "Protein", color: .orange)
                }
            }
        }.padding(16).ironGlassCard()
    }
    
    private func macroItem(value: Int, label: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Text("\(value)g").font(.headline).foregroundColor(.ironTextPrimary)
                Circle().fill(color).frame(width: 8, height: 8)
            }
            Text(label).font(.caption).foregroundColor(.ironTextSecondary)
        }
    }
    
    private func mealSection(for meal: MealCategory) -> some View {
        let isCollapsed = collapsedSections.contains(meal)
        let logs = logsFor(meal: meal)
        let calories = caloriesFor(meal: meal)
        
        return VStack(spacing: 0) {
            Button { withAnimation { if isCollapsed { collapsedSections.remove(meal) } else { collapsedSections.insert(meal) } } } label: {
                HStack(spacing: 12) {
                    mealIcon(for: meal).font(.title3).foregroundColor(.ironPrimary)
                    Text(meal.rawValue.capitalized).font(.headline).foregroundColor(.ironTextPrimary)
                    if calories > 0 { Text("\(calories) cal").font(.subheadline).foregroundColor(.ironTextSecondary) }
                    Spacer()
                    Button { selectedMealForAdd = meal; showQuickAddSheet = true } label: {
                        Text("Add").font(.subheadline).fontWeight(.medium).foregroundColor(.ironPrimary)
                    }
                }.padding().background(Color.ironCardDark.opacity(0.8))
            }
            if !isCollapsed && !logs.isEmpty {
                VStack(spacing: 0) {
                    ForEach(logs) { log in
                        NavigationLink(destination: EditFoodLogSheet(foodLog: log)) {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(log.foodName).font(.subheadline).foregroundColor(.ironTextPrimary)
                                    Text("\(Int(log.servingSize))g").font(.caption).foregroundColor(.ironTextSecondary)
                                }
                                Spacer()
                                VStack(alignment: .trailing, spacing: 2) {
                                    Text("\(log.calories) kcal").font(.subheadline).foregroundColor(.ironTextPrimary)
                                    Text("P:\(Int(log.protein)) C:\(Int(log.carbs)) F:\(Int(log.fats))").font(.caption).foregroundColor(.ironTextSecondary)
                                }
                            }.padding().background(Color.white.opacity(0.05))
                        }
                        Divider().overlay(Color.ironCardBg)
                    }
                }
            }
        }.cornerRadius(12).padding(.horizontal).padding(.bottom, 8)
    }
    
    private func mealIcon(for meal: MealCategory) -> Image {
        switch meal {
        case .breakfast: return Image(systemName: "sun.horizon.fill")
        case .lunch: return Image(systemName: "sun.max.fill")
        case .dinner: return Image(systemName: "moon.stars.fill")
        case .snack: return Image(systemName: "leaf.fill")
        }
    }
    
    private var floatingAddButton: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                Menu {
                    Button { selectedMealForAdd = .snack; showingScanSheet = true } label: { Label("Scan Barcode", systemImage: "barcode.viewfinder") }
                    Button { selectedMealForAdd = .snack; showQuickAddSheet = true } label: { Label("Quick Add", systemImage: "plus.circle") }
                    Button { selectedMealForAdd = .snack; showCheatMeals = true } label: { Label("Cheat Meals", systemImage: "flame") }
                    Button { showVoiceLogging = true } label: { Label("Voice Log", systemImage: "mic.fill") }
                } label: {
                    Image(systemName: "plus.circle.fill").font(.system(size: 56)).foregroundColor(.ironPrimary).background(Circle().fill(Color.white)).shadow(radius: 8)
                }.padding(.trailing, 20).padding(.bottom, 20)
            }
        }
    }
    
    private func setupWeekDates() {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        weekDates = (0..<7).compactMap { calendar.date(byAdding: .day, value: -$0, to: today) }.reversed()
    }
    
    private func handleVoiceResult(_ result: String) {
        // Implementation for parsing voice result and adding to logs
    }
}
