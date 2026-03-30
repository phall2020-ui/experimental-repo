import SwiftUI
import SwiftData

struct ActiveWorkoutView: View {
    @Bindable var session: WorkoutSession
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let onDelete: () -> Void

    @State private var showAddExercise = false
    @State private var showDeleteConfirmation = false
    @State private var isEditing = false
    @State private var voiceService = VoiceWorkoutService()
    @State private var selectedExerciseForVoice: WorkoutExercise?
    
    private var workoutDuration: String {
        let interval = Date().timeIntervalSince(session.startTime)
        let minutes = Int(interval / 60)
        let seconds = Int(interval) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
    
    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                ScrollView {
                    VStack(spacing: 16) {
                        workoutHeaderCard.padding(.horizontal)
                        VStack(spacing: 0) {
                            ForEach(session.exercises.sorted(by: { $0.orderIndex < $1.orderIndex })) { exercise in
                                exerciseCard(exercise: exercise)
                            }
                        }.padding(.horizontal)
                        
                        Button { showAddExercise = true } label: {
                            HStack {
                                Image(systemName: "plus.circle.fill").foregroundColor(.ironPrimary)
                                Text("Add Exercise").fontWeight(.medium).foregroundColor(.ironPrimary)
                            }.frame(maxWidth: .infinity).padding().ironGlassCard()
                        }.padding(.horizontal)
                        
                        if voiceService.isRecording || !voiceService.transcibedText.isEmpty {
                            voiceRecordingCard.padding(.horizontal)
                        }
                        
                        if let error = voiceService.errorMessage, !voiceService.isRecording {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill").foregroundColor(.ironWarning)
                                Text(error).font(.caption).foregroundColor(.ironTextSecondary)
                            }.padding().frame(maxWidth: .infinity).ironGlassCard().padding(.horizontal)
                        }
                        Spacer().frame(height: 120)
                    }.padding(.top, 8)
                }.background(Color.ironBackground)
                bottomActionBar
            }
            .navigationTitle("Workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button { showDeleteConfirmation = true } label: { Text("Cancel").foregroundColor(.ironError) }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(isEditing ? "Done" : "Edit") { withAnimation { isEditing.toggle() } }.foregroundColor(.ironPrimary)
                }
            }
            .sheet(isPresented: $showAddExercise) {
                ExerciseSelectionView { selectedExercise in addExercise(selectedExercise) }
            }
            .alert("Cancel Workout?", isPresented: $showDeleteConfirmation) {
                Button("Keep Workout", role: .cancel) { }
                Button("Delete", role: .destructive) { onDelete(); dismiss() }
            } message: { Text("This will delete the current workout. This action cannot be undone.") }
        }.onAppear { voiceService.requestAuthorization() }
    }
    
    private var workoutHeaderCard: some View {
        VStack(spacing: 12) {
            TextField("Workout Title", text: $session.title).font(.title2).fontWeight(.bold).multilineTextAlignment(.center).foregroundColor(.ironTextPrimary)
            HStack(spacing: 20) {
                HStack(spacing: 4) {
                    Image(systemName: "clock").foregroundColor(.ironPrimary)
                    Text(workoutDuration).font(.subheadline).monospacedDigit()
                }
                HStack(spacing: 4) {
                    Image(systemName: "dumbbell.fill").foregroundColor(.ironPrimary)
                    Text("\(session.exercises.count) exercises").font(.subheadline)
                }
                if let gym = session.gym {
                    HStack(spacing: 4) {
                        Image(systemName: "location.fill").foregroundColor(.ironSuccess)
                        Text(gym.name).font(.subheadline)
                    }
                }
            }.foregroundColor(.ironTextSecondary)
        }.padding().ironGlassCard()
    }
    
    private func exerciseCard(exercise: WorkoutExercise) -> some View {
        VStack(spacing: 0) {
            HStack {
                Text(exercise.exerciseName).font(.headline).foregroundColor(.ironPrimary)
                Spacer()
                Button { selectedExerciseForVoice = exercise; try? voiceService.startRecording() } label: {
                    Image(systemName: selectedExerciseForVoice?.id == exercise.id && voiceService.isRecording ? "waveform.circle.fill" : "mic.circle")
                        .foregroundColor(selectedExerciseForVoice?.id == exercise.id && voiceService.isRecording ? .ironError : .ironPrimary).font(.title3)
                }.disabled(voiceService.isRecording && selectedExerciseForVoice?.id != exercise.id)
                if isEditing {
                    Button { deleteExercise(exercise) } label: { Image(systemName: "trash").foregroundColor(.ironError) }
                }
            }.padding().background(Color.ironCardDark.opacity(0.8))
            
            VStack(spacing: 0) {
                HStack {
                    Text("SET").font(.caption2).foregroundColor(.ironTextSecondary).frame(width: 40)
                    Text("KG").font(.caption2).foregroundColor(.ironTextSecondary).frame(maxWidth: .infinity)
                    Text("REPS").font(.caption2).foregroundColor(.ironTextSecondary).frame(maxWidth: .infinity)
                    Image(systemName: "checkmark").font(.caption2).foregroundColor(.ironTextSecondary).frame(width: 44)
                    if isEditing { Spacer().frame(width: 44) }
                }.padding(.horizontal).padding(.vertical, 8).background(Color.ironCardDark.opacity(0.5))
                
                ForEach(exercise.sets.sorted(by: { $0.orderIndex < $1.orderIndex })) { set in
                    setRow(set: set, exercise: exercise)
                    Divider().overlay(Color.ironCardBg)
                }
                
                Button { addSet(to: exercise) } label: {
                    HStack { Image(systemName: "plus"); Text("Add Set") }.font(.subheadline).foregroundColor(.ironPrimary).frame(maxWidth: .infinity).padding(.vertical, 12)
                }.background(Color.ironCardDark.opacity(0.8))
            }
        }.cornerRadius(16).padding(.bottom, 12).background(Color.ironCardDark.opacity(0.8)).overlay(RoundedRectangle(cornerRadius: 16).stroke(IronGradients.glassStroke, lineWidth: 1))
    }
    
    private func setRow(set: ExerciseSet, exercise: WorkoutExercise) -> some View {
        HStack {
            Text("\(set.orderIndex + 1)").font(.subheadline).foregroundColor(.ironTextSecondary).frame(width: 40)
            TextField("0", value: Binding(get: { set.weight }, set: { set.weight = $0 }), format: .number)
                .keyboardType(.decimalPad).multilineTextAlignment(.center).font(.subheadline).padding(.vertical, 8).background(Color.ironCardBg).cornerRadius(8).frame(maxWidth: .infinity)
            TextField("0", value: Binding(get: { set.reps }, set: { set.reps = $0 }), format: .number)
                .keyboardType(.numberPad).multilineTextAlignment(.center).font(.subheadline).padding(.vertical, 8).background(Color.ironCardBg).cornerRadius(8).frame(maxWidth: .infinity)
            Button { set.isCompleted.toggle() } label: {
                Image(systemName: set.isCompleted ? "checkmark.circle.fill" : "circle").font(.title2).foregroundColor(set.isCompleted ? .ironSuccess : .ironTextSecondary)
            }.frame(width: 44)
            if isEditing {
                Button { deleteSet(set, from: exercise) } label: { Image(systemName: "minus.circle.fill").foregroundColor(.ironError) }.frame(width: 44)
            }
        }.padding(.horizontal).padding(.vertical, 8)
    }
    
    private var voiceRecordingCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                if voiceService.isRecording {
                    Image(systemName: "waveform.circle.fill").font(.title2).foregroundColor(.ironError).symbolEffect(.pulse)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Listening...").font(.subheadline)
                        if let selected = selectedExerciseForVoice { Text("For: \(selected.exerciseName)").font(.caption).foregroundColor(.ironPrimary) }
                    }
                } else {
                    Image(systemName: "checkmark.circle.fill").font(.title2).foregroundColor(.ironSuccess)
                    Text("Recorded").font(.subheadline)
                }
                Spacer()
                if voiceService.isRecording {
                    Button("Stop") { voiceService.stopRecording(); processVoiceCommand(voiceService.transcibedText) }.foregroundColor(.ironError)
                } else {
                    Button("Clear") { voiceService.transcibedText = ""; selectedExerciseForVoice = nil }.foregroundColor(.ironTextSecondary)
                }
            }
            if !voiceService.transcibedText.isEmpty {
                Text(voiceService.transcibedText).font(.body).italic().foregroundColor(.ironTextPrimary)
            }
        }.padding().ironGlassCard()
    }
    
    private var bottomActionBar: some View {
        VStack {
            Spacer()
            HStack(spacing: 16) {
                Button { try? voiceService.startRecording() } label: {
                    Image(systemName: voiceService.isRecording ? "waveform.circle.fill" : "mic.fill")
                        .font(.title2).foregroundColor(.white).padding().background(voiceService.isRecording ? Color.ironError : Color.ironPrimary).shadow(radius: 4).clipShape(Circle())
                }
                Button { session.endTime = Date(); dismiss() } label: {
                    Text("Finish Workout").font(.headline).foregroundColor(.white).frame(maxWidth: .infinity).padding().background(IronGradients.primary).cornerRadius(16).shadow(radius: 4)
                }
            }.padding().background(Color.ironBackground.opacity(0.8).background(.ultraThinMaterial))
        }
    }
    
    private func addExercise(_ baseExercise: Exercise) {
        let newExercise = WorkoutExercise(exerciseName: baseExercise.name, orderIndex: session.exercises.count)
        let ghostSets = TrainingManager.shared.getGhostSets(for: baseExercise.name, context: modelContext)
        newExercise.sets = ghostSets
        session.exercises.append(newExercise)
    }
    
    private func deleteExercise(_ exercise: WorkoutExercise) {
        if let index = session.exercises.firstIndex(where: { $0.id == exercise.id }) { session.exercises.remove(at: index) }
    }
    
    private func addSet(to exercise: WorkoutExercise) {
        let lastSet = exercise.sets.sorted(by: { $0.orderIndex < $1.orderIndex }).last
        let newSet = ExerciseSet(weight: lastSet?.weight ?? 45, reps: lastSet?.reps ?? 10, orderIndex: exercise.sets.count)
        exercise.sets.append(newSet)
    }
    
    private func deleteSet(_ set: ExerciseSet, from exercise: WorkoutExercise) {
        if let index = exercise.sets.firstIndex(where: { $0.id == set.id }) { exercise.sets.remove(at: index) }
    }
    
    private func processVoiceCommand(_ text: String) {
        guard let exercise = selectedExerciseForVoice else { return }
        
        if let parsed = voiceService.parseCommand(text) {
            let w = parsed.weight
            let r = parsed.reps
            
            if let lastSet = exercise.sets.sorted(by: { $0.orderIndex < $1.orderIndex }).last, !lastSet.isCompleted {
                lastSet.weight = w
                lastSet.reps = r
                lastSet.isCompleted = true
            } else {
                let newSet = ExerciseSet(weight: w, reps: r, orderIndex: exercise.sets.count)
                newSet.isCompleted = true
                exercise.sets.append(newSet)
            }
            voiceService.transcibedText = ""
            selectedExerciseForVoice = nil
        }
    }
}
