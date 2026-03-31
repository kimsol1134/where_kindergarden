import Models
import SwiftUI

enum SearchLens: CaseIterable, Hashable {
    case vacancy
    case bus
    case afterSchool
    case space
    case publicOnly
    case privateOnly

    var label: String {
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

    var iconName: String {
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

    func matches(_ filters: SearchFilters) -> Bool {
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

    static func activeLens(in filters: SearchFilters) -> SearchLens? {
        guard filters.hasIndoorPlayground != true, filters.hasModernBuilding != true else {
            return nil
        }

        let matches = SearchLens.allCases.filter { $0.matches(filters) }
        return matches.count == 1 ? matches.first : nil
    }

    static func toggledFilters(from filters: SearchFilters, lens: SearchLens) -> SearchFilters {
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

struct KindergartenFitReason: Identifiable, Hashable {
    let title: String
    let tone: NativeBadge.Tone
    let priority: Int

    var id: String { title }
}

enum KindergartenFitSummaryBuilder {
    static func reasons(
        for kindergarten: Kindergarten,
        filters: SearchFilters,
        reviewCount: Int,
        vacancyCount: Int
    ) -> [KindergartenFitReason] {
        var reasons: [KindergartenFitReason] = []

        func boosted(_ base: Int, when condition: Bool) -> Int {
            base + (condition ? 40 : 0)
        }

        if vacancyCount > 0 {
            reasons.append(
                KindergartenFitReason(
                    title: "정원여유",
                    tone: .sun,
                    priority: boosted(76, when: filters.hasVacancy == true)
                )
            )
        }

        if kindergarten.hasBus {
            reasons.append(
                KindergartenFitReason(
                    title: "셔틀",
                    tone: .jade,
                    priority: boosted(80, when: filters.hasBus == true)
                )
            )
        }

        if kindergarten.hasAfterSchool {
            reasons.append(
                KindergartenFitReason(
                    title: "방과후",
                    tone: .slate,
                    priority: boosted(82, when: filters.hasAfterSchool == true)
                )
            )
        }

        if kindergarten.areaPerChild >= 5 {
            reasons.append(
                KindergartenFitReason(
                    title: "넓은공간",
                    tone: .sun,
                    priority: boosted(74, when: filters.hasLargeSpace == true)
                )
            )
        }

        if reviewCount > 0 {
            reasons.append(
                KindergartenFitReason(
                    title: "후기 있음",
                    tone: .sand,
                    priority: 72
                )
            )
        }

        if kindergarten.distance >= 0, kindergarten.distance <= 1 {
            reasons.append(
                KindergartenFitReason(
                    title: "거리 가까움",
                    tone: .slate,
                    priority: 64
                )
            )
        }

        switch kindergarten.type {
        case .public:
            reasons.append(
                KindergartenFitReason(
                    title: "국공립",
                    tone: .jade,
                    priority: boosted(58, when: filters.type == .public)
                )
            )
        case .private:
            reasons.append(
                KindergartenFitReason(
                    title: "사립",
                    tone: .sand,
                    priority: boosted(58, when: filters.type == .private)
                )
            )
        case .home:
            break
        }

        return reasons
            .sorted { lhs, rhs in
                if lhs.priority == rhs.priority {
                    return lhs.title < rhs.title
                }
                return lhs.priority > rhs.priority
            }
            .prefix(3)
            .map { $0 }
    }
}
