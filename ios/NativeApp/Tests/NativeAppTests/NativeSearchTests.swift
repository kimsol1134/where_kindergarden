import XCTest
@testable import Features
@testable import Models
@testable import Services

final class NativeSearchTests: XCTestCase {
    func testSearchResultsSheetPolicyClampsPeekHeight() {
        let compactHeight = SearchResultsSheetPolicy.height(
            for: .peek,
            maximumDetentValue: 500
        )
        let tallHeight = SearchResultsSheetPolicy.height(
            for: .peek,
            maximumDetentValue: 1_000
        )

        XCTAssertEqual(compactHeight, 200, accuracy: 0.0001)
        XCTAssertEqual(tallHeight, 320, accuracy: 0.0001)
    }

    func testSearchResultsSheetPolicySnapsToNearestDetent() {
        XCTAssertEqual(
            SearchResultsSheetPolicy.nearestDetent(
                for: 210,
                maximumDetentValue: 500
            ),
            .peek
        )
        XCTAssertEqual(
            SearchResultsSheetPolicy.nearestDetent(
                for: 290,
                maximumDetentValue: 500
            ),
            .mid
        )
        XCTAssertEqual(
            SearchResultsSheetPolicy.nearestDetent(
                for: 430,
                maximumDetentValue: 500
            ),
            .expanded
        )
    }

    func testSearchResultsSheetPolicyShowsSheetOnlyOnSearchTabWhenSuggestionsHidden() {
        XCTAssertTrue(
            SearchResultsSheetPolicy.shouldPresentResultsSheet(
                isSearchPanelPresented: false,
                isSearchTabSelected: true
            )
        )
        XCTAssertFalse(
            SearchResultsSheetPolicy.shouldPresentResultsSheet(
                isSearchPanelPresented: true,
                isSearchTabSelected: true
            )
        )
        XCTAssertFalse(
            SearchResultsSheetPolicy.shouldPresentResultsSheet(
                isSearchPanelPresented: false,
                isSearchTabSelected: false
            )
        )
    }

    func testSearchResultsSheetPolicyPrefersMidDetentWhenSearchHasContext() {
        XCTAssertEqual(
            SearchResultsSheetPolicy.preferredDetentAfterSuggestionPanelDismiss(
                resultsCount: 3,
                hasSearchContext: true
            ),
            .mid
        )
        XCTAssertEqual(
            SearchResultsSheetPolicy.preferredDetentAfterSuggestionPanelDismiss(
                resultsCount: 0,
                hasSearchContext: false
            ),
            .peek
        )
    }

    func testSearchLensToggleResetsOtherAdvancedFiltersAndSetsRequestedLens() {
        var filters = SearchFilters(
            radiusKM: 2,
            type: .private,
            hasBus: nil,
            hasVacancy: nil,
            hasAfterSchool: nil,
            hasIndoorPlayground: true,
            hasLargeSpace: nil,
            hasModernBuilding: true,
            sort: .capacity
        )

        filters = SearchLens.toggledFilters(from: filters, lens: .bus)

        XCTAssertEqual(filters.radiusKM, 2)
        XCTAssertEqual(filters.sort, .capacity)
        XCTAssertEqual(filters.type, .all)
        XCTAssertEqual(filters.hasBus, true)
        XCTAssertNil(filters.hasVacancy)
        XCTAssertNil(filters.hasAfterSchool)
        XCTAssertNil(filters.hasIndoorPlayground)
        XCTAssertNil(filters.hasLargeSpace)
        XCTAssertNil(filters.hasModernBuilding)
        XCTAssertEqual(SearchLens.activeLens(in: filters), .bus)
    }

    @MainActor
    func testNativeAppModelFitReasonsPrioritizeActiveLens() {
        let model = makeModel()
        let kindergarten = KindergartenSearchEngine()
            .makeKindergartens(
                raws: NativePreviewFixtures.kindergartens,
                relativeTo: Coordinates(lat: 37.4981, lng: 127.0276)
            )
            .first(where: { $0.kindercode == "A001" })!

        model.applySearchLens(.bus)

        let reasons = model.fitReasons(for: kindergarten)

        XCTAssertEqual(reasons.first?.title, "셔틀")
    }

    func testKakaoAddressResponseDecodesRoadAddressAndCoordinates() throws {
        let json = """
        {
          "documents": [
            {
              "address_name": "서울 강남구 역삼동 123-45",
              "x": "127.02758",
              "y": "37.49810",
              "address": {
                "address_name": "서울 강남구 역삼동 123-45",
                "region_1depth_name": "서울",
                "region_2depth_name": "강남구",
                "region_3depth_name": "역삼동",
                "h_code": "1168064000",
                "b_code": "1168010100"
              },
              "road_address": {
                "address_name": "서울 강남구 역삼로 123",
                "road_name": "역삼로",
                "region_1depth_name": "서울",
                "region_2depth_name": "강남구",
                "region_3depth_name": "역삼동"
              }
            }
          ],
          "meta": {
            "total_count": 1,
            "pageable_count": 1,
            "is_end": true
          }
        }
        """

        let response = try JSONDecoder().decode(KakaoAddressSearchResponse.self, from: Data(json.utf8))

        XCTAssertEqual(response.meta.totalCount, 1)
        XCTAssertEqual(response.documents.first?.roadAddress?.addressName, "서울 강남구 역삼로 123")
        XCTAssertEqual(response.documents.first?.coordinates, Coordinates(lat: 37.49810, lng: 127.02758))
    }

    func testKakaoKeywordSearchRequestBuildsQueryWithOriginAndRadius() throws {
        let request = try KakaoKeywordSearchRequest(
            query: "역삼역",
            page: 2,
            size: 7,
            origin: Coordinates(lat: 37.49810, lng: 127.02758),
            radiusMeters: 5000
        )
        .makeURLRequest(
            baseURL: URL(string: "https://dapi.kakao.com")!,
            apiKey: "test-key"
        )

        let components = try XCTUnwrap(URLComponents(url: try XCTUnwrap(request.url), resolvingAgainstBaseURL: false))
        let queryItems = Dictionary(uniqueKeysWithValues: (components.queryItems ?? []).compactMap { item in
            item.value.map { (item.name, $0) }
        })

        XCTAssertEqual(components.path, "/v2/local/search/keyword.json")
        XCTAssertEqual(queryItems["query"], "역삼역")
        XCTAssertEqual(queryItems["page"], "2")
        XCTAssertEqual(queryItems["size"], "7")
        XCTAssertEqual(queryItems["x"], "127.02758")
        XCTAssertEqual(queryItems["y"], "37.4981")
        XCTAssertEqual(queryItems["radius"], "5000")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "KakaoAK test-key")
    }

    func testKakaoSuggestionServiceReturnsDegradedResultWhenAPIKeyMissing() async {
        let service = KakaoLocalSuggestionService(
            client: KakaoLocalAPIClient(apiKey: nil)
        )

        let result = await service.suggestions(for: "강남역", near: nil)

        XCTAssertTrue(result.suggestions.isEmpty)
        XCTAssertEqual(result.message, service.unavailableMessage)
    }

    @MainActor
    func testSearchModelSelectsLocalKindergartenSuggestionAndUpdatesResults() throws {
        let model = makeModel(
            remoteSearchService: TestRemoteLocationSearchService(
                isConfigured: false,
                unavailableMessage: "remote-off",
                result: RemoteLocationSearchResult(suggestions: [])
            )
        )

        model.updateSearchText("역삼")

        let suggestion = try XCTUnwrap(model.localSearchSuggestions.first)
        model.selectSearchSuggestion(suggestion)

        XCTAssertEqual(model.locationLabel, "역삼유치원")
        XCTAssertEqual(model.userLocation, Coordinates(lat: 37.4981, lng: 127.0276))
        XCTAssertEqual(model.results.first?.kindercode, "A001")
        XCTAssertEqual(model.results.first?.distance ?? -1, 0, accuracy: 0.01)
        XCTAssertEqual(model.recentSearches.first?.label, "역삼유치원")
        XCTAssertEqual(model.searchText, "역삼유치원")
    }

    @MainActor
    func testSearchModelSelectsRemoteAddressSuggestionAndUpdatesLocation() {
        let model = makeModel()
        let suggestion = SearchSuggestion(
            id: "address:test",
            kind: .address,
            title: "서울 강남구 역삼로 123",
            subtitle: "서울 강남구 역삼동 123-45",
            coordinates: Coordinates(lat: 37.4981, lng: 127.0276)
        )

        model.selectSearchSuggestion(suggestion)

        XCTAssertEqual(model.locationLabel, "서울 강남구 역삼로 123")
        XCTAssertEqual(model.userLocation, Coordinates(lat: 37.4981, lng: 127.0276))
        XCTAssertEqual(model.results.first?.kindercode, "A001")
        XCTAssertEqual(model.recentSearches.first?.label, "서울 강남구 역삼로 123")
    }

    @MainActor
    func testSearchModelSelectsRemotePlaceSuggestionAndUpdatesLocation() {
        let model = makeModel()
        let suggestion = SearchSuggestion(
            id: "place:test",
            kind: .place,
            title: "서초구청",
            subtitle: "서울 서초구 서초대로 1",
            coordinates: Coordinates(lat: 37.4915, lng: 127.0177)
        )

        model.selectSearchSuggestion(suggestion)

        XCTAssertEqual(model.locationLabel, "서초구청")
        XCTAssertEqual(model.userLocation, Coordinates(lat: 37.4915, lng: 127.0177))
        XCTAssertEqual(model.results.first?.kindercode, "A003")
        XCTAssertEqual(model.searchText, "서초구청")
    }

    @MainActor
    func testSearchModelKeepsDeviceLocationSeparateFromSearchCenter() async {
        let currentLocation = Coordinates(lat: 37.4981, lng: 127.0276)
        let model = makeModel(
            locationProvider: PreviewLocationProvider(coordinates: currentLocation)
        )
        let suggestion = SearchSuggestion(
            id: "place:test",
            kind: .place,
            title: "서초구청",
            subtitle: "서울 서초구 서초대로 1",
            coordinates: Coordinates(lat: 37.4915, lng: 127.0177)
        )

        await model.centerOnCurrentLocation()

        XCTAssertEqual(model.searchText, "")
        XCTAssertEqual(model.locationLabel, "현재 위치")
        model.selectSearchSuggestion(suggestion)

        XCTAssertEqual(model.currentDeviceLocation, currentLocation)
        XCTAssertEqual(model.userLocation, Coordinates(lat: 37.4915, lng: 127.0177))
        XCTAssertEqual(model.locationLabel, "서초구청")
    }

    func testSearchMapCameraDecisionIgnoresPassiveCurrentLocationUpdate() {
        let marker = SearchMapMarker(
            id: "A001",
            title: "역삼유치원",
            coordinates: Coordinates(lat: 37.4981, lng: 127.0276),
            compareOrder: nil
        )
        let previous = SearchMapViewState(
            center: Coordinates(lat: 37.4981, lng: 127.0276),
            currentLocation: nil,
            markers: [marker],
            selectedKindergartenID: nil,
            currentLocationRecenterRequestID: 0
        )
        let next = SearchMapViewState(
            center: Coordinates(lat: 37.4981, lng: 127.0276),
            currentLocation: Coordinates(lat: 37.4970, lng: 127.0280),
            markers: [marker],
            selectedKindergartenID: nil,
            currentLocationRecenterRequestID: 0
        )

        XCTAssertEqual(
            SearchMapCameraDecision.command(
                previousRenderedState: previous,
                nextState: next,
                isPerformingExplicitCurrentLocationRecenter: false
            ),
            .none
        )
    }

    func testSearchMapCameraDecisionCentersOnExplicitRecenterRequest() {
        let currentLocation = Coordinates(lat: 37.4970, lng: 127.0280)
        let marker = SearchMapMarker(
            id: "A001",
            title: "역삼유치원",
            coordinates: Coordinates(lat: 37.4981, lng: 127.0276),
            compareOrder: nil
        )
        let previous = SearchMapViewState(
            center: Coordinates(lat: 37.4981, lng: 127.0276),
            currentLocation: currentLocation,
            markers: [marker],
            selectedKindergartenID: nil,
            currentLocationRecenterRequestID: 0
        )
        let next = SearchMapViewState(
            center: Coordinates(lat: 37.4981, lng: 127.0276),
            currentLocation: currentLocation,
            markers: [marker],
            selectedKindergartenID: nil,
            currentLocationRecenterRequestID: 1
        )

        XCTAssertEqual(
            SearchMapCameraDecision.command(
                previousRenderedState: previous,
                nextState: next,
                isPerformingExplicitCurrentLocationRecenter: false
            ),
            .centerOnCurrentLocation
        )
    }

    @MainActor
    func testSearchModelRestoresRecentSearchAndKeepsSearchTabActive() {
        let model = makeModel()
        let recent = RecentSearch(
            label: "서울시청",
            coordinates: Coordinates(lat: 37.5665, lng: 126.9780)
        )

        model.restoreRecentSearch(recent)

        XCTAssertEqual(model.locationLabel, "서울시청")
        XCTAssertEqual(model.userLocation, Coordinates(lat: 37.5665, lng: 126.9780))
        XCTAssertEqual(model.selectedTab, .search)
        XCTAssertEqual(model.searchText, "서울시청")
        XCTAssertEqual(model.recentSearches.first?.label, "서울시청")
    }

    @MainActor
    func testSearchModelRestoresCurrentLocationRecentSearchWithoutQueryText() {
        let model = makeModel()
        let currentLocation = Coordinates(lat: 37.4981, lng: 127.0276)
        let recent = RecentSearch(
            label: "현재 위치",
            coordinates: currentLocation,
            displayName: "현재 위치",
            searchType: .currentLocation
        )

        model.restoreRecentSearch(recent)

        XCTAssertEqual(model.locationLabel, "현재 위치")
        XCTAssertEqual(model.userLocation, currentLocation)
        XCTAssertEqual(model.selectedTab, .search)
        XCTAssertEqual(model.searchText, "")
        XCTAssertEqual(model.activeSearchType, .currentLocation)
        XCTAssertTrue(model.isCurrentLocationSearchActive)
    }

    @MainActor
    func testSearchModelRemovesSingleRecentSearch() {
        let model = makeModel()
        let cityHall = RecentSearch(
            label: "서울시청",
            coordinates: Coordinates(lat: 37.5665, lng: 126.9780)
        )
        let gangnam = RecentSearch(
            label: "강남역",
            coordinates: Coordinates(lat: 37.4979, lng: 127.0276)
        )

        model.restoreRecentSearch(cityHall)
        model.restoreRecentSearch(gangnam)
        model.removeRecentSearch(gangnam)

        XCTAssertEqual(model.recentSearches.map(\.label), ["서울시청"])
    }

    @MainActor
    func testSearchModelClearsRecentSearches() {
        let model = makeModel()

        model.restoreRecentSearch(
            RecentSearch(
                label: "서울시청",
                coordinates: Coordinates(lat: 37.5665, lng: 126.9780)
            )
        )
        model.restoreRecentSearch(
            RecentSearch(
                label: "강남역",
                coordinates: Coordinates(lat: 37.4979, lng: 127.0276)
            )
        )

        model.clearRecentSearches()

        XCTAssertTrue(model.recentSearches.isEmpty)
    }

    @MainActor
    func testSearchModelFallsBackToLocalSuggestionsWhenRuntimeConfigMissing() {
        let service = KakaoLocalSuggestionService(
            client: KakaoLocalAPIClient(apiKey: nil)
        )
        let model = makeModel(remoteSearchService: service)

        model.updateSearchText("역삼")

        XCTAssertEqual(model.localSearchSuggestions.map(\.title), ["역삼유치원"])
        XCTAssertTrue(model.remoteSearchSuggestions.isEmpty)
        XCTAssertEqual(model.searchSuggestionMessage, service.unavailableMessage)
        XCTAssertFalse(model.isSearchSuggestionsLoading)
    }

    @MainActor
    private func makeModel(
        remoteSearchService: any RemoteLocationSuggesting = TestRemoteLocationSearchService(),
        locationProvider: CurrentLocationProviding = PreviewLocationProvider(
            coordinates: Coordinates(lat: 37.4981, lng: 127.0276)
        )
    ) -> NativeAppModel {
        let store = InMemoryNativeAppStore()
        let persistence = NativeAppPersistence(store: store)

        return NativeAppModel(
            kindergartenRepository: KindergartenJSONRepository { Data() },
            reviewRepository: ReviewRepository(localLoader: { Data() }),
            remoteSearchService: remoteSearchService,
            locationProvider: locationProvider,
            persistence: persistence,
            configuration: NativeAppConfiguration(kakaoAppKey: nil, kakaoRESTAPIKey: nil),
            initialKindergartens: NativePreviewFixtures.kindergartens,
            initialReviews: ReviewsData(version: "2026-03-17", totalCount: 0, kindergartenCount: 0, reviews: [:]),
            searchDebounceDuration: .zero
        )
    }
}

private struct TestRemoteLocationSearchService: RemoteLocationSuggesting {
    let isConfigured: Bool
    let unavailableMessage: String
    let result: RemoteLocationSearchResult

    init(
        isConfigured: Bool = true,
        unavailableMessage: String = "remote-off",
        result: RemoteLocationSearchResult = RemoteLocationSearchResult(suggestions: [])
    ) {
        self.isConfigured = isConfigured
        self.unavailableMessage = unavailableMessage
        self.result = result
    }

    func suggestions(for query: String, near origin: Coordinates?) async -> RemoteLocationSearchResult {
        result
    }
}
