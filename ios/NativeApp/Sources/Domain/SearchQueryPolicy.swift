import Foundation

/// 검색어 입력을 실제 검색/계측에 쓸 수 있는 형태로 정규화한다.
///
/// 한글 IME는 글자를 조합하는 중간 상태를 그대로 노출한다. "강남"을 입력하면
/// `ㄱ` → `가` → `강` → `강ㄴ` → `강나` → `강남` 순으로 텍스트가 변한다.
/// 이때 `ㄱ`이나 `강ㄴ` 같은 미완성 상태를 그대로 검색어로 쓰면 결과가 0건이 되어
/// 입력 도중 빈 결과 화면이 깜빡이고, 계측에도 `ㄱ`·`ㅅ` 같은 자모가 실패 검색어로 기록된다.
///
/// 그래서 문자열 끝에 붙은 조합 중 자모를 잘라내고 검색한다. `강ㄴ`은 `강`으로,
/// 자모만 있는 `ㄱ`은 빈 문자열(= 키워드 필터 없음)로 정규화된다.
public enum SearchQueryPolicy {

    /// 조합 중이거나 단독으로 입력된 한글 자모인지 판별한다.
    ///
    /// - Hangul Jamo: `U+1100...U+11FF`
    /// - Hangul Compatibility Jamo: `U+3130...U+318F` (키보드에서 바로 나오는 `ㄱ`, `ㅏ` 등)
    /// - Hangul Jamo Extended-A / B: `U+A960...U+A97F`, `U+D7B0...U+D7FF`
    public static func isIncompleteHangulJamo(_ character: Character) -> Bool {
        guard character.unicodeScalars.count == 1,
              let scalar = character.unicodeScalars.first else {
            return false
        }

        switch scalar.value {
        case 0x1100...0x11FF, 0x3130...0x318F, 0xA960...0xA97F, 0xD7B0...0xD7FF:
            return true
        default:
            return false
        }
    }

    /// 입력 전체가 미완성 자모로만 이루어져 있는지 판별한다. (`"ㄱㄴ"` → `true`)
    public static func isJamoOnly(_ raw: String) -> Bool {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return false }
        return trimmed.allSatisfy(isIncompleteHangulJamo)
    }

    /// 검색과 계측에 사용할 확정 검색어를 만든다.
    ///
    /// 끝에 붙은 미완성 자모를 모두 제거하고 앞뒤 공백을 정리한다.
    /// 결과가 빈 문자열이면 "아직 키워드가 없다"는 뜻이며, 호출부는 이를
    /// 위치 기반 검색(키워드 필터 없음)으로 취급해야 한다.
    public static func normalizedQuery(_ raw: String) -> String {
        var trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)

        while let last = trimmed.last, isIncompleteHangulJamo(last) {
            trimmed.removeLast()
        }

        return trimmed.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
