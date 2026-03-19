import Foundation

public struct Coordinates: Codable, Hashable, Sendable {
    public let lat: Double
    public let lng: Double

    public init(lat: Double, lng: Double) {
        self.lat = lat
        self.lng = lng
    }
}

public enum InstitutionType: String, Codable, CaseIterable, Hashable, Sendable {
    case `public` = "public"
    case `private` = "private"
    case home = "home"

    public var label: String {
        switch self {
        case .public:
            return "국공립"
        case .private:
            return "사립"
        case .home:
            return "가정"
        }
    }
}

public enum InstitutionFilter: String, Codable, CaseIterable, Hashable, Sendable {
    case all
    case `public`
    case `private`
    case home

    public var label: String {
        switch self {
        case .all: return "전체"
        case .public: return "국공립"
        case .private: return "사립"
        case .home: return "가정"
        }
    }
}

public enum SortOption: String, Codable, CaseIterable, Hashable, Sendable {
    case distance
    case capacity
    case areaPerChild

    public var label: String {
        switch self {
        case .distance: return "거리순"
        case .capacity: return "정원순"
        case .areaPerChild: return "면적순"
        }
    }
}

public enum MealType: String, Codable, Hashable, Sendable {
    case direct
    case outsourced
    case none
}

public struct KindergartenRaw: Codable, Identifiable, Hashable, Sendable {
    public let kindercode: String
    public let name: String
    public let address: String
    public let lat: Double
    public let lng: Double
    public let type: InstitutionType
    public let phone: String?
    public let homepage: String?
    public let operationHours: String?
    public let sidoCode: String
    public let sigunguCode: String
    public let capacity: Int
    public let currentCount: Int
    public let classCountAge3: Int
    public let classCountAge4: Int
    public let classCountAge5: Int
    public let capacityAge3: Int
    public let capacityAge4: Int
    public let capacityAge5: Int
    public let currentAge3: Int
    public let currentAge4: Int
    public let currentAge5: Int
    public let classCountMix: Int
    public let capacityMix: Int
    public let currentMix: Int
    public let capacitySpecial: Int
    public let currentSpecial: Int
    public let establishDate: String
    public let hasBus: Bool
    public let busCount: Int
    public let mealType: MealType?
    public let hasAfterSchool: Bool
    public let areaPerChild: Double
    public let hasPlayground: Bool
    public let buildingYear: Int?
    public let floorInfo: String?
    public let classroomArea: Double
    public let indoorPlaygroundArea: Double
    public let outdoorPlaygroundArea: Double
    public let teacherCount: Int
    public let seniorTeacherCount: Int
    public let cctvCount: Int

    public var id: String { kindercode }

    public init(
        kindercode: String,
        name: String,
        address: String,
        lat: Double,
        lng: Double,
        type: InstitutionType,
        phone: String?,
        homepage: String?,
        operationHours: String?,
        sidoCode: String,
        sigunguCode: String,
        capacity: Int,
        currentCount: Int,
        classCountAge3: Int,
        classCountAge4: Int,
        classCountAge5: Int,
        capacityAge3: Int,
        capacityAge4: Int,
        capacityAge5: Int,
        currentAge3: Int,
        currentAge4: Int,
        currentAge5: Int,
        classCountMix: Int,
        capacityMix: Int,
        currentMix: Int,
        capacitySpecial: Int,
        currentSpecial: Int,
        establishDate: String,
        hasBus: Bool,
        busCount: Int,
        mealType: MealType?,
        hasAfterSchool: Bool,
        areaPerChild: Double,
        hasPlayground: Bool,
        buildingYear: Int?,
        floorInfo: String?,
        classroomArea: Double,
        indoorPlaygroundArea: Double,
        outdoorPlaygroundArea: Double,
        teacherCount: Int,
        seniorTeacherCount: Int,
        cctvCount: Int
    ) {
        self.kindercode = kindercode
        self.name = name
        self.address = address
        self.lat = lat
        self.lng = lng
        self.type = type
        self.phone = phone
        self.homepage = homepage
        self.operationHours = operationHours
        self.sidoCode = sidoCode
        self.sigunguCode = sigunguCode
        self.capacity = capacity
        self.currentCount = currentCount
        self.classCountAge3 = classCountAge3
        self.classCountAge4 = classCountAge4
        self.classCountAge5 = classCountAge5
        self.capacityAge3 = capacityAge3
        self.capacityAge4 = capacityAge4
        self.capacityAge5 = capacityAge5
        self.currentAge3 = currentAge3
        self.currentAge4 = currentAge4
        self.currentAge5 = currentAge5
        self.classCountMix = classCountMix
        self.capacityMix = capacityMix
        self.currentMix = currentMix
        self.capacitySpecial = capacitySpecial
        self.currentSpecial = currentSpecial
        self.establishDate = establishDate
        self.hasBus = hasBus
        self.busCount = busCount
        self.mealType = mealType
        self.hasAfterSchool = hasAfterSchool
        self.areaPerChild = areaPerChild
        self.hasPlayground = hasPlayground
        self.buildingYear = buildingYear
        self.floorInfo = floorInfo
        self.classroomArea = classroomArea
        self.indoorPlaygroundArea = indoorPlaygroundArea
        self.outdoorPlaygroundArea = outdoorPlaygroundArea
        self.teacherCount = teacherCount
        self.seniorTeacherCount = seniorTeacherCount
        self.cctvCount = cctvCount
    }

    enum CodingKeys: String, CodingKey {
        case kindercode
        case name
        case address
        case lat
        case lng
        case type
        case phone
        case homepage
        case operationHours = "operation_hours"
        case sidoCode = "sido_code"
        case sigunguCode = "sigungu_code"
        case capacity
        case currentCount = "current_count"
        case classCountAge3 = "class_count_age3"
        case classCountAge4 = "class_count_age4"
        case classCountAge5 = "class_count_age5"
        case capacityAge3 = "capacity_age3"
        case capacityAge4 = "capacity_age4"
        case capacityAge5 = "capacity_age5"
        case currentAge3 = "current_age3"
        case currentAge4 = "current_age4"
        case currentAge5 = "current_age5"
        case classCountMix = "class_count_mix"
        case capacityMix = "capacity_mix"
        case currentMix = "current_mix"
        case capacitySpecial = "capacity_special"
        case currentSpecial = "current_special"
        case establishDate = "establish_date"
        case hasBus = "has_bus"
        case busCount = "bus_count"
        case mealType = "meal_type"
        case hasAfterSchool = "has_after_school"
        case areaPerChild = "area_per_child"
        case hasPlayground = "has_playground"
        case buildingYear = "building_year"
        case floorInfo = "floor_info"
        case classroomArea = "classroom_area"
        case indoorPlaygroundArea = "indoor_playground_area"
        case outdoorPlaygroundArea = "outdoor_playground_area"
        case teacherCount = "teacher_count"
        case seniorTeacherCount = "senior_teacher_count"
        case cctvCount = "cctv_count"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        func decode<T: Decodable>(_ type: T.Type, for key: CodingKeys) throws -> T {
            try container.decode(T.self, forKey: key)
        }

        kindercode = try decode(String.self, for: .kindercode)
        name = try decode(String.self, for: .name)
        address = try decode(String.self, for: .address)
        lat = try decode(Double.self, for: .lat)
        lng = try decode(Double.self, for: .lng)
        type = try decode(InstitutionType.self, for: .type)
        phone = try container.decodeIfPresent(String.self, forKey: .phone)
        homepage = try container.decodeIfPresent(String.self, forKey: .homepage)
        operationHours = try container.decodeIfPresent(String.self, forKey: .operationHours)
        sidoCode = try decode(String.self, for: .sidoCode)
        sigunguCode = try decode(String.self, for: .sigunguCode)
        capacity = try decode(Int.self, for: .capacity)
        currentCount = try decode(Int.self, for: .currentCount)
        classCountAge3 = try decode(Int.self, for: .classCountAge3)
        classCountAge4 = try decode(Int.self, for: .classCountAge4)
        classCountAge5 = try decode(Int.self, for: .classCountAge5)
        capacityAge3 = try decode(Int.self, for: .capacityAge3)
        capacityAge4 = try decode(Int.self, for: .capacityAge4)
        capacityAge5 = try decode(Int.self, for: .capacityAge5)
        currentAge3 = try decode(Int.self, for: .currentAge3)
        currentAge4 = try decode(Int.self, for: .currentAge4)
        currentAge5 = try decode(Int.self, for: .currentAge5)
        classCountMix = try decode(Int.self, for: .classCountMix)
        capacityMix = try decode(Int.self, for: .capacityMix)
        currentMix = try decode(Int.self, for: .currentMix)
        capacitySpecial = try decode(Int.self, for: .capacitySpecial)
        currentSpecial = try decode(Int.self, for: .currentSpecial)
        establishDate = try decode(String.self, for: .establishDate)
        hasBus = try decode(Bool.self, for: .hasBus)
        busCount = try decode(Int.self, for: .busCount)
        mealType = try container.decodeIfPresent(MealType.self, forKey: .mealType)
        hasAfterSchool = try decode(Bool.self, for: .hasAfterSchool)
        areaPerChild = try decode(Double.self, for: .areaPerChild)
        hasPlayground = try decode(Bool.self, for: .hasPlayground)
        buildingYear = try container.decodeIfPresent(Int.self, forKey: .buildingYear)
        floorInfo = try container.decodeIfPresent(String.self, forKey: .floorInfo)

        // A small subset of production records omits these area fields entirely.
        classroomArea = try container.decodeIfPresent(Double.self, forKey: .classroomArea) ?? 0
        indoorPlaygroundArea = try container.decodeIfPresent(Double.self, forKey: .indoorPlaygroundArea) ?? 0
        outdoorPlaygroundArea = try container.decodeIfPresent(Double.self, forKey: .outdoorPlaygroundArea) ?? 0

        teacherCount = try decode(Int.self, for: .teacherCount)
        seniorTeacherCount = try decode(Int.self, for: .seniorTeacherCount)
        cctvCount = try decode(Int.self, for: .cctvCount)
    }
}

public struct Kindergarten: Identifiable, Hashable, Sendable {
    public let kindercode: String
    public let name: String
    public let type: InstitutionType
    public let address: String
    public let location: Coordinates
    public let distance: Double
    public let sidoCode: String
    public let sigunguCode: String
    public let capacity: Int
    public let currentCount: Int
    public let hasBus: Bool
    public let busCount: Int
    public let mealType: MealType
    public let hasAfterSchool: Bool
    public let areaPerChild: Double
    public let hasPlayground: Bool
    public let buildingYear: Int?
    public let indoorPlaygroundArea: Double
    public let outdoorPlaygroundArea: Double
    public let classroomArea: Double
    public let teacherCount: Int
    public let seniorTeacherCount: Int
    public let cctvCount: Int
    public let phone: String?
    public let homepage: String?
    public let operationHours: String?
    public let establishDate: String
    public let floorInfo: String?

    public var id: String { kindercode }

    public init(raw: KindergartenRaw, distance: Double) {
        self.kindercode = raw.kindercode
        self.name = raw.name
        self.type = raw.type
        self.address = raw.address
        self.location = Coordinates(lat: raw.lat, lng: raw.lng)
        self.distance = distance
        self.sidoCode = raw.sidoCode
        self.sigunguCode = raw.sigunguCode
        self.capacity = raw.capacity
        self.currentCount = raw.currentCount
        self.hasBus = raw.hasBus
        self.busCount = raw.busCount
        self.mealType = raw.mealType ?? .none
        self.hasAfterSchool = raw.hasAfterSchool
        self.areaPerChild = raw.areaPerChild
        self.hasPlayground = raw.hasPlayground
        self.buildingYear = raw.buildingYear
        self.indoorPlaygroundArea = raw.indoorPlaygroundArea
        self.outdoorPlaygroundArea = raw.outdoorPlaygroundArea
        self.classroomArea = raw.classroomArea
        self.teacherCount = raw.teacherCount
        self.seniorTeacherCount = raw.seniorTeacherCount
        self.cctvCount = raw.cctvCount
        self.phone = raw.phone
        self.homepage = raw.homepage
        self.operationHours = raw.operationHours
        self.establishDate = raw.establishDate
        self.floorInfo = raw.floorInfo
    }
}

public struct ReviewLink: Codable, Identifiable, Hashable, Sendable {
    public let id: String
    public let kindergartenId: String?
    public let title: String
    public let url: String
    public let source: String
    public let sourceName: String?
    public let snippet: String
    public let summary: String?
    public let tags: [String]?
    public let content: String?
    public let date: String?
    public let collectedAt: String
    public let relevanceScore: Int?

    public init(
        id: String,
        kindergartenId: String?,
        title: String,
        url: String,
        source: String,
        sourceName: String?,
        snippet: String,
        summary: String?,
        tags: [String]?,
        content: String?,
        date: String?,
        collectedAt: String,
        relevanceScore: Int?
    ) {
        self.id = id
        self.kindergartenId = kindergartenId
        self.title = title
        self.url = url
        self.source = source
        self.sourceName = sourceName
        self.snippet = snippet
        self.summary = summary
        self.tags = tags
        self.content = content
        self.date = date
        self.collectedAt = collectedAt
        self.relevanceScore = relevanceScore
    }

    enum CodingKeys: String, CodingKey {
        case id
        case kindergartenId
        case title
        case url
        case source
        case sourceName
        case snippet
        case summary
        case tags
        case content
        case date
        case collectedAt = "collectedAt"
        case relevanceScore
    }
}

public struct ReviewsData: Codable, Hashable, Sendable {
    public let version: String
    public let totalCount: Int
    public let kindergartenCount: Int
    public let reviews: [String: [ReviewLink]]

    public init(
        version: String,
        totalCount: Int,
        kindergartenCount: Int,
        reviews: [String: [ReviewLink]]
    ) {
        self.version = version
        self.totalCount = totalCount
        self.kindergartenCount = kindergartenCount
        self.reviews = reviews
    }

    enum CodingKeys: String, CodingKey {
        case version
        case totalCount
        case kindergartenCount
        case reviews
    }
}

public struct SearchFilters: Codable, Hashable, Sendable {
    public var radiusKM: Double
    public var type: InstitutionFilter
    public var hasBus: Bool?
    public var hasVacancy: Bool?
    public var hasAfterSchool: Bool?
    public var hasIndoorPlayground: Bool?
    public var hasLargeSpace: Bool?
    public var hasModernBuilding: Bool?
    public var sort: SortOption

    public init(
        radiusKM: Double = 1,
        type: InstitutionFilter = .all,
        hasBus: Bool? = nil,
        hasVacancy: Bool? = nil,
        hasAfterSchool: Bool? = nil,
        hasIndoorPlayground: Bool? = nil,
        hasLargeSpace: Bool? = nil,
        hasModernBuilding: Bool? = nil,
        sort: SortOption = .distance
    ) {
        self.radiusKM = radiusKM
        self.type = type
        self.hasBus = hasBus
        self.hasVacancy = hasVacancy
        self.hasAfterSchool = hasAfterSchool
        self.hasIndoorPlayground = hasIndoorPlayground
        self.hasLargeSpace = hasLargeSpace
        self.hasModernBuilding = hasModernBuilding
        self.sort = sort
    }
}

public struct CompareSelection: Codable, Hashable, Sendable {
    public static let limit = 3
    public private(set) var ids: [String]

    public init(ids: [String] = []) {
        self.ids = Array(ids.prefix(Self.limit))
    }

    public mutating func toggle(id: String) {
        if let index = ids.firstIndex(of: id) {
            ids.remove(at: index)
            return
        }

        guard ids.count < Self.limit else { return }
        ids.append(id)
    }

    public func contains(_ id: String) -> Bool {
        ids.contains(id)
    }

    public mutating func remove(at index: Int) {
        guard ids.indices.contains(index) else { return }
        ids.remove(at: index)
    }
}

public struct FavoriteItem: Codable, Hashable, Sendable, Identifiable {
    public let kindercode: String
    public let name: String
    public let address: String
    public let type: InstitutionType

    public var id: String { kindercode }

    public init(kindercode: String, name: String, address: String, type: InstitutionType) {
        self.kindercode = kindercode
        self.name = name
        self.address = address
        self.type = type
    }
}

public struct IndexedStoredItem<Value: Hashable & Sendable>: Hashable, Sendable {
    public let value: Value
    public let index: Int

    public init(value: Value, index: Int) {
        self.value = value
        self.index = index
    }
}

public typealias IndexedFavoriteItem = IndexedStoredItem<FavoriteItem>
public typealias IndexedRecentSearch = IndexedStoredItem<RecentSearch>

public enum SearchType: String, Codable, Hashable, Sendable {
    case currentLocation
    case address
    case place
    case kindergarten
}

public struct RecentSearch: Codable, Hashable, Sendable, Identifiable {
    public let id: UUID
    public let label: String
    public let coordinates: Coordinates?
    public let displayName: String?
    public let searchType: SearchType?
    public let createdAt: Date?

    public var resolvedDisplayName: String {
        displayName ?? label
    }

    public init(
        id: UUID = UUID(),
        label: String,
        coordinates: Coordinates? = nil,
        displayName: String? = nil,
        searchType: SearchType? = nil,
        createdAt: Date? = Date()
    ) {
        self.id = id
        self.label = label
        self.coordinates = coordinates
        self.displayName = displayName
        self.searchType = searchType
        self.createdAt = createdAt
    }
}

public enum DeepLinkDestination: Equatable, Sendable {
    case compare(ids: [String])
    case search(query: String?)
}
