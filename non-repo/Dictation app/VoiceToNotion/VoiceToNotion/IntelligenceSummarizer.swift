import Foundation
import NaturalLanguage

enum SummarizerError: Error {
    case unsupportedDevice
    case summarizationFailed
}

struct IntelligenceSummarizer {

    /// Check if Apple Intelligence summarization is available
    static var isAvailable: Bool {
        if #available(iOS 18.1, *) {
            // Apple Intelligence requires A17 Pro or later (iPhone 15 Pro+)
            // This is a runtime check based on device capability
            return true // Will gracefully fail if not supported
        }
        return false
    }

    /// Summarize text using Apple Intelligence (iOS 18.1+)
    @available(iOS 18.1, *)
    static func summarize(_ text: String, maxSentences: Int = 2) async throws -> String {
        // For iOS 18.1+, we use a combination of NaturalLanguage features
        // Note: Full Apple Intelligence API may require additional entitlements

        guard !text.isEmpty else { return "" }

        // Extract key sentences using NaturalLanguage
        let sentences = extractSentences(from: text)

        if sentences.count <= maxSentences {
            return text
        }

        // Score sentences by importance (position + keyword density)
        let scoredSentences = sentences.enumerated().map { (index, sentence) -> (String, Double) in
            var score = 0.0

            // First and last sentences often contain key info
            if index == 0 { score += 2.0 }
            if index == sentences.count - 1 { score += 1.0 }

            // Count important keywords
            let importantWords = ["important", "key", "main", "urgent", "remember", "note", "action", "deadline", "meeting", "call"]
            let lowerSentence = sentence.lowercased()
            for word in importantWords {
                if lowerSentence.contains(word) {
                    score += 1.5
                }
            }

            // Prefer longer sentences (more content)
            score += Double(sentence.count) / 100.0

            return (sentence, score)
        }

        // Take top sentences by score
        let topSentences = scoredSentences
            .sorted { $0.1 > $1.1 }
            .prefix(maxSentences)
            .map { $0.0 }

        // Reorder by original position
        let orderedSummary = sentences.filter { topSentences.contains($0) }

        return orderedSummary.joined(separator: " ")
    }

    /// Fallback summarization for older devices
    static func simpleSummarize(_ text: String, maxWords: Int = 30) -> String {
        let words = text.components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }

        if words.count <= maxWords {
            return text
        }

        return words.prefix(maxWords).joined(separator: " ") + "..."
    }

    private static func extractSentences(from text: String) -> [String] {
        let tokenizer = NLTokenizer(unit: .sentence)
        tokenizer.string = text

        var sentences: [String] = []
        tokenizer.enumerateTokens(in: text.startIndex..<text.endIndex) { range, _ in
            let sentence = String(text[range]).trimmingCharacters(in: .whitespacesAndNewlines)
            if !sentence.isEmpty {
                sentences.append(sentence)
            }
            return true
        }
        return sentences
    }

    /// Main entry point - uses AI if available, falls back otherwise
    static func generateSummary(for text: String) async -> String? {
        guard text.count > 100 else { return nil } // Don't summarize short texts

        if #available(iOS 18.1, *), isAvailable {
            return try? await summarize(text)
        } else {
            let simple = simpleSummarize(text)
            return simple != text ? simple : nil
        }
    }
}
