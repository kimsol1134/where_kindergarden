import Testing
import Models
@testable import Domain

struct SearchUseCaseTests {
    let sut = SearchUseCase()
    let userLocation = Coordinates(lat: 37.4981, lng: 127.0276)

    @Test func search_withinRadius_returnsResults() {
        let catalog = [
            makeTestKindergartenRaw(kindercode: "A", name: "가까운유치원", lat: 37.4985, lng: 127.0280),
        ]
        let filters = SearchFilters(radiusKM: 1)

        let results = sut.search(catalog: catalog, location: userLocation, filters: filters, query: "")

        #expect(results.count == 1)
        #expect(results.first?.kindercode == "A")
    }

    @Test func search_outsideRadius_excludesResults() {
        let catalog = [
            makeTestKindergartenRaw(kindercode: "A", name: "먼유치원", lat: 37.5512, lng: 126.9882),
        ]
        let filters = SearchFilters(radiusKM: 1)

        let results = sut.search(catalog: catalog, location: userLocation, filters: filters, query: "")

        #expect(results.isEmpty)
    }

    @Test func search_queryFilter_matchesName() {
        let catalog = [
            makeTestKindergartenRaw(kindercode: "A", name: "역삼유치원", lat: 37.4985, lng: 127.0280),
            makeTestKindergartenRaw(kindercode: "B", name: "강남유치원", lat: 37.4990, lng: 127.0270),
        ]
        let filters = SearchFilters(radiusKM: 1)

        let results = sut.search(catalog: catalog, location: userLocation, filters: filters, query: "역삼")

        #expect(results.count == 1)
        #expect(results.first?.name == "역삼유치원")
    }

    @Test func localSuggestions_exactMatch_firstPriority() {
        let catalog = [
            makeTestKindergartenRaw(kindercode: "A", name: "역삼유치원", lat: 37.4985, lng: 127.0280),
            makeTestKindergartenRaw(kindercode: "B", name: "역삼이웃유치원", lat: 37.4990, lng: 127.0270),
        ]

        let suggestions = sut.localSuggestions(query: "역삼유치원", catalog: catalog, userLocation: userLocation)

        #expect(suggestions.first?.title == "역삼유치원")
    }

    @Test func localSuggestions_prefixMatch_secondPriority() {
        let catalog = [
            makeTestKindergartenRaw(kindercode: "B", name: "좋은역삼유치원", lat: 37.4990, lng: 127.0270),
            makeTestKindergartenRaw(kindercode: "A", name: "역삼이웃유치원", lat: 37.4985, lng: 127.0280),
        ]

        let suggestions = sut.localSuggestions(query: "역삼", catalog: catalog, userLocation: userLocation)

        // "역삼이웃유치원" has prefix "역삼" → priority 1
        // "좋은역삼유치원" contains "역삼" → priority 2
        #expect(suggestions.first?.title == "역삼이웃유치원")
    }

    @Test func localSuggestions_limit_respected() {
        let catalog = (0..<10).map { i in
            makeTestKindergartenRaw(
                kindercode: "K\(i)",
                name: "테스트유치원\(i)",
                lat: 37.4981 + Double(i) * 0.001,
                lng: 127.0276
            )
        }

        let suggestions = sut.localSuggestions(
            query: "테스트",
            catalog: catalog,
            userLocation: userLocation,
            limit: 3
        )

        #expect(suggestions.count == 3)
    }

    @Test func expandedRadius_emptyResults_expandsTo2() {
        let result = sut.expandedRadiusIfNeeded(currentRadius: 1, results: [])

        #expect(result == 2)
    }

    @Test func expandedRadius_hasResults_returnsNil() {
        let k = makeTestKindergarten()

        let result = sut.expandedRadiusIfNeeded(currentRadius: 1, results: [k])

        #expect(result == nil)
    }

    @Test func expandedRadius_alreadyAt5_returnsNil() {
        let result = sut.expandedRadiusIfNeeded(currentRadius: 5, results: [])

        #expect(result == nil)
    }
}
