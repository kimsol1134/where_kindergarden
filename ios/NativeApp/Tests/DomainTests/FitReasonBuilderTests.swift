import Testing
import Models
@testable import Domain

struct FitReasonBuilderTests {
    let sut = FitReasonBuilder()

    @Test func reasons_nearbyKindergarten_includesNearbyReason() {
        let k = makeTestKindergarten(distance: 0.5)
        let filters = SearchFilters()

        let reasons = sut.reasons(for: k, filters: filters, reviewCount: 0, vacancyCount: 0)

        #expect(reasons.contains(where: { $0.text == "거리 가까움" }))
    }

    @Test func reasons_busFilterActive_boosted() {
        let k = makeTestKindergarten(
            hasBus: true,
            busCount: 1,
            hasAfterSchool: true,
            areaPerChild: 6
        )
        let filters = SearchFilters(hasBus: true)

        let reasons = sut.reasons(for: k, filters: filters, reviewCount: 0, vacancyCount: 0)

        #expect(reasons.first?.text == "셔틀")
    }

    @Test func reasons_maxThreeReasons() {
        let k = makeTestKindergarten(
            type: .public,
            hasBus: true,
            busCount: 1,
            hasAfterSchool: true,
            areaPerChild: 6,
            distance: 0.5
        )
        let filters = SearchFilters()

        let reasons = sut.reasons(for: k, filters: filters, reviewCount: 5, vacancyCount: 2)

        #expect(reasons.count <= 3)
    }
}
