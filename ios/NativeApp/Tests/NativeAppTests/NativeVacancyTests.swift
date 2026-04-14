import XCTest
@testable import Features
@testable import Models
@testable import Services

final class NativeVacancyTests: XCTestCase {
    @MainActor
    func testVacancyRepositoryFallsBackToLocalDataWhenRemoteFails() async throws {
        let localJSON = """
        {
          "version": "2026-03-19",
          "source": "local",
          "aidYear": "2026",
          "totalCount": 1,
          "positiveCount": 1,
          "items": {
            "A001": {
              "kindercode": "A001",
              "aidYear": "2026",
              "vacancyCount": 2,
              "updatedAt": "2026-03-19T00:00:00Z",
              "preschCd": null,
              "upperEduOfficeCd": null,
              "eduOfficeCd": null,
              "foundType": "국공립",
              "name": "역삼유치원",
              "address": "서울 강남구 역삼로 123",
              "phone": "02-1234-5678",
              "detail": []
            }
          }
        }
        """

        let repository = VacancyRepository(
            remoteLoader: {
                throw NativeAppDataError.invalidHTTPStatus(500)
            },
            localLoader: {
                Data(localJSON.utf8)
            }
        )

        await repository.load()
        let dataset = try XCTUnwrap(repository.vacancyData)

        XCTAssertEqual(dataset.version, "2026-03-19")
        XCTAssertEqual(dataset.items["A001"]?.vacancyCount, 2)
    }

    @MainActor
    func testNativeModelExposesVacancySummary() {
        let store = InMemoryNativeAppStore()
        let persistence = NativeAppPersistence(store: store)
        let vacancyDataset = VacancyDataset(
            version: "2026-03-19",
            source: "test",
            aidYear: "2026",
            totalCount: 2,
            positiveCount: 1,
            items: [
                "A001": VacancySummary(
                    kindercode: "A001",
                    aidYear: "2026",
                    vacancyCount: 2,
                    updatedAt: "2026-03-19T00:00:00Z",
                    preschCd: nil,
                    upperEduOfficeCd: nil,
                    eduOfficeCd: nil,
                    foundType: "국공립",
                    name: "역삼유치원",
                    address: "서울 강남구 역삼로 123",
                    phone: "02-1234-5678",
                    detail: [
                        VacancyDetailRow(rowNo: 1, age: "만 4세", course: "일반과정", vacancyCount: 2)
                    ]
                ),
                "A002": VacancySummary(
                    kindercode: "A002",
                    aidYear: "2026",
                    vacancyCount: 0,
                    updatedAt: nil,
                    preschCd: nil,
                    upperEduOfficeCd: nil,
                    eduOfficeCd: nil,
                    foundType: "사립",
                    name: "해맑은유치원",
                    address: "서울 강남구 도곡로 47",
                    phone: "02-9876-5432",
                    detail: []
                ),
            ]
        )

        let model = NativeAppModel(
            kindergartenRepository: KindergartenRepository { Data() },
            reviewRepository: ReviewRepository(localLoader: { Data() }),
            remoteSearchService: KakaoLocalSuggestionService(client: KakaoLocalAPIClient(apiKey: nil)),
            locationProvider: PreviewLocationProvider(coordinates: Coordinates(lat: 37.4981, lng: 127.0276)),
            persistence: persistence,
            configuration: NativeAppConfiguration(kakaoAppKey: nil),
            initialKindergartens: NativePreviewFixtures.kindergartens,
            initialReviews: ReviewsData(version: "2026-03-17", totalCount: 0, kindergartenCount: 0, reviews: [:]),
            initialVacancy: vacancyDataset
        )

        XCTAssertEqual(model.vacancyCount(for: "A001"), 2)
        XCTAssertEqual(model.vacancy(for: "A001")?.detail.first?.age, "만 4세")
        XCTAssertEqual(model.vacancyCount(for: "A002"), 0)
        XCTAssertNil(model.vacancy(for: "UNKNOWN"))
    }
}
