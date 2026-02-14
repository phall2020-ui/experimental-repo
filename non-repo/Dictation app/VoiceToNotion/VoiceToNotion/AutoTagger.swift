import Foundation
import NaturalLanguage

struct AutoTagger {

    // Keyword-based tag mapping
    static let keywordMap: [String: String] = [
        "meeting": "Meeting",
        "meet": "Meeting",
        "call": "Call",
        "phone": "Call",
        "todo": "Action Item",
        "to-do": "Action Item",
        "task": "Action Item",
        "reminder": "Reminder",
        "remind": "Reminder",
        "idea": "Idea",
        "thought": "Idea",
        "urgent": "Urgent",
        "important": "Urgent",
        "asap": "Urgent",
        "email": "Email",
        "send": "Email",
        "project": "Project",
        "deadline": "Deadline",
        "due": "Deadline",
        "question": "Question",
        "ask": "Question",
        "buy": "Shopping",
        "purchase": "Shopping",
        "note": "Note",
        "remember": "Note"
    ]

    static func extractKeywordTags(from transcript: String) -> [String] {
        let words = transcript.lowercased()
            .components(separatedBy: .alphanumerics.inverted)
            .filter { !$0.isEmpty }

        var tags = Set<String>()
        for word in words {
            if let tag = keywordMap[word] {
                tags.insert(tag)
            }
        }
        return Array(tags).sorted()
    }

    @available(iOS 18.1, *)
    static func inferTags(from transcript: String) async -> [String] {
        var tags = Set<String>()

        // Use NaturalLanguage framework for sentiment/topic detection
        let tagger = NLTagger(tagSchemes: [.sentimentScore, .lexicalClass])
        tagger.string = transcript

        // Detect sentiment
        if let sentimentTag = tagger.tag(at: transcript.startIndex, unit: .paragraph, scheme: .sentimentScore).0 {
            if let score = Double(sentimentTag.rawValue) {
                if score > 0.5 {
                    tags.insert("Positive")
                } else if score < -0.5 {
                    tags.insert("Concern")
                }
            }
        }

        // Count nouns and verbs to infer type
        var nounCount = 0
        var verbCount = 0
        tagger.enumerateTags(in: transcript.startIndex..<transcript.endIndex, unit: .word, scheme: .lexicalClass) { tag, _ in
            if tag == .noun { nounCount += 1 }
            if tag == .verb { verbCount += 1 }
            return true
        }

        if verbCount > nounCount * 2 {
            tags.insert("Action-Oriented")
        }

        // Check for question patterns
        if transcript.contains("?") || transcript.lowercased().hasPrefix("what") ||
           transcript.lowercased().hasPrefix("how") || transcript.lowercased().hasPrefix("why") {
            tags.insert("Question")
        }

        // Check for future tense patterns (simple heuristic)
        let futureWords = ["will", "going to", "plan to", "need to", "should", "must"]
        if futureWords.contains(where: { transcript.lowercased().contains($0) }) {
            tags.insert("Future Task")
        }

        return Array(tags).sorted()
    }

    static func getAllTags(from transcript: String) async -> [String] {
        var tags = Set(extractKeywordTags(from: transcript))

        if #available(iOS 18.1, *) {
            let aiTags = await inferTags(from: transcript)
            tags.formUnion(aiTags)
        }

        return Array(tags).sorted()
    }
}
