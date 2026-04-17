import XCTest
@testable import Domain
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
}
