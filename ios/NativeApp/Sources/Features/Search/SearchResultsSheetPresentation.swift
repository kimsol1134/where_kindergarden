import SwiftUI

enum SearchResultsSheetDetentKind: CaseIterable {
    case peek
    case mid
    case expanded
}

enum SearchResultsSheetPolicy {
    static let cornerRadius: CGFloat = 24

    static var supportedDetents: Set<PresentationDetent> {
        Set(SearchResultsSheetDetentKind.allCases.map(presentationDetent(for:)))
    }

    static func presentationDetent(for kind: SearchResultsSheetDetentKind) -> PresentationDetent {
        switch kind {
        case .peek:
            return .custom(SearchResultsPeekDetent.self)
        case .mid:
            return .custom(SearchResultsMidDetent.self)
        case .expanded:
            return .custom(SearchResultsExpandedDetent.self)
        }
    }

    static func kind(for detent: PresentationDetent) -> SearchResultsSheetDetentKind? {
        SearchResultsSheetDetentKind.allCases.first { presentationDetent(for: $0) == detent }
    }

    static func height(for kind: SearchResultsSheetDetentKind, maximumDetentValue: CGFloat) -> CGFloat {
        switch kind {
        case .peek:
            return max(maximumDetentValue * 0.32, 200)
        case .mid:
            return maximumDetentValue * 0.55
        case .expanded:
            return maximumDetentValue * 0.88
        }
    }

    static func shouldPresentResultsSheet(
        isSearchPanelPresented: Bool,
        isSearchTabSelected: Bool
    ) -> Bool {
        isSearchTabSelected && !isSearchPanelPresented
    }

    static func preferredDetentAfterSuggestionPanelDismiss(
        resultsCount: Int,
        hasSearchContext: Bool
    ) -> SearchResultsSheetDetentKind {
        (resultsCount > 0 || hasSearchContext) ? .mid : .peek
    }
}

private struct SearchResultsPeekDetent: CustomPresentationDetent {
    static func height(in context: Context) -> CGFloat? {
        SearchResultsSheetPolicy.height(for: .peek, maximumDetentValue: context.maxDetentValue)
    }
}

private struct SearchResultsMidDetent: CustomPresentationDetent {
    static func height(in context: Context) -> CGFloat? {
        SearchResultsSheetPolicy.height(for: .mid, maximumDetentValue: context.maxDetentValue)
    }
}

private struct SearchResultsExpandedDetent: CustomPresentationDetent {
    static func height(in context: Context) -> CGFloat? {
        SearchResultsSheetPolicy.height(for: .expanded, maximumDetentValue: context.maxDetentValue)
    }
}
