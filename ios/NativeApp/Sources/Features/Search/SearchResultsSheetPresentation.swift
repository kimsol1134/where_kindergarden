import CoreGraphics

enum SearchResultsSheetDetentKind: CaseIterable {
    case peek
    case mid
    case expanded
}

enum SearchResultsSheetPolicy {
    static let cornerRadius: CGFloat = 24
    static let minimumVisibleHeight: CGFloat = 200
    static let expandedFraction: CGFloat = 0.88

    static func height(for kind: SearchResultsSheetDetentKind, maximumDetentValue: CGFloat) -> CGFloat {
        switch kind {
        case .peek:
            return max(maximumDetentValue * 0.32, minimumVisibleHeight)
        case .mid:
            return maximumDetentValue * 0.55
        case .expanded:
            return maximumDetentValue * expandedFraction
        }
    }

    static func clampedHeight(_ height: CGFloat, maximumDetentValue: CGFloat) -> CGFloat {
        min(
            max(height, self.height(for: .peek, maximumDetentValue: maximumDetentValue)),
            self.height(for: .expanded, maximumDetentValue: maximumDetentValue)
        )
    }

    static func nearestDetent(
        for height: CGFloat,
        maximumDetentValue: CGFloat
    ) -> SearchResultsSheetDetentKind {
        let clampedHeight = clampedHeight(height, maximumDetentValue: maximumDetentValue)

        return SearchResultsSheetDetentKind.allCases.min {
            abs(self.height(for: $0, maximumDetentValue: maximumDetentValue) - clampedHeight)
                < abs(self.height(for: $1, maximumDetentValue: maximumDetentValue) - clampedHeight)
        } ?? .mid
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
