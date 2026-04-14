import Models

public protocol VacancyProviding: AnyObject, Sendable {
    var vacancyData: VacancyDataset? { get }
    var isLoading: Bool { get }
    func load() async
    func vacancy(for kindercode: String) -> VacancySummary?
    func vacancyCount(for kindercode: String) -> Int
}
