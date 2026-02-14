import SwiftUI
import SwiftData

struct FoodScanSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    let selectedMealCategory: MealCategory
    let onLogged: () -> Void
    
    @StateObject private var vm: FoodScanViewModel
    
    init(selectedMealCategory: MealCategory, onLogged: @escaping () -> Void) {
        self.selectedMealCategory = selectedMealCategory
        self.onLogged = onLogged
        
        let directClient = OpenFoodFactsDirectClient()
        let lookupService = FoodLookupService(cache: directClient, backend: directClient)
        _vm = StateObject(wrappedValue: FoodScanViewModel(lookupService: lookupService))
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                Text(title).font(.headline).foregroundColor(.ironTextPrimary)
                
                BarcodeScannerView(
                    onBarcode: { code in vm.handleScannedBarcode(code) },
                    onError: { err in vm.reset(); print("Scanner error: \(err)") }
                )
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding()
                
                statusView.padding(.bottom)
                Spacer()
            }
            .navigationTitle("Scan Barcode")
            .background(Color.ironBackground)
            .toolbar { ToolbarItem(placement: .topBarLeading) { Button("Close") { dismiss() }.foregroundColor(.ironPrimary) } }
        }
    }
    
    @ViewBuilder
    private var statusView: some View {
        switch vm.state {
        case .lookingUp:
            ProgressView("Looking up…").foregroundColor(.ironTextSecondary)
        case .found(let name, let brand):
            VStack(spacing: 12) {
                VStack(spacing: 4) {
                    Text("Found").font(.subheadline).foregroundColor(.ironTextSecondary)
                    Text("\(name)\(brand.map { " (\($0))" } ?? "")").font(.title3).fontWeight(.bold).multilineTextAlignment(.center).foregroundColor(.ironTextPrimary)
                }
                Button {
                    guard let product = vm.lastOutcome?.product else { return }
                    log(product: product)
                } label: {
                    Label("Log this food", systemImage: "plus.circle.fill").ironPrimaryButton()
                }.padding(.horizontal)
            }
        case .notFound:
            VStack(spacing: 8) {
                Text("Not found").font(.headline).foregroundColor(.ironError)
                Text("This barcode isn’t in our database yet.").font(.subheadline).foregroundColor(.ironTextSecondary)
            }
        case .error(let message):
            Text(message).foregroundColor(.ironError)
        default:
            EmptyView()
        }
    }
    
    private var title: String {
        switch vm.state {
        case .idle, .scanning: return "Scan a barcode"
        case .lookingUp: return "Looking up…"
        case .found: return "Product found"
        case .notFound: return "Barcode not found"
        case .error: return "Error"
        }
    }
    
    private func log(product: FoodProductDTO) {
        let servingG = product.servingSizeG ?? 100
        let n = product.nutrients ?? FoodNutrients()
        let factor = servingG / 100.0
        
        let entry = FoodLog(
            timestamp: Date(),
            foodName: product.name,
            servingSize: servingG,
            calories: Int(((n.kcalPer100g ?? 0) * factor).rounded()),
            protein: (n.proteinPer100g ?? 0) * factor,
            carbs: (n.carbsPer100g ?? 0) * factor,
            fats: (n.fatPer100g ?? 0) * factor,
            category: selectedMealCategory
        )
        
        modelContext.insert(entry)
        try? modelContext.save()
        onLogged()
        dismiss()
    }
}
