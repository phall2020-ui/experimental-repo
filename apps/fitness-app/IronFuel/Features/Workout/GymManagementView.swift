import SwiftUI
import SwiftData

struct GymManagementView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query private var gyms: [GymLocation]
    
    @State private var showAddGym = false
    @State private var newGymName = ""
    @StateObject private var locManager = LocationManager()
    
    var body: some View {
        NavigationStack {
            List {
                Section("Saved Locations") {
                    ForEach(gyms) { gym in
                        VStack(alignment: .leading) {
                            Text(gym.name).font(.headline).foregroundColor(.ironTextPrimary)
                            Text("\(gym.latitude, specifier: "%.4f"), \(gym.longitude, specifier: "%.4f")").font(.caption).foregroundColor(.ironTextSecondary)
                        }
                    }.onDelete(perform: deleteGyms)
                }
                
                Section {
                    Button {
                        locManager.getCurrentLocation { loc in
                            if let l = loc {
                                let newGym = GymLocation(name: "Current Location", latitude: l.coordinate.latitude, longitude: l.coordinate.longitude)
                                modelContext.insert(newGym)
                            }
                        }
                    } label: {
                        HStack {
                            Image(systemName: "location.fill")
                            Text("Add Current Location")
                        }.foregroundColor(.ironPrimary)
                    }
                }
            }
            .navigationTitle("Gym Locations")
            .background(Color.ironBackground)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
                ToolbarItem(placement: .primaryAction) { Button { showAddGym = true } label: { Image(systemName: "plus") } }
            }
            .alert("Add Gym", isPresented: $showAddGym) {
                TextField("Gym Name", text: $newGymName)
                Button("Cancel", role: .cancel) { }
                Button("Add") {
                    locManager.getCurrentLocation { loc in
                        if let l = loc {
                            let gym = GymLocation(name: newGymName, latitude: l.coordinate.latitude, longitude: l.coordinate.longitude)
                            modelContext.insert(gym)
                            newGymName = ""
                        }
                    }
                }
            }
        }
    }
    
    private func deleteGyms(at offsets: IndexSet) {
        for index in offsets { modelContext.delete(gyms[index]) }
    }
}
