import AVFoundation
import SwiftUI

@MainActor
final class CameraPermission: ObservableObject {
    @Published var authorised: Bool = false
    @Published var denied: Bool = false
    
    func refresh() {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        authorised = (status == .authorized)
        denied = (status == .denied || status == .restricted)
    }
    
    func request() async {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        switch status {
        case .authorized:
            refresh()
        case .notDetermined:
            let granted = await AVCaptureDevice.requestAccess(for: .video)
            authorised = granted
            denied = !granted
        case .denied, .restricted:
            refresh()
        @unknown default:
            refresh()
        }
    }
}
