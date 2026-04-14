import Foundation
import Testing
import Models
@testable import Domain

struct DeepLinkUseCaseTests {
    let sut = DeepLinkUseCase()

    @Test func resolve_compareURL_returnsCompareDestination() {
        let url = URL(string: "wherekindergarten://compare?ids=A001,A002")!

        let destination = sut.resolve(url)

        #expect(destination == .compare(ids: ["A001", "A002"]))
    }

    @Test func resolve_searchURL_returnsSearchDestination() {
        let url = URL(string: "wherekindergarten://search?q=test")!

        let destination = sut.resolve(url)

        #expect(destination == .search(query: "test"))
    }

    @Test func resolve_invalidURL_returnsNil() {
        let url = URL(string: "https://example.com/unknown")!

        let destination = sut.resolve(url)

        #expect(destination == nil)
    }
}
