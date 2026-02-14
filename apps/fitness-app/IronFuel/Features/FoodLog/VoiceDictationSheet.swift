import SwiftUI

struct VoiceDictationSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var voiceService = VoiceWorkoutService() // Reusing voice service for now
    
    var onParsed: (String) -> Void
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 30) {
                Spacer()
                
                ZStack {
                    Circle().fill(voiceService.isRecording ? Color.ironError.opacity(0.2) : Color.ironPrimary.opacity(0.1)).frame(width: 120, height: 120)
                    Button {
                        if voiceService.isRecording { voiceService.stopRecording() }
                        else { try? voiceService.startRecording() }
                    } label: {
                        Image(systemName: voiceService.isRecording ? "stop.fill" : "mic.fill")
                            .font(.system(size: 44)).foregroundColor(voiceService.isRecording ? .ironError : .ironPrimary)
                    }
                }
                
                VStack(spacing: 12) {
                    Text(voiceService.isRecording ? "Listening..." : "Tap to Speak")
                        .font(.title3).fontWeight(.medium)
                    Text("e.g., 'I had 200g of chicken breast for lunch'")
                        .font(.subheadline).foregroundColor(.ironTextSecondary).multilineTextAlignment(.center).padding(.horizontal)
                }
                
                if !voiceService.transcibedText.isEmpty {
                    Text(voiceService.transcibedText).font(.body).italic().multilineTextAlignment(.center).padding().background(Color.ironCardBg).cornerRadius(12).padding(.horizontal)
                }
                
                Spacer()
                
                if !voiceService.transcibedText.isEmpty && !voiceService.isRecording {
                    Button { onParsed(voiceService.transcibedText); dismiss() } label: {
                        Text("Finish").ironPrimaryButton()
                    }.padding(.horizontal)
                }
            }
            .padding(.bottom, 30)
            .navigationTitle("Voice Logging")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color.ironBackground)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
        .onAppear { voiceService.requestAuthorization() }
    }
}
