import Foundation

public enum SearchLens: CaseIterable, Hashable {
    case vacancy
    case bus
    case afterSchool
    case space
    case publicOnly
    case privateOnly

    public var label: String {
        switch self {
        case .vacancy:
            return "정원여유"
        case .bus:
            return "셔틀"
        case .afterSchool:
            return "방과후"
        case .space:
            return "넓은공간"
        case .publicOnly:
            return "국공립"
        case .privateOnly:
            return "사립"
        }
    }

    public var iconName: String {
        switch self {
        case .vacancy:
            return "checkmark.seal.fill"
        case .bus:
            return "bus.fill"
        case .afterSchool:
            return "sun.max.fill"
        case .space:
            return "square.split.2x2.fill"
        case .publicOnly:
            return "building.columns.fill"
        case .privateOnly:
            return "house.fill"
        }
    }

    public func matches(_ filters: SearchFilters) -> Bool {
        switch self {
        case .vacancy:
            return filters.hasVacancy == true
                && filters.hasBus != true
                && filters.hasAfterSchool != true
                && filters.hasLargeSpace != true
                && filters.type == .all
        case .bus:
            return filters.hasBus == true
                && filters.hasVacancy != true
                && filters.hasAfterSchool != true
                && filters.hasLargeSpace != true
                && filters.type == .all
        case .afterSchool:
            return filters.hasAfterSchool == true
                && filters.hasVacancy != true
                && filters.hasBus != true
                && filters.hasLargeSpace != true
                && filters.type == .all
        case .space:
            return filters.hasLargeSpace == true
                && filters.hasVacancy != true
                && filters.hasBus != true
                && filters.hasAfterSchool != true
                && filters.type == .all
        case .publicOnly:
            return filters.type == .public
                && filters.hasVacancy != true
                && filters.hasBus != true
                && filters.hasAfterSchool != true
                && filters.hasLargeSpace != true
        case .privateOnly:
            return filters.type == .private
                && filters.hasVacancy != true
                && filters.hasBus != true
                && filters.hasAfterSchool != true
                && filters.hasLargeSpace != true
        }
    }

    public static func activeLens(in filters: SearchFilters) -> SearchLens? {
        guard filters.hasIndoorPlayground != true, filters.hasModernBuilding != true else {
            return nil
        }

        let matches = SearchLens.allCases.filter { $0.matches(filters) }
        return matches.count == 1 ? matches.first : nil
    }

    public static func toggledFilters(from filters: SearchFilters, lens: SearchLens) -> SearchFilters {
        var next = filters
        let wasActive = activeLens(in: filters) == lens
        resetExplorationFilters(on: &next)

        guard !wasActive else {
            return next
        }

        switch lens {
        case .vacancy:
            next.hasVacancy = true
        case .bus:
            next.hasBus = true
        case .afterSchool:
            next.hasAfterSchool = true
        case .space:
            next.hasLargeSpace = true
        case .publicOnly:
            next.type = .public
        case .privateOnly:
            next.type = .private
        }

        return next
    }

    private static func resetExplorationFilters(on filters: inout SearchFilters) {
        filters.type = .all
        filters.hasBus = nil
        filters.hasVacancy = nil
        filters.hasAfterSchool = nil
        filters.hasIndoorPlayground = nil
        filters.hasLargeSpace = nil
        filters.hasModernBuilding = nil
    }
}
