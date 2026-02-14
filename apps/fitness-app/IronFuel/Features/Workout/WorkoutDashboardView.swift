import SwiftUI
import SwiftData

struct WorkoutDashboardView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \WorkoutSession.startTime, order: .reverse) private var workouts: [WorkoutSession]
    @Query private var gymLocations: [GymLocation]
    
    @State private var locManager = LocationManager()
    @State private var detectedGym: GymLocation?
    
    @State private var showActiveWorkout = false
    @State private var currentSession: WorkoutSession?
    @State private var showGymManagement = false
    
    private var todaysWorkouts: [WorkoutSession] {
        workouts.filter { Calendar.current.isDateInToday($0.startTime) }
    }
    
    private var totalExercisesToday: Int {
        todaysWorkouts.reduce(0) { $0 + $1.exercises.count }
    }
    
    private var totalSetsToday: Int {
        todaysWorkouts.reduce(0) { workout, session in
            workout + session.exercises.reduce(0) { $0 + $1.sets.count }
        }
    }
    
    private var workoutDurationToday: Int {
        todaysWorkouts.reduce(0) { total, workout in
            let duration = workout.endTime?.timeIntervalSince(workout.startTime) ?? 0
            return total + Int(duration / 60)
        }
    }
    
    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                ScrollView {
                    VStack(spacing: 16) {
                        todayProgressCard.padding(.horizontal)
                        HStack(spacing: 12) {
                            quickStatCard(icon: "dumbbell.fill", value: "\(totalExercisesToday)", label: "Exercises", color: .purple)
                            quickStatCard(icon: "repeat", value: "\(totalSetsToday)", label: "Sets", color: .blue)
                        }
                        .padding(.horizontal)
                        gymLocationCard.padding(.horizontal)
                        recentWorkoutsSection.padding(.horizontal)
                        Spacer().frame(height: 100)
                    }
                    .padding(.top, 8)
                }
                .background(Color.ironBackground)
                floatingStartButton
            }
            .navigationTitle("Lift")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { showGymManagement = true } label: {
                        Image(systemName: "location.circle").foregroundColor(.ironPrimary)
                    }
                }
            }
            .fullScreenCover(item: $currentSession) { session in
                ActiveWorkoutView(session: session, onDelete: { deleteWorkout(session) })
            }
            .sheet(isPresented: $showGymManagement) { GymManagementView() }
            .onAppear { setupLocation() }
        }
    }
    
    private var todayProgressCard: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Today's Workout").font(.subheadline).foregroundColor(.ironTextSecondary)
                    Text(todaysWorkouts.isEmpty ? "No workouts yet" : "\(todaysWorkouts.count) session\(todaysWorkouts.count == 1 ? "" : "s")")
                        .font(.title2).fontWeight(.bold).foregroundColor(.ironTextPrimary)
                }
                Spacer()
                ZStack {
                    Circle().stroke(Color.ironCardDark, lineWidth: 6)
                    Circle().trim(from: 0, to: min(Double(workoutDurationToday) / 60.0, 1.0))
                        .stroke(IronGradients.primary, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    VStack(spacing: 0) {
                        Text("\(workoutDurationToday)").font(.title3).fontWeight(.bold)
                        Text("min").font(.caption2).foregroundColor(.ironTextSecondary)
                    }
                }.frame(width: 70, height: 70)
            }
            if !todaysWorkouts.isEmpty {
                Button { if let last = todaysWorkouts.first { currentSession = last } } label: {
                    HStack {
                        Text("Great work! Keep pushing! 💪").font(.subheadline).foregroundColor(.ironTextSecondary)
                        Spacer()
                        Image(systemName: "chevron.right").font(.caption).foregroundColor(.ironTextSecondary)
                    }
                }
            }
        }.padding().ironGlassCard()
    }
    
    private func quickStatCard(icon: String, value: String, label: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: icon).foregroundColor(color)
                Text(value).font(.title2).fontWeight(.bold).foregroundColor(.ironTextPrimary)
            }
            Text(label).font(.caption).foregroundColor(.ironTextSecondary)
        }.padding().frame(maxWidth: .infinity, alignment: .leading).ironGlassCard()
    }
    
    private var gymLocationCard: some View {
        Button { showGymManagement = true } label: {
            HStack(spacing: 12) {
                Image(systemName: detectedGym != nil ? "location.fill" : "location.circle")
                    .font(.title2).foregroundColor(detectedGym != nil ? .ironSuccess : .ironTextSecondary)
                VStack(alignment: .leading, spacing: 2) {
                    if let gym = detectedGym {
                        Text("At \(gym.name)").font(.subheadline).fontWeight(.medium).foregroundColor(.ironTextPrimary)
                        Text("Auto-detected").font(.caption).foregroundColor(.ironSuccess)
                    } else {
                        Text("No gym detected").font(.subheadline).foregroundColor(.ironTextPrimary)
                        Text("Tap to manage locations").font(.caption).foregroundColor(.ironTextSecondary)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right").font(.caption).foregroundColor(.ironTextSecondary)
            }.padding().ironGlassCard()
        }
    }
    
    private var recentWorkoutsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Workouts").font(.headline).foregroundColor(.ironTextPrimary)
                Spacer()
                if workouts.count > 5 {
                    NavigationLink(destination: WorkoutHistoryListView()) {
                        Text("See All").font(.subheadline).foregroundColor(.ironPrimary)
                    }
                }
            }
            if workouts.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "dumbbell").font(.system(size: 40)).foregroundColor(.ironTextSecondary.opacity(0.5))
                    Text("No workouts yet").font(.subheadline).foregroundColor(.ironTextSecondary)
                    Text("Start your first workout to track your gains!").font(.caption).foregroundColor(.ironTextSecondary).multilineTextAlignment(.center)
                }.frame(maxWidth: .infinity).padding(.vertical, 30).ironGlassCard()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(workouts.prefix(5).enumerated()), id: \.element.id) { index, workout in
                        NavigationLink(destination: WorkoutDetailView(workout: workout)) {
                            workoutRow(workout: workout)
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button(role: .destructive) { deleteWorkout(workout) } label: { Label("Delete", systemImage: "trash") }
                        }
                        if index < min(workouts.count - 1, 4) { Divider().padding(.leading, 50) }
                    }
                }.ironGlassCard()
            }
        }
    }
    
    private func workoutRow(workout: WorkoutSession) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(Color.ironPrimary.opacity(0.15)).frame(width: 40, height: 40)
                Image(systemName: "dumbbell.fill").foregroundColor(.ironPrimary)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(workout.title).font(.subheadline).fontWeight(.medium).foregroundColor(.ironTextPrimary)
                HStack(spacing: 8) {
                    Text("\(workout.exercises.count) exercises").font(.caption).foregroundColor(.ironTextSecondary)
                    if let gym = workout.gym { Text("• \(gym.name)").font(.caption).foregroundColor(.ironPrimary) }
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(workout.startTime.formatted(date: .abbreviated, time: .omitted)).font(.caption).foregroundColor(.ironTextSecondary)
                if let endTime = workout.endTime {
                    let duration = Int(endTime.timeIntervalSince(workout.startTime) / 60)
                    Text("\(duration) min").font(.caption2).foregroundColor(.ironTextSecondary)
                }
            }
            Image(systemName: "chevron.right").font(.caption).foregroundColor(.ironTextSecondary)
        }.padding()
    }
    
    private var floatingStartButton: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                Button { startNewWorkout() } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "plus").font(.title3.bold())
                        Text("Start Workout").font(.headline)
                    }.foregroundColor(.white).padding(.horizontal, 20).padding(.vertical, 14).background(Capsule().fill(IronGradients.primary).shadow(color: .ironPrimary.opacity(0.3), radius: 8, x: 0, y: 4))
                }.padding(.trailing, 20).padding(.bottom, 20)
            }
        }
    }
    
    func startNewWorkout() {
        let newSession = WorkoutSession(startTime: Date(), title: "New Workout")
        newSession.gym = detectedGym
        modelContext.insert(newSession)
        try? modelContext.save()
        currentSession = newSession
    }
    
    func deleteWorkout(_ workout: WorkoutSession) {
        modelContext.delete(workout)
        try? modelContext.save()
        currentSession = nil
    }
    
    func setupLocation() {
        locManager.requestPermission()
        locManager.getCurrentLocation { loc in
            if loc != nil { self.detectedGym = locManager.detectGym(from: gymLocations) }
        }
    }
}
