import Models

public protocol ReviewProviding: AnyObject, Sendable {
    var reviewsData: ReviewsData? { get }
    var isLoading: Bool { get }
    var error: String? { get }
    func load() async
    func reviews(for kindercode: String) -> [ReviewLink]
}
