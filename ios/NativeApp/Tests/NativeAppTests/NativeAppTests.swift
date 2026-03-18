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

    @MainActor
    func testSearchFeatureModelFiltersByQueryAndClearsToFullSet() {
        let model = SearchFeatureModel()

        XCTAssertEqual(model.results.count, NativePreviewFixtures.kindergartens.count)

        model.query = "역삼"
        XCTAssertEqual(model.results.map(\.kindercode), ["A001"])

        model.query = "도곡로"
        XCTAssertEqual(model.results.map(\.kindercode), ["A002"])

        model.query = ""
        XCTAssertEqual(model.results.count, NativePreviewFixtures.kindergartens.count)
    }

    @MainActor
    func testSearchFeatureModelResolvesComparedItemsFromAllKindergartens() {
        let model = SearchFeatureModel()
        model.query = "역삼"

        let compared = model.kindergartens(for: ["A002", "A001"])

        XCTAssertEqual(compared.map(\.kindercode), ["A002", "A001"])
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
                "title": "후기",
                "url": "https://example.com",
                "source": "naver_blog",
                "snippet": "좋았어요",
                "date": "2026-03-01",
                "collectedAt": "2026-03-17T00:00:00Z"
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
    }

    func testDeepLinkParserSupportsUniversalLinksAndCustomScheme() {
        let parser = DeepLinkParser()

        let appLink = parser.destination(for: URL(string: "wherekindergarten://compare?ids=A001,A002")!)
        let webLink = parser.destination(for: URL(string: "https://where-kindergarden.vercel.app/compare?ids=A003")!)

        XCTAssertEqual(appLink, .compare(ids: ["A001", "A002"]))
        XCTAssertEqual(webLink, .compare(ids: ["A003"]))
    }

    func testDeepLinkBuilderCreatesCompareLink() {
        let builder = DeepLinkBuilder()

        let url = builder.compareURL(ids: ["A001", "A002"])

        XCTAssertEqual(url?.absoluteString, "https://where-kindergarden.vercel.app/compare?ids=A001,A002")
    }
}
