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
}
