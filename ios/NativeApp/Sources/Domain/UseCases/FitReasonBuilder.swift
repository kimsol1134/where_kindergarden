import Foundation
import Models

public struct KindergartenFitReason: Identifiable, Hashable, Sendable {
    public let icon: String
    public let text: String
    public let priority: Int

    public var id: String { text }

    public init(icon: String, text: String, priority: Int) {
        self.icon = icon
        self.text = text
        self.priority = priority
    }
}

public struct FitReasonBuilder: Sendable {

    public init() {}

    public func reasons(
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
                    icon: "sun",
                    text: "정원여유",
                    priority: boosted(76, when: filters.hasVacancy == true)
                )
            )
        }

        if kindergarten.hasBus {
            reasons.append(
                KindergartenFitReason(
                    icon: "jade",
                    text: "셔틀",
                    priority: boosted(80, when: filters.hasBus == true)
                )
            )
        }

        if kindergarten.hasAfterSchool {
            reasons.append(
                KindergartenFitReason(
                    icon: "slate",
                    text: "방과후",
                    priority: boosted(82, when: filters.hasAfterSchool == true)
                )
            )
        }

        if kindergarten.areaPerChild >= 5 {
            reasons.append(
                KindergartenFitReason(
                    icon: "sun",
                    text: "넓은공간",
                    priority: boosted(74, when: filters.hasLargeSpace == true)
                )
            )
        }

        if reviewCount > 0 {
            reasons.append(
                KindergartenFitReason(
                    icon: "sand",
                    text: "후기 있음",
                    priority: 72
                )
            )
        }

        if kindergarten.distance >= 0, kindergarten.distance <= 1 {
            reasons.append(
                KindergartenFitReason(
                    icon: "slate",
                    text: "거리 가까움",
                    priority: 64
                )
            )
        }

        switch kindergarten.type {
        case .public:
            reasons.append(
                KindergartenFitReason(
                    icon: "jade",
                    text: "국공립",
                    priority: boosted(58, when: filters.type == .public)
                )
            )
        case .private:
            reasons.append(
                KindergartenFitReason(
                    icon: "sand",
                    text: "사립",
                    priority: boosted(58, when: filters.type == .private)
                )
            )
        case .home:
            break
        }

        return reasons
            .sorted { lhs, rhs in
                if lhs.priority == rhs.priority {
                    return lhs.text < rhs.text
                }
                return lhs.priority > rhs.priority
            }
            .prefix(3)
            .map { $0 }
    }

    /// Static convenience for backward compatibility
    public static func reasons(
        for kindergarten: Kindergarten,
        filters: SearchFilters,
        reviewCount: Int,
        vacancyCount: Int
    ) -> [KindergartenFitReason] {
        FitReasonBuilder().reasons(
            for: kindergarten,
            filters: filters,
            reviewCount: reviewCount,
            vacancyCount: vacancyCount
        )
    }
}

/// Backward compatibility alias
public typealias KindergartenFitSummaryBuilder = FitReasonBuilder
