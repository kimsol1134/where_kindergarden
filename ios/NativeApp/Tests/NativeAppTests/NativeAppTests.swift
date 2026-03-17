import Foundation
import XCTest
@testable import Features
@testable import Models
@testable import Services

final class NativeAppTests: XCTestCase {
    func testDecodesKindergartenRawFromSharedJSONShape() throws {
        let json = """
        {
          "kindercode": "A001",
          "name": "역삼유치원",
          "address": "서울 강남구 역삼로 123",
          "lat": 37.4981,
          "lng": 127.0276,
          "type": "public",
          "phone": "02-1234-5678",
          "homepage": null,
          "operation_hours": "09:00-17:00",
          "sido_code": "11",
          "sigungu_code": "11680",
          "capacity": 40,
          "current_count": 32,
          "class_count_age3": 1,
          "class_count_age4": 1,
          "class_count_age5": 1,
          "capacity_age3": 12,
          "capacity_age4": 14,
          "capacity_age5": 14,
          "current_age3": 10,
          "current_age4": 10,
          "current_age5": 12,
          "class_count_mix": 0,
          "capacity_mix": 0,
          "current_mix": 0,
          "capacity_special": 0,
          "current_special": 0,
          "establish_date": "20160302",
          "has_bus": true,
          "bus_count": 1,
          "meal_type": "direct",
          "has_after_school": true,
          "area_per_child": 4.9,
          "has_playground": true,
          "building_year": 2016,
          "floor_info": "지상 3층",
          "classroom_area": 180,
          "indoor_playground_area": 36,
          "outdoor_playground_area": 82,
          "teacher_count": 8,
          "senior_teacher_count": 2,
          "cctv_count": 12
        }
        """

        let raw = try JSONDecoder().decode(KindergartenRaw.self, from: Data(json.utf8))

        XCTAssertEqual(raw.kindercode, "A001")
        XCTAssertEqual(raw.type, InstitutionType.public)
        XCTAssertEqual(raw.mealType, MealType.direct)
        XCTAssertEqual(raw.sigunguCode, "11680")
    }

    func testHaversineDistanceMatchesExistingWebExpectation() {
        let calculator = DistanceCalculator()
        let cityHall = Coordinates(lat: 37.5665, lng: 126.9780)
        let tower = Coordinates(lat: 37.5512, lng: 126.9882)

        let distance = calculator.kilometers(from: cityHall, to: tower)

        XCTAssertEqual(distance, 1.89, accuracy: 0.15)
    }

    func testSearchEngineAppliesRadiusAndSortsByCapacity() {
        let engine = KindergartenSearchEngine()
        var filters = SearchFilters(radiusKM: 3, sort: .capacity)
        filters.hasBus = true

        let results = engine.search(
            raws: NativePreviewFixtures.kindergartens,
            location: Coordinates(lat: 37.4981, lng: 127.0276),
            filters: filters
        )

        XCTAssertEqual(results.count, 2)
        XCTAssertEqual(results.first?.capacity, 48)
        XCTAssertTrue(results.allSatisfy { $0.hasBus })
    }

    func testCompareSelectionStopsAtThree() {
        var selection = CompareSelection()
        selection.toggle(id: "A001")
        selection.toggle(id: "A002")
        selection.toggle(id: "A003")
        selection.toggle(id: "A004")

        XCTAssertEqual(selection.ids, ["A001", "A002", "A003"])
    }

    func testReviewRepositoryFallsBackToBundledDataWhenRemoteFails() async throws {
        let bundled = """
        {
          "version": "2026-03-17",
          "totalCount": 1,
          "kindergartenCount": 1,
          "reviews": {
            "A001": [
              {
                "id": "rev-1",
                "kindergartenId": "A001",
                "title": "후기",
                "url": "https://example.com",
                "source": "naver_blog",
                "sourceName": "네이버 블로그",
                "snippet": "좋았어요",
                "date": null,
                "collectedAt": "2026-03-17T00:00:00Z",
                "relevanceScore": 3
              }
            ]
          }
        }
        """

        let repository = ReviewRepository(
            remoteLoader: { throw NSError(domain: "network", code: -1) },
            localLoader: { Data(bundled.utf8) }
        )

        let reviews = try await repository.load()

        XCTAssertEqual(reviews.totalCount, 1)
        XCTAssertEqual(reviews.reviews["A001"]?.count, 1)
        XCTAssertNil(reviews.reviews["A001"]?.first?.date)
    }

    func testDeepLinkParserSupportsUniversalLinksAndCustomScheme() {
        let parser = DeepLinkParser()

        let appLink = parser.destination(for: URL(string: "wherekindergarten://compare?ids=A001,A002")!)
        let webLink = parser.destination(for: URL(string: "https://where-kindergarden.vercel.app/compare?ids=A003")!)

        XCTAssertEqual(appLink, .compare(ids: ["A001", "A002"]))
        XCTAssertEqual(webLink, .compare(ids: ["A003"]))
    }

    @MainActor
    func testPersistenceRestoresFavoritesRecentsAndCompareSelection() {
        let store = InMemoryNativeAppStore()
        let persistence = NativeAppPersistence(store: store)

        let favorites = [
            FavoriteItem(kindercode: "A001", name: "역삼유치원", address: "서울 강남구 역삼로 123", type: .public),
        ]
        let recents = [
            RecentSearch(label: "서울 강남구 역삼동", coordinates: Coordinates(lat: 37.4981, lng: 127.0276)),
        ]
        let selection = CompareSelection(ids: ["A001", "A002"])

        persistence.saveFavorites(favorites)
        persistence.saveRecentSearches(recents)
        persistence.saveCompareSelection(selection)

        let restored = persistence.restore()

        XCTAssertEqual(restored.favorites, favorites)
        XCTAssertEqual(restored.recentSearches.count, 1)
        XCTAssertEqual(restored.compareSelection.ids, ["A001", "A002"])
    }

    @MainActor
    func testNativeAppModelAppliesCompareDeepLinkAndRestoresTab() {
        let store = InMemoryNativeAppStore()
        let persistence = NativeAppPersistence(store: store)
        let model = NativeAppModel(
            kindergartenRepository: KindergartenJSONRepository { Data() },
            reviewRepository: ReviewRepository(localLoader: { Data() }),
            remoteSearchService: KakaoLocalSuggestionService(
                client: KakaoLocalAPIClient(apiKey: nil)
            ),
            locationProvider: PreviewLocationProvider(coordinates: Coordinates(lat: 37.4981, lng: 127.0276)),
            persistence: persistence,
            configuration: NativeAppConfiguration(kakaoAppKey: nil),
            initialKindergartens: NativePreviewFixtures.kindergartens,
            initialReviews: ReviewsData(version: "2026-03-17", totalCount: 0, kindergartenCount: 0, reviews: [:])
        )

        model.applyDeepLink(URL(string: "wherekindergarten://compare?ids=A001,A003")!)

        XCTAssertEqual(model.compareSelection.ids, ["A001", "A003"])
        XCTAssertEqual(model.selectedTab, .compare)
        XCTAssertEqual(persistence.restore().compareSelection.ids, ["A001", "A003"])
    }
}
