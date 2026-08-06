import XCTest
@testable import Domain
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

    func testDecodesKindergartenRawWhenAreaFieldsAreMissing() throws {
        let json = """
        {
          "kindercode": "A002",
          "name": "누락 필드 유치원",
          "address": "서울 강남구 테스트로 1",
          "lat": 37.5,
          "lng": 127.0,
          "type": "private",
          "phone": null,
          "homepage": null,
          "operation_hours": null,
          "sido_code": "11",
          "sigungu_code": "11680",
          "capacity": 20,
          "current_count": 12,
          "class_count_age3": 1,
          "class_count_age4": 1,
          "class_count_age5": 0,
          "capacity_age3": 10,
          "capacity_age4": 10,
          "capacity_age5": 0,
          "current_age3": 6,
          "current_age4": 6,
          "current_age5": 0,
          "class_count_mix": 0,
          "capacity_mix": 0,
          "current_mix": 0,
          "capacity_special": 0,
          "current_special": 0,
          "establish_date": "20190304",
          "has_bus": false,
          "bus_count": 0,
          "meal_type": null,
          "has_after_school": false,
          "area_per_child": 4.1,
          "has_playground": false,
          "building_year": null,
          "floor_info": null,
          "teacher_count": 4,
          "senior_teacher_count": 1,
          "cctv_count": 3
        }
        """

        let raw = try JSONDecoder().decode(KindergartenRaw.self, from: Data(json.utf8))

        XCTAssertEqual(raw.classroomArea, 0)
        XCTAssertEqual(raw.indoorPlaygroundArea, 0)
        XCTAssertEqual(raw.outdoorPlaygroundArea, 0)
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

    func testSearchEngineFiltersByQueryAcrossNameAndAddress() {
        let engine = KindergartenSearchEngine()
        let kindergartens = engine.makeKindergartens(raws: NativePreviewFixtures.kindergartens, relativeTo: nil)

        XCTAssertEqual(engine.filter(kindergartens: kindergartens, query: "역삼").map(\.kindercode), ["A001"])
        XCTAssertEqual(engine.filter(kindergartens: kindergartens, query: "도곡로").map(\.kindercode), ["A002"])
        XCTAssertEqual(engine.filter(kindergartens: kindergartens, query: "").count, kindergartens.count)
    }

    func testCompareSelectionStopsAtThree() {
        var selection = CompareSelection()
        selection.toggle(id: "A001")
        selection.toggle(id: "A002")
        selection.toggle(id: "A003")
        selection.toggle(id: "A004")

        XCTAssertEqual(selection.ids, ["A001", "A002", "A003"])
    }

    @MainActor
    func testKindergartenRepositoryPrefersValidatedRemoteCatalog() async throws {
        let remoteCatalog = Array(NativePreviewFixtures.kindergartens.prefix(2))
        let localCatalog = Array(NativePreviewFixtures.kindergartens.prefix(1))
        let repository = KindergartenRepository(
            remoteLoader: { try JSONEncoder().encode(remoteCatalog) },
            localLoader: { try JSONEncoder().encode(localCatalog) }
        )

        await repository.load()

        XCTAssertEqual(repository.kindergartens.map(\.kindercode), remoteCatalog.map(\.kindercode))
        XCTAssertEqual(repository.lookup.count, 2)
        XCTAssertNil(repository.error)
    }

    @MainActor
    func testKindergartenRepositoryFallsBackWhenRemoteCatalogIsEmpty() async throws {
        let localCatalog = Array(NativePreviewFixtures.kindergartens.prefix(1))
        let repository = KindergartenRepository(
            remoteLoader: { Data("[]".utf8) },
            localLoader: { try JSONEncoder().encode(localCatalog) }
        )

        await repository.load()

        XCTAssertEqual(repository.kindergartens.map(\.kindercode), localCatalog.map(\.kindercode))
        XCTAssertEqual(repository.lookup.count, 1)
        XCTAssertNil(repository.error)
    }

    @MainActor
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

        await repository.load()
        let reviews = try XCTUnwrap(repository.reviewsData)

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

    func testDeepLinkParserSupportsUniversalSearchLinks() {
        let parser = DeepLinkParser()

        let webLink = parser.destination(for: URL(string: "https://where-kindergarden.vercel.app/search?q=%EC%97%AD%EC%82%BC%EC%9C%A0%EC%B9%98%EC%9B%90")!)

        XCTAssertEqual(webLink, .search(query: "역삼유치원"))
    }

    func testDeepLinkBuilderCreatesCompareLink() {
        let builder = DeepLinkBuilder()

        let url = builder.compareURL(ids: ["A001", "A002"])

        XCTAssertEqual(url?.absoluteString, "https://where-kindergarden.vercel.app/compare?ids=A001,A002")
    }

    func testNativeAppConfigurationTreatsUnresolvedKakaoBuildSettingsAsMissing() {
        let configuration = NativeAppConfiguration(
            kakaoAppKey: "$(WK_KAKAO_NATIVE_APP_KEY)",
            kakaoRESTAPIKey: "   "
        )

        XCTAssertNil(configuration.kakaoAppKey)
        XCTAssertNil(configuration.kakaoRESTAPIKey)
        XCTAssertNil(configuration.kakaoConfigurationSource)
    }

    func testNativeAppConfigurationSurfacesVerificationState() {
        let configuration = NativeAppConfiguration(
            kakaoAppKey: nil,
            kakaoRESTAPIKey: nil,
            kakaoConfigurationSource: "shared-global",
            compareShareBaseURL: URL(string: "https://where-kindergarden.vercel.app/compare")!
        )

        XCTAssertFalse(configuration.hasKakaoMapKey)
        XCTAssertFalse(configuration.hasKakaoRESTAPIKey)
        XCTAssertEqual(configuration.kakaoConfigurationSource, .sharedGlobal)
        XCTAssertEqual(configuration.kakaoConfigurationSourceDescription, "공용 로컬 설정")
        XCTAssertEqual(
            configuration.missingKakaoBuildSettings,
            [
                NativeAppConfiguration.kakaoNativeAppKeyBuildSetting,
                NativeAppConfiguration.kakaoRESTAPIKeyBuildSetting,
            ]
        )
        XCTAssertEqual(configuration.universalLinkHost, "where-kindergarden.vercel.app")
        XCTAssertTrue(configuration.kakaoConfigurationHelpText.contains("KakaoKeys.local.xcconfig"))
        XCTAssertTrue(configuration.kakaoConfigurationHelpText.contains("~/.config/where-kindergarten"))
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

    func testDecodesLegacyRecentSearchWithoutNewFields() throws {
        let json = """
        {
          "id": "00000000-0000-0000-0000-000000000001",
          "label": "서울시청",
          "coordinates": { "lat": 37.5665, "lng": 126.978 }
        }
        """

        let search = try JSONDecoder().decode(RecentSearch.self, from: Data(json.utf8))

        XCTAssertEqual(search.label, "서울시청")
        XCTAssertNil(search.displayName)
        XCTAssertNil(search.searchType)
        XCTAssertNil(search.createdAt)
        XCTAssertEqual(search.resolvedDisplayName, "서울시청")
    }

    func testRecentSearchRoundTripWithNewFields() throws {
        let search = RecentSearch(
            label: "현재 위치",
            coordinates: Coordinates(lat: 37.5, lng: 127.0),
            displayName: "현재 위치",
            searchType: .currentLocation,
            createdAt: Date(timeIntervalSince1970: 1700000000)
        )

        let data = try JSONEncoder().encode(search)
        let decoded = try JSONDecoder().decode(RecentSearch.self, from: data)

        XCTAssertEqual(decoded.label, "현재 위치")
        XCTAssertEqual(decoded.displayName, "현재 위치")
        XCTAssertEqual(decoded.searchType, .currentLocation)
        XCTAssertEqual(decoded.createdAt, Date(timeIntervalSince1970: 1700000000))
    }
}
