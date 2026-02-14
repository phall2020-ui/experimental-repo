import Foundation
import NaturalLanguage

/// Extracts action items and due dates from text using NaturalLanguage framework
struct ActionExtractor {
    
    // MARK: - Action Patterns
    
    /// Verb phrases that indicate an action item
    private static let actionPhrases = [
        "need to", "have to", "should", "must", "will", "going to",
        "want to", "plan to", "remember to", "don't forget to",
        "make sure to", "be sure to", "try to"
    ]
    
    /// Action verbs that often start tasks
    private static let actionVerbs = [
        "call", "email", "send", "buy", "schedule", "complete", "finish",
        "submit", "review", "prepare", "create", "update", "fix", "check",
        "contact", "meet", "write", "book", "order", "cancel", "confirm",
        "follow up", "reply", "respond", "pay", "sign", "deliver", "pick up"
    ]
    
    // MARK: - Date Patterns
    
    /// Relative date keywords for manual parsing when NSDataDetector misses them
    private static let relativeDateKeywords: [(pattern: String, daysOffset: Int)] = [
        ("today", 0),
        ("tonight", 0),
        ("tomorrow", 1),
        ("day after tomorrow", 2),
        ("next week", 7),
        ("in a week", 7),
        ("next month", 30),
        ("in a month", 30)
    ]
    
    // MARK: - Action Extraction
    
    /// Extract action items from transcript using NLP analysis
    /// - Parameter transcript: The voice note transcript
    /// - Returns: A combined string of extracted actions, or nil if none found
    static func extractActions(from transcript: String) async -> String? {
        guard !transcript.isEmpty else { return nil }
        
        var actions: [String] = []
        let lowerTranscript = transcript.lowercased()
        
        // 1. Find sentences containing action phrases
        let sentences = extractSentences(from: transcript)
        
        for sentence in sentences {
            let lowerSentence = sentence.lowercased()
            
            // Check for action phrase patterns
            for phrase in actionPhrases {
                if lowerSentence.contains(phrase) {
                    // Extract the part after the action phrase
                    if let range = lowerSentence.range(of: phrase) {
                        let startIndex = transcript.index(transcript.startIndex, offsetBy: lowerTranscript.distance(from: lowerTranscript.startIndex, to: range.lowerBound))
                        let remaining = String(transcript[startIndex...]).trimmingCharacters(in: .whitespacesAndNewlines)
                        
                        // Clean up and format
                        let action = cleanAction(remaining)
                        if !action.isEmpty && action.count > 3 {
                            actions.append(action)
                        }
                    }
                    break
                }
            }
            
            // Check for sentences starting with action verbs (imperative mood)
            let firstWord = lowerSentence.components(separatedBy: .whitespaces).first ?? ""
            if actionVerbs.contains(where: { firstWord.hasPrefix($0) }) {
                let action = cleanAction(sentence)
                if !action.isEmpty && !actions.contains(action) {
                    actions.append(action)
                }
            }
        }
        
        // 2. Use NaturalLanguage to find verb phrases
        if #available(iOS 18.1, *) {
            let nlActions = await extractActionsWithNL(from: transcript)
            for action in nlActions {
                if !actions.contains(action) {
                    actions.append(action)
                }
            }
        }
        
        // Return combined actions or nil
        guard !actions.isEmpty else { return nil }
        return actions.joined(separator: "; ")
    }
    
    /// Use NaturalLanguage framework for deeper analysis
    @available(iOS 18.1, *)
    private static func extractActionsWithNL(from text: String) async -> [String] {
        var actions: [String] = []
        
        let tagger = NLTagger(tagSchemes: [.lexicalClass, .lemma])
        tagger.string = text
        
        var currentAction: [String] = []
        var foundVerb = false
        
        tagger.enumerateTags(in: text.startIndex..<text.endIndex, unit: .word, scheme: .lexicalClass) { tag, range in
            let word = String(text[range])
            
            if tag == .verb {
                // Check if this is an action verb
                let lemma = tagger.tag(at: range.lowerBound, unit: .word, scheme: .lemma).0?.rawValue ?? word.lowercased()
                if actionVerbs.contains(lemma) || actionVerbs.contains(word.lowercased()) {
                    foundVerb = true
                    currentAction = [word]
                }
            } else if foundVerb {
                // Continue building the action phrase
                if tag == .noun || tag == .determiner || tag == .adjective || tag == .preposition {
                    currentAction.append(word)
                } else if tag == .punctuation || currentAction.count > 8 {
                    // End of phrase
                    if currentAction.count > 1 {
                        actions.append(currentAction.joined(separator: " "))
                    }
                    currentAction = []
                    foundVerb = false
                }
            }
            
            return true
        }
        
        // Don't forget the last action if any
        if currentAction.count > 1 {
            actions.append(currentAction.joined(separator: " "))
        }
        
        return actions
    }
    
    // MARK: - Due Date Extraction
    
    /// Extract due date from transcript using NSDataDetector and pattern matching
    /// - Parameter transcript: The voice note transcript
    /// - Returns: The extracted due date, or nil if none found
    static func extractDueDate(from transcript: String) async -> Date? {
        guard !transcript.isEmpty else { return nil }
        
        let lowerTranscript = transcript.lowercased()
        
        // 1. Try NSDataDetector first (handles complex date expressions)
        if let detectedDate = extractDateWithDetector(from: transcript) {
            return detectedDate
        }
        
        // 2. Check for relative date keywords
        for (pattern, daysOffset) in relativeDateKeywords {
            if lowerTranscript.contains(pattern) {
                return Calendar.current.date(byAdding: .day, value: daysOffset, to: Date())
            }
        }
        
        // 3. Check for "by [day]" patterns
        if let dayDate = extractDayOfWeek(from: lowerTranscript) {
            return dayDate
        }
        
        return nil
    }
    
    /// Use NSDataDetector to find dates in natural language
    private static func extractDateWithDetector(from text: String) -> Date? {
        guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.date.rawValue) else {
            return nil
        }
        
        let range = NSRange(text.startIndex..., in: text)
        let matches = detector.matches(in: text, options: [], range: range)
        
        // Return the first future date found
        let now = Date()
        for match in matches {
            if let date = match.date, date > now {
                return date
            }
        }
        
        // If no future date, return the first date found (might be today)
        return matches.first?.date
    }
    
    /// Extract day of week references like "by Friday", "on Monday"
    private static func extractDayOfWeek(from text: String) -> Date? {
        let dayPatterns: [(pattern: String, weekday: Int)] = [
            ("sunday", 1), ("monday", 2), ("tuesday", 3), ("wednesday", 4),
            ("thursday", 5), ("friday", 6), ("saturday", 7)
        ]
        
        let calendar = Calendar.current
        let today = Date()
        let currentWeekday = calendar.component(.weekday, from: today)
        
        for (pattern, targetWeekday) in dayPatterns {
            // Check for patterns like "by friday", "on monday", "this tuesday"
            if text.contains("by \(pattern)") || text.contains("on \(pattern)") || 
               text.contains("this \(pattern)") || text.contains("next \(pattern)") {
                
                var daysToAdd = targetWeekday - currentWeekday
                
                // If "next" is mentioned or the day has passed, go to next week
                if text.contains("next \(pattern)") || daysToAdd <= 0 {
                    daysToAdd += 7
                }
                
                return calendar.date(byAdding: .day, value: daysToAdd, to: today)
            }
        }
        
        return nil
    }
    
    // MARK: - Helpers
    
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
    
    private static func cleanAction(_ text: String) -> String {
        var cleaned = text
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: .punctuationCharacters)
        
        // Remove trailing date phrases if present
        let dateTrailers = ["by", "before", "until", "on", "tomorrow", "today", "next"]
        for trailer in dateTrailers {
            if let range = cleaned.lowercased().range(of: " \(trailer) ", options: .backwards) {
                cleaned = String(cleaned[..<range.lowerBound])
            }
        }
        
        // Capitalize first letter
        if let first = cleaned.first {
            cleaned = first.uppercased() + String(cleaned.dropFirst())
        }
        
        // Limit length
        let words = cleaned.components(separatedBy: .whitespaces)
        if words.count > 12 {
            cleaned = words.prefix(12).joined(separator: " ") + "..."
        }
        
        return cleaned
    }
}
