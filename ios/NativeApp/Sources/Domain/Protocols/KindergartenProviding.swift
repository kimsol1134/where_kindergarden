import Models

public protocol KindergartenProviding: AnyObject, Sendable {
    var kindergartens: [KindergartenRaw] { get }
    var isLoading: Bool { get }
    var error: String? { get }
    func load() async
}
