import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
        completion(SimpleEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
        let entry = SimpleEntry(date: Date())
        // Static widget - only refresh once per day
        let nextUpdate = Calendar.current.date(byAdding: .day, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Timeline Entry

struct SimpleEntry: TimelineEntry {
    let date: Date
}

// MARK: - Widget Views

struct VoiceToNotionWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            CircularWidgetView()
        case .accessoryRectangular:
            RectangularWidgetView()
        case .accessoryInline:
            InlineWidgetView()
        default:
            CircularWidgetView()
        }
    }
}

// Lock screen circular widget - microphone icon
struct CircularWidgetView: View {
    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            Image(systemName: "mic.fill")
                .font(.system(size: 24, weight: .medium))
        }
        .widgetAccentable()
    }
}

// Lock screen rectangular widget - mic with label
struct RectangularWidgetView: View {
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "mic.circle.fill")
                .font(.system(size: 36))
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Voice Note")
                    .font(.headline)
                Text("Tap to dictate")
                    .font(.caption)
                    .opacity(0.7)
            }
            
            Spacer()
        }
        .widgetAccentable()
    }
}

// Lock screen inline widget - text only
struct InlineWidgetView: View {
    var body: some View {
        Label("Voice Note", systemImage: "mic.fill")
    }
}

// MARK: - Widget Configuration

struct VoiceToNotionWidget: Widget {
    let kind: String = "VoiceToNotionWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            VoiceToNotionWidgetEntryView(entry: entry)
                .widgetURL(URL(string: "voicetonotion://dictate"))
        }
        .configurationDisplayName("Voice Note")
        .description("Quick access to dictate a voice note to Notion.")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}

// MARK: - Preview

#Preview(as: .accessoryCircular) {
    VoiceToNotionWidget()
} timeline: {
    SimpleEntry(date: .now)
}

#Preview(as: .accessoryRectangular) {
    VoiceToNotionWidget()
} timeline: {
    SimpleEntry(date: .now)
}
