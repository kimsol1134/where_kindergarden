import Foundation
import Models

public struct DeepLinkParser: Sendable {
    public init() {}

    public func destination(for url: URL) -> DeepLinkDestination? {
        if url.scheme == "https" || url.scheme == "http" {
            guard url.host == "where-kindergarden.vercel.app" else {
                return nil
            }
        }

        if url.scheme != "wherekindergarten",
           url.scheme != "https",
           url.scheme != "http" {
            return nil
        }

        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let ids = components?.queryItems?
            .first(where: { $0.name == "ids" })?
            .value?
            .split(separator: ",")
            .map(String.init)
            .filter { !$0.isEmpty } ?? []

        if url.host == "compare" || url.path == "/compare" {
            return .compare(ids: ids)
        }

        if url.host == "search" || url.path == "/search" {
            let query = components?.queryItems?.first(where: { $0.name == "q" })?.value
            return .search(query: query)
        }

        return nil
    }
}

public struct DeepLinkBuilder: Sendable {
    public static let defaultBaseURL = URL(string: "https://where-kindergarden.vercel.app")!

    private let baseURL: URL

    public init(baseURL: URL = DeepLinkBuilder.defaultBaseURL) {
        self.baseURL = baseURL
    }

    public func compareURL(ids: [String]) -> URL? {
        guard !ids.isEmpty else {
            return nil
        }

        let compareURL = baseURL.appending(path: "compare")
        var components = URLComponents(url: compareURL, resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "ids", value: ids.joined(separator: ","))
        ]
        return components?.url
    }
}
