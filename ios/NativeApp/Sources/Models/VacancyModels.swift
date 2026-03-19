import Foundation

public struct VacancyDetailRow: Codable, Hashable, Sendable, Identifiable {
    public let rowNo: Int
    public let age: String
    public let course: String
    public let vacancyCount: Int

    public var id: String {
        "\(rowNo)-\(age)-\(course)"
    }

    public init(rowNo: Int, age: String, course: String, vacancyCount: Int) {
        self.rowNo = rowNo
        self.age = age
        self.course = course
        self.vacancyCount = vacancyCount
    }
}

public struct VacancySummary: Codable, Hashable, Sendable, Identifiable {
    public let kindercode: String
    public let aidYear: String
    public let vacancyCount: Int
    public let updatedAt: String?
    public let preschCd: String?
    public let upperEduOfficeCd: String?
    public let eduOfficeCd: String?
    public let foundType: String?
    public let name: String
    public let address: String
    public let phone: String?
    public let detail: [VacancyDetailRow]

    public var id: String { kindercode }

    public init(
        kindercode: String,
        aidYear: String,
        vacancyCount: Int,
        updatedAt: String?,
        preschCd: String?,
        upperEduOfficeCd: String?,
        eduOfficeCd: String?,
        foundType: String?,
        name: String,
        address: String,
        phone: String?,
        detail: [VacancyDetailRow]
    ) {
        self.kindercode = kindercode
        self.aidYear = aidYear
        self.vacancyCount = vacancyCount
        self.updatedAt = updatedAt
        self.preschCd = preschCd
        self.upperEduOfficeCd = upperEduOfficeCd
        self.eduOfficeCd = eduOfficeCd
        self.foundType = foundType
        self.name = name
        self.address = address
        self.phone = phone
        self.detail = detail
    }
}

public struct VacancyDataset: Codable, Hashable, Sendable {
    public let version: String
    public let source: String
    public let aidYear: String
    public let totalCount: Int
    public let positiveCount: Int
    public let items: [String: VacancySummary]

    public init(
        version: String,
        source: String,
        aidYear: String,
        totalCount: Int,
        positiveCount: Int,
        items: [String: VacancySummary]
    ) {
        self.version = version
        self.source = source
        self.aidYear = aidYear
        self.totalCount = totalCount
        self.positiveCount = positiveCount
        self.items = items
    }
}

public extension VacancyDataset {
    static let empty = VacancyDataset(
        version: "",
        source: "",
        aidYear: "",
        totalCount: 0,
        positiveCount: 0,
        items: [:]
    )
}
