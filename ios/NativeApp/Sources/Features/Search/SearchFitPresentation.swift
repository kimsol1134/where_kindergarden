import Models
import SwiftUI

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
