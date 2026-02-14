import Foundation

public struct NormalizedBarcode: Sendable {
    public let raw: String
    public let digits: String
    public let gtin14: String
    public let alternates: [String]
    public let isValidCheckDigit: Bool
}

public enum BarcodeNormalizationError: Error {
    case noDigits
    case unsupportedLength(Int)
}

public enum GS1Barcode {
    public static func normalize(_ raw: String) throws -> NormalizedBarcode {
        let digits = raw.filter(\.isNumber)
        guard !digits.isEmpty else { throw BarcodeNormalizationError.noDigits }
        
        let len = digits.count
        guard [8, 12, 13, 14].contains(len) else {
            throw BarcodeNormalizationError.unsupportedLength(len)
        }
        
        let isValid = validateGS1CheckDigit(digits)
        let gtin14 = digits.leftPad(to: 14, with: "0")
        
        var alternates: [String] = [gtin14]
        if len == 12 {
            let ean13As14 = ("0" + digits).leftPad(to: 14, with: "0")
            alternates.append(ean13As14)
        } else if len == 14 {
            alternates.append(digits)
        } else {
            alternates.append(gtin14)
        }
        
        alternates = Array(Set(alternates))
        
        return NormalizedBarcode(
            raw: raw,
            digits: digits,
            gtin14: gtin14,
            alternates: alternates,
            isValidCheckDigit: isValid
        )
    }
    
    public static func validateGS1CheckDigit(_ digits: String) -> Bool {
        guard digits.allSatisfy(\.isNumber), digits.count >= 2 else { return false }
        let body = digits.dropLast()
        let checkChar = digits.last!
        guard let expected = computeGS1CheckDigit(String(body)),
              let actual = Int(String(checkChar)) else { return false }
        return expected == actual
    }
    
    public static func computeGS1CheckDigit(_ bodyDigits: String) -> Int? {
        let ints = bodyDigits.compactMap { Int(String($0)) }
        guard ints.count == bodyDigits.count, !ints.isEmpty else { return nil }
        
        var sum = 0
        var positionFromRight = 1
        for d in ints.reversed() {
            let weight = (positionFromRight % 2 == 1) ? 3 : 1
            sum += d * weight
            positionFromRight += 1
        }
        
        let mod = sum % 10
        return (10 - mod) % 10
    }
}

extension String {
    func leftPad(to length: Int, with char: Character) -> String {
        guard count < length else { return self }
        return String(repeating: String(char), count: length - count) + self
    }
}
