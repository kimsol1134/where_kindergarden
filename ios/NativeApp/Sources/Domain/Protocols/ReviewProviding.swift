import Models

public protocol ReviewProviding: AnyObject, Sendable {
    var reviewsData: ReviewsData? { get }
    var isLoading: Bool { get }
    func load() async
    func reviews(for kindercode: String) -> [ReviewLink]
}
