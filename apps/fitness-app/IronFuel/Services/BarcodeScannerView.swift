import SwiftUI
import VisionKit
import AVFoundation

public struct BarcodeScannerView: UIViewControllerRepresentable {
    public var onBarcode: (String) -> Void
    public var onError: (Error) -> Void
    
    public init(onBarcode: @escaping (String) -> Void, onError: @escaping (Error) -> Void) {
        self.onBarcode = onBarcode
        self.onError = onError
    }
    
    public func makeUIViewController(context: Context) -> UIViewController {
        guard DataScannerViewController.isSupported, DataScannerViewController.isAvailable else {
            return UnsupportedScannerViewController()
        }
        
        let vc = DataScannerViewController(
            recognizedDataTypes: [.barcode()],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isHighFrameRateTrackingEnabled: true,
            isPinchToZoomEnabled: true,
            isGuidanceEnabled: true,
            isHighlightingEnabled: true
        )
        vc.delegate = context.coordinator
        try? vc.startScanning()
        return vc
    }
    
    public func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
    
    public static func dismantleUIViewController(_ uiViewController: UIViewController, coordinator: Coordinator) {
        if let vc = uiViewController as? DataScannerViewController {
            vc.stopScanning()
        }
    }
    
    public func makeCoordinator() -> Coordinator {
        Coordinator(onBarcode: onBarcode, onError: onError)
    }
    
    public final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        private let onBarcode: (String) -> Void
        private let onError: (Error) -> Void
        private var seen = Set<String>()
        
        init(onBarcode: @escaping (String) -> Void, onError: @escaping (Error) -> Void) {
            self.onBarcode = onBarcode
            self.onError = onError
        }
        
        public func dataScanner(_ dataScanner: DataScannerViewController, didTapOn item: RecognizedItem) {
            handle(item)
        }
        
        public func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
            for item in addedItems { handle(item) }
        }
        
        private func handle(_ item: RecognizedItem) {
            guard case let .barcode(barcode) = item, let payload = barcode.payloadStringValue else { return }
            if seen.contains(payload) { return }
            seen.insert(payload)
            onBarcode(payload)
        }
        
        public func dataScanner(_ dataScanner: DataScannerViewController, didFailWithError error: Error) {
            onError(error)
        }
    }
}

final class UnsupportedScannerViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        let label = UILabel()
        label.text = "Barcode scanning isn’t supported on this device."
        label.numberOfLines = 0
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            label.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }
}
