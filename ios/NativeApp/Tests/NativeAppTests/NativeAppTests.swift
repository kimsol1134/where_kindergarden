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

    @MainActor
    func testNativeAppModelFiltersBySearchTextAndClearsToFullSet() {
        let model = makeNativeAppModel()

        XCTAssertEqual(model.results.count, NativePreviewFixtures.kindergartens.count)

        model.updateSearchText("역삼")
        XCTAssertEqual(model.results.map(\.kindercode), ["A001"])

        model.updateSearchText("도곡로")
        XCTAssertEqual(model.results.map(\.kindercode), ["A002"])

        model.clearSearchText()
        XCTAssertEqual(model.results.count, NativePreviewFixtures.kindergartens.count)
    }

    @MainActor
    func testNativeAppModelComparedKindergartensFollowSelectionOrder() throws {
        let model = makeNativeAppModel()
        let a001 = try XCTUnwrap(model.results.first(where: { $0.kindercode == "A001" }))
        let a002 = try XCTUnwrap(model.results.first(where: { $0.kindercode == "A002" }))

        model.toggleCompare(for: a002)
        model.toggleCompare(for: a001)

        XCTAssertEqual(model.comparedKindergartens().map(\.kindercode), ["A002", "A001"])
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

    @MainActor
    func testNativeAppModelAppliesCompareDeepLinkAndRestoresTab() {
        let store = InMemoryNativeAppStore()
        let persistence = NativeAppPersistence(store: store)
        let model = NativeAppModel(
            kindergartenRepository: KindergartenRepository { Data() },
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

    @MainActor
    func testNativeAppModelAppliesSearchDeepLinkByOpeningMatchingKindergarten() {
        let model = makeNativeAppModel()

        model.applyDeepLink(URL(string: "wherekindergarten://search?q=%ED%95%B4%EB%A7%91%EC%9D%80%EC%9C%A0%EC%B9%98%EC%9B%90")!)

        XCTAssertEqual(model.selectedTab, .search)
        XCTAssertEqual(model.locationLabel, "해맑은유치원")
        XCTAssertEqual(model.searchText, "해맑은유치원")
        XCTAssertEqual(model.selectedKindergarten?.kindercode, "A002")
        XCTAssertEqual(model.results.first?.kindercode, "A002")
    }

    @MainActor
    func testNativeAppModelQueuesSearchDeepLinkUntilCatalogLoads() async throws {
        let store = InMemoryNativeAppStore()
        let persistence = NativeAppPersistence(store: store)
        let catalogData = try JSONEncoder().encode(NativePreviewFixtures.kindergartens)
        let model = NativeAppModel(
            kindergartenRepository: KindergartenRepository { catalogData },
            reviewRepository: ReviewRepository(localLoader: { Data("{\"version\":\"2026-03-17\",\"totalCount\":0,\"kindergartenCount\":0,\"reviews\":{}}".utf8) }),
            remoteSearchService: KakaoLocalSuggestionService(
                client: KakaoLocalAPIClient(apiKey: nil)
            ),
            locationProvider: PreviewLocationProvider(coordinates: Coordinates(lat: 37.4981, lng: 127.0276)),
            persistence: persistence,
            configuration: NativeAppConfiguration(kakaoAppKey: nil),
            initialKindergartens: [],
            initialReviews: ReviewsData(version: "2026-03-17", totalCount: 0, kindergartenCount: 0, reviews: [:])
        )

        model.applyDeepLink(URL(string: "wherekindergarten://search?q=%EC%97%AD%EC%82%BC%EC%9C%A0%EC%B9%98%EC%9B%90")!)
        await model.loadCatalog()

        XCTAssertEqual(model.selectedTab, .search)
        XCTAssertEqual(model.locationLabel, "역삼유치원")
        XCTAssertEqual(model.selectedKindergarten?.kindercode, "A001")
        XCTAssertEqual(model.results.first?.kindercode, "A001")
    }

    @MainActor
    func testNativeAppModelOpensKindergartenDetailFromSavedFlow() {
        let model = makeNativeAppModel()

        model.openKindergartenDetail(kindercode: "A002")

        XCTAssertEqual(model.selectedTab, .search)
        XCTAssertEqual(model.locationLabel, "해맑은유치원")
        XCTAssertEqual(model.searchText, "해맑은유치원")
        XCTAssertEqual(model.selectedKindergarten?.kindercode, "A002")
    }

    @MainActor
    func testNativeAppModelRestoresDeletedFavoritesInOriginalOrder() throws {
        let model = makeNativeAppModel()
        let first = try XCTUnwrap(model.results.first(where: { $0.kindercode == "A001" }))
        let second = try XCTUnwrap(model.results.first(where: { $0.kindercode == "A002" }))

        model.toggleFavorite(for: first)
        model.toggleFavorite(for: second)

        let removed = model.takeFavorites(atOffsets: IndexSet([0]))
        XCTAssertEqual(model.favorites.map(\.kindercode), ["A001"])

        model.restoreFavorites(removed)

        XCTAssertEqual(model.favorites.map(\.kindercode), ["A002", "A001"])
    }

    @MainActor
    func testNativeAppModelRestoresDeletedRecentSearchesInOriginalOrder() {
        let model = makeNativeAppModel()
        let first = RecentSearch(label: "서울시청", coordinates: Coordinates(lat: 37.5665, lng: 126.9780))
        let second = RecentSearch(label: "강남역", coordinates: Coordinates(lat: 37.4979, lng: 127.0276))

        model.restoreRecentSearch(first)
        model.restoreRecentSearch(second)

        let removed = model.takeAllRecentSearches()
        XCTAssertTrue(model.recentSearches.isEmpty)

        model.restoreRecentSearches(removed)

        XCTAssertEqual(model.recentSearches.map(\.label), ["강남역", "서울시청", "서울 강남구 역삼동"])
    }

    // MARK: - PR 1: RecentSearch backward compatibility

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

    @MainActor
    func testCenterOnCurrentLocationSetsSearchType() async {
        let model = makeNativeAppModel()
        await model.centerOnCurrentLocation()

        XCTAssertEqual(model.searchText, "")
        XCTAssertEqual(model.activeSearchType, .currentLocation)
        XCTAssertTrue(model.isCurrentLocationSearchActive)
        XCTAssertEqual(model.locationLabel, "현재 위치")
        XCTAssertEqual(model.recentSearches.first?.searchType, .currentLocation)
    }

    @MainActor
    func testPrimeCurrentDeviceLocationIfAuthorizedKeepsSearchStateIntact() async {
        let model = makeNativeAppModel()
        let searchedCenter = Coordinates(lat: 37.5665, lng: 126.9780)
        model.setLocation(searchedCenter, label: "서울시청", searchType: .address)
        model.updateSearchText("서울시청")

        let originalResults = model.results.map(\.kindercode)
        let originalRecents = model.recentSearches

        await model.primeCurrentDeviceLocationIfAuthorized()

        XCTAssertEqual(model.currentDeviceLocation, Coordinates(lat: 37.4981, lng: 127.0276))
        XCTAssertEqual(model.userLocation, searchedCenter)
        XCTAssertEqual(model.locationLabel, "서울시청")
        XCTAssertEqual(model.searchText, "서울시청")
        XCTAssertEqual(model.activeSearchType, .address)
        XCTAssertEqual(model.results.map(\.kindercode), originalResults)
        XCTAssertEqual(model.recentSearches, originalRecents)
        XCTAssertEqual(model.currentLocationRecenterRequestID, 0)
    }

    @MainActor
    func testCurrentLocationRequestsAreSharedAcrossPrimeAndFullCurrentLocationSearch() async {
        let store = InMemoryNativeAppStore()
        let persistence = NativeAppPersistence(store: store)
        let provider = CountingLocationProvider(
            coordinates: Coordinates(lat: 37.4981, lng: 127.0276),
            delayNanoseconds: 60_000_000
        )

        let model = NativeAppModel(
            kindergartenRepository: KindergartenRepository { Data() },
            reviewRepository: ReviewRepository(localLoader: { Data() }),
            remoteSearchService: KakaoLocalSuggestionService(
                client: KakaoLocalAPIClient(apiKey: nil)
            ),
            locationProvider: provider,
            persistence: persistence,
            configuration: NativeAppConfiguration(kakaoAppKey: nil),
            initialKindergartens: NativePreviewFixtures.kindergartens,
            initialReviews: ReviewsData(version: "2026-03-17", totalCount: 0, kindergartenCount: 0, reviews: [:]),
            searchDebounceDuration: .zero
        )

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await model.primeCurrentDeviceLocationIfAuthorized() }
            group.addTask { await model.centerOnCurrentLocation() }
            await group.waitForAll()
        }

        XCTAssertEqual(provider.requestCount, 1)
        XCTAssertEqual(model.locationLabel, "현재 위치")
        XCTAssertEqual(model.activeSearchType, .currentLocation)
        XCTAssertTrue(model.isCurrentLocationSearchActive)
        XCTAssertEqual(model.currentLocationRecenterRequestID, 0)
    }

    @MainActor
    func testRecenterMapToCurrentLocationUsesCachedDeviceLocation() async {
        let store = InMemoryNativeAppStore()
        let persistence = NativeAppPersistence(store: store)
        let currentLocation = Coordinates(lat: 37.4981, lng: 127.0276)
        let provider = CountingLocationProvider(
            coordinates: currentLocation,
            delayNanoseconds: 0
        )

        let model = NativeAppModel(
            kindergartenRepository: KindergartenRepository { Data() },
            reviewRepository: ReviewRepository(localLoader: { Data() }),
            remoteSearchService: KakaoLocalSuggestionService(
                client: KakaoLocalAPIClient(apiKey: nil)
            ),
            locationProvider: provider,
            persistence: persistence,
            configuration: NativeAppConfiguration(kakaoAppKey: nil),
            initialKindergartens: NativePreviewFixtures.kindergartens,
            initialReviews: ReviewsData(version: "2026-03-17", totalCount: 0, kindergartenCount: 0, reviews: [:]),
            searchDebounceDuration: .zero
        )

        model.setLocation(Coordinates(lat: 37.5665, lng: 126.9780), label: "서울시청", searchType: .address)
        model.updateSearchText("서울시청")

        await model.primeCurrentDeviceLocationIfAuthorized()
        XCTAssertEqual(provider.requestCount, 1)

        await model.recenterMapToCurrentLocation()

        XCTAssertEqual(provider.requestCount, 1)
        XCTAssertEqual(model.userLocation, currentLocation)
        XCTAssertEqual(model.locationLabel, "현재 위치")
        XCTAssertEqual(model.searchText, "")
        XCTAssertEqual(model.activeSearchType, .currentLocation)
        XCTAssertTrue(model.isCurrentLocationSearchActive)
        XCTAssertEqual(model.currentLocationRecenterRequestID, 1)
    }

    @MainActor
    func testSelectSearchSuggestionMapsSearchType() {
        let model = makeNativeAppModel()

        let suggestion = SearchSuggestion(
            id: "test",
            kind: .address,
            title: "강남구 역삼동",
            subtitle: nil,
            coordinates: Coordinates(lat: 37.5, lng: 127.0)
        )
        model.selectSearchSuggestion(suggestion)

        XCTAssertEqual(model.recentSearches.first?.searchType, .address)
    }

    // MARK: - PR 2: Analytics

    @MainActor
    func testAnalyticsTracksSearchAndCompareEvents() throws {
        let mockAnalytics = MockAnalytics()
        let store = InMemoryNativeAppStore()
        let persistence = NativeAppPersistence(store: store)

        let model = NativeAppModel(
            kindergartenRepository: KindergartenRepository { Data() },
            reviewRepository: ReviewRepository(localLoader: { Data() }),
            remoteSearchService: KakaoLocalSuggestionService(
                client: KakaoLocalAPIClient(apiKey: nil)
            ),
            locationProvider: PreviewLocationProvider(coordinates: Coordinates(lat: 37.4981, lng: 127.0276)),
            persistence: persistence,
            configuration: NativeAppConfiguration(kakaoAppKey: nil),
            analytics: mockAnalytics,
            initialKindergartens: NativePreviewFixtures.kindergartens,
            initialReviews: ReviewsData(version: "2026-03-17", totalCount: 0, kindergartenCount: 0, reviews: [:]),
            searchDebounceDuration: .zero
        )

        model.setLocation(Coordinates(lat: 37.4981, lng: 127.0276), label: "test")
        model.updateRadius(to: 5)

        let a001 = try XCTUnwrap(model.results.first(where: { $0.kindercode == "A001" }))
        model.select(kindergarten: a001)
        model.toggleCompare(for: a001)
        model.toggleFavorite(for: a001)

        XCTAssertTrue(mockAnalytics.events.contains(where: { $0.event == .resultTapped }))
        XCTAssertTrue(mockAnalytics.events.contains(where: { $0.event == .compareToggled }))
        XCTAssertTrue(mockAnalytics.events.contains(where: { $0.event == .favoriteToggled }))
        XCTAssertTrue(mockAnalytics.events.contains(where: { $0.event == .searchExecuted }))
    }

    // MARK: - PR 3: Filter helpers

    @MainActor
    func testResetFiltersRestoresDefaults() {
        let model = makeNativeAppModel()
        model.filters.hasBus = true
        model.filters.hasAfterSchool = true
        model.filters.type = .public

        model.resetFilters()

        XCTAssertNil(model.filters.hasBus)
        XCTAssertNil(model.filters.hasAfterSchool)
        XCTAssertEqual(model.filters.type, .all)
        XCTAssertEqual(model.filters.radiusKM, 1)
    }

    @MainActor
    func testHasActiveAdvancedFiltersDetectsEachFilter() {
        let model = makeNativeAppModel()
        XCTAssertFalse(model.hasActiveAdvancedFilters)

        model.filters.hasAfterSchool = true
        XCTAssertTrue(model.hasActiveAdvancedFilters)

        model.filters.hasAfterSchool = nil
        model.filters.type = .public
        XCTAssertTrue(model.hasActiveAdvancedFilters)
    }

    // MARK: - PR 4: Compare helpers

    @MainActor
    func testRemoveCompareAtIndex() throws {
        let model = makeNativeAppModel()
        let a001 = try XCTUnwrap(model.results.first(where: { $0.kindercode == "A001" }))
        let a002 = try XCTUnwrap(model.results.first(where: { $0.kindercode == "A002" }))

        model.toggleCompare(for: a001)
        model.toggleCompare(for: a002)

        model.removeCompare(at: 0)

        XCTAssertEqual(model.compareSelection.ids, ["A002"])
    }

    @MainActor
    func testComparedKindergartenNamesPreservesOrder() throws {
        let model = makeNativeAppModel()
        let a002 = try XCTUnwrap(model.results.first(where: { $0.kindercode == "A002" }))
        let a001 = try XCTUnwrap(model.results.first(where: { $0.kindercode == "A001" }))

        model.toggleCompare(for: a002)
        model.toggleCompare(for: a001)

        XCTAssertEqual(model.comparedKindergartenNames(), ["해맑은유치원", "역삼유치원"])
    }

    // MARK: - PR 6: Advanced filter count

    @MainActor
    func testActiveAdvancedFilterCountAndDescriptions() {
        let model = makeNativeAppModel()
        XCTAssertEqual(model.activeAdvancedFilterCount, 0)
        XCTAssertTrue(model.activeAdvancedFilterDescriptions.isEmpty)

        model.filters.hasAfterSchool = true
        model.filters.hasVacancy = true
        model.filters.type = .public

        XCTAssertEqual(model.activeAdvancedFilterCount, 3)
        XCTAssertEqual(model.activeAdvancedFilterDescriptions.count, 3)

        model.activeAdvancedFilterDescriptions.first(where: { $0.label == "방과후" })?.reset()
        XCTAssertNil(model.filters.hasAfterSchool)
        XCTAssertEqual(model.activeAdvancedFilterCount, 2)
    }

    // MARK: - PR 8: FTUE

    @MainActor
    func testFirstLaunchInitialState() {
        let store = InMemoryNativeAppStore()
        let persistence = NativeAppPersistence(store: store)

        let model = NativeAppModel(
            kindergartenRepository: KindergartenRepository { Data() },
            reviewRepository: ReviewRepository(localLoader: { Data() }),
            remoteSearchService: KakaoLocalSuggestionService(
                client: KakaoLocalAPIClient(apiKey: nil)
            ),
            locationProvider: PreviewLocationProvider(coordinates: Coordinates(lat: 37.4981, lng: 127.0276)),
            persistence: persistence,
            configuration: NativeAppConfiguration(kakaoAppKey: nil),
            searchDebounceDuration: .zero
        )

        XCTAssertTrue(model.isFirstLaunch)

        model.completeFirstLaunch()
        XCTAssertFalse(model.isFirstLaunch)

        let model2 = NativeAppModel(
            kindergartenRepository: KindergartenRepository { Data() },
            reviewRepository: ReviewRepository(localLoader: { Data() }),
            remoteSearchService: KakaoLocalSuggestionService(
                client: KakaoLocalAPIClient(apiKey: nil)
            ),
            locationProvider: PreviewLocationProvider(coordinates: Coordinates(lat: 37.4981, lng: 127.0276)),
            persistence: persistence,
            configuration: NativeAppConfiguration(kakaoAppKey: nil),
            searchDebounceDuration: .zero
        )

        XCTAssertFalse(model2.isFirstLaunch)
    }

    @MainActor
    func testLocationDeniedShowsPermissionRecoveryWithoutFocusingSearchField() async {
        let store = InMemoryNativeAppStore()
        let persistence = NativeAppPersistence(store: store)

        let model = NativeAppModel(
            kindergartenRepository: KindergartenRepository { Data() },
            reviewRepository: ReviewRepository(localLoader: { Data() }),
            remoteSearchService: KakaoLocalSuggestionService(
                client: KakaoLocalAPIClient(apiKey: nil)
            ),
            locationProvider: FailingLocationProvider(),
            persistence: persistence,
            configuration: NativeAppConfiguration(kakaoAppKey: nil),
            searchDebounceDuration: .zero
        )

        await model.centerOnCurrentLocation()

        XCTAssertFalse(model.shouldFocusSearchField)
        XCTAssertNotNil(model.locationError)
        XCTAssertEqual(model.locationPermissionState, .denied)
        XCTAssertEqual(model.searchHomePresentationState, .permissionRecovery)
    }

    @MainActor
    func testSearchInteractionCompletesFirstLaunchState() {
        let store = InMemoryNativeAppStore()
        let persistence = NativeAppPersistence(store: store)

        let model = NativeAppModel(
            kindergartenRepository: KindergartenRepository { Data() },
            reviewRepository: ReviewRepository(localLoader: { Data() }),
            remoteSearchService: KakaoLocalSuggestionService(
                client: KakaoLocalAPIClient(apiKey: nil)
            ),
            locationProvider: PreviewLocationProvider(coordinates: Coordinates(lat: 37.4981, lng: 127.0276)),
            persistence: persistence,
            configuration: NativeAppConfiguration(kakaoAppKey: nil),
            initialKindergartens: NativePreviewFixtures.kindergartens,
            initialReviews: ReviewsData(version: "2026-03-17", totalCount: 0, kindergartenCount: 0, reviews: [:]),
            searchDebounceDuration: .zero
        )

        XCTAssertEqual(model.searchHomePresentationState, .firstVisit)

        model.focusSearchField()

        XCTAssertFalse(model.isFirstLaunch)
        XCTAssertTrue(model.shouldFocusSearchField)
        XCTAssertEqual(model.searchHomePresentationState, .normal)
    }
}

private final class FailingLocationProvider: CurrentLocationProviding {
    func requestCurrentLocation() async throws -> Coordinates {
        throw LocationServiceError.authorizationDenied
    }

    func permissionState() -> LocationPermissionState {
        .denied
    }
}

private final class CountingLocationProvider: CurrentLocationProviding {
    private let coordinates: Coordinates
    private let delayNanoseconds: UInt64
    private let lock = NSLock()
    private var _requestCount = 0

    init(coordinates: Coordinates, delayNanoseconds: UInt64) {
        self.coordinates = coordinates
        self.delayNanoseconds = delayNanoseconds
    }

    var requestCount: Int {
        lock.lock()
        defer { lock.unlock() }
        return _requestCount
    }

    func requestCurrentLocation() async throws -> Coordinates {
        lock.lock()
        _requestCount += 1
        lock.unlock()

        try await Task.sleep(nanoseconds: delayNanoseconds)
        return coordinates
    }

    func permissionState() -> LocationPermissionState {
        .granted
    }
}

@MainActor
private func makeNativeAppModel() -> NativeAppModel {
    let store = InMemoryNativeAppStore()
    let persistence = NativeAppPersistence(store: store)

    let model = NativeAppModel(
        kindergartenRepository: KindergartenRepository { Data() },
        reviewRepository: ReviewRepository(localLoader: { Data() }),
        remoteSearchService: KakaoLocalSuggestionService(
            client: KakaoLocalAPIClient(apiKey: nil)
        ),
        locationProvider: PreviewLocationProvider(coordinates: Coordinates(lat: 37.4981, lng: 127.0276)),
        persistence: persistence,
        configuration: NativeAppConfiguration(kakaoAppKey: nil),
        initialKindergartens: NativePreviewFixtures.kindergartens,
        initialReviews: ReviewsData(version: "2026-03-17", totalCount: 0, kindergartenCount: 0, reviews: [:]),
        searchDebounceDuration: .zero
    )

    model.setLocation(Coordinates(lat: 37.4981, lng: 127.0276), label: "서울 강남구 역삼동")
    model.updateRadius(to: 5)
    return model
}
