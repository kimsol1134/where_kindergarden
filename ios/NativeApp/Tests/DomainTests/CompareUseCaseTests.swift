import Foundation
import Testing
import Models
@testable import Domain

struct CompareUseCaseTests {
    let sut = CompareUseCase()

    @Test func calculateScores_twoPerfectlyEqual_allZeros() {
        let a = makeTestKindergarten(kindercode: "A", teacherCount: 4, cctvCount: 4)
        let b = makeTestKindergarten(kindercode: "B", teacherCount: 4, cctvCount: 4)

        let scores = sut.calculateScores(for: [a, b])

        #expect(scores == [0, 0])
    }

    @Test func calculateScores_oneItemBetterTeacherRatio_getsPoint() {
        // A: 20/8 = 2.5 ratio (better, lower)
        // B: 30/4 = 7.5 ratio (worse)
        let a = makeTestKindergarten(kindercode: "A", currentCount: 20, teacherCount: 8)
        let b = makeTestKindergarten(kindercode: "B", currentCount: 30, teacherCount: 4)

        let scores = sut.calculateScores(for: [a, b])

        #expect(scores[0] > scores[1])
    }

    @Test func calculateScores_areaPerChild_higherWins() {
        let a = makeTestKindergarten(kindercode: "A", areaPerChild: 3.0)
        let b = makeTestKindergarten(kindercode: "B", areaPerChild: 7.0)

        let scores = sut.calculateScores(for: [a, b])

        #expect(scores[1] > scores[0])
    }

    @Test func calculateScores_booleanMetric_trueWinsWhenDifferent() {
        let a = makeTestKindergarten(kindercode: "A", hasAfterSchool: true)
        let b = makeTestKindergarten(kindercode: "B", hasAfterSchool: false)

        let scores = sut.calculateScores(for: [a, b])

        #expect(scores[0] > scores[1])
    }

    @Test func calculateScores_booleanMetric_allSame_noPoints() {
        let a = makeTestKindergarten(kindercode: "A", hasAfterSchool: true)
        let b = makeTestKindergarten(kindercode: "B", hasAfterSchool: true)

        let scores = sut.calculateScores(for: [a, b])

        #expect(scores == [0, 0])
    }

    @Test func calculateScores_singleItem_returnsZero() {
        let a = makeTestKindergarten(kindercode: "A")

        let scores = sut.calculateScores(for: [a])

        #expect(scores == [0])
    }

    @Test func winnerSummary_clearWinner_returnsName() {
        let a = makeTestKindergarten(kindercode: "A", name: "승리유치원", areaPerChild: 10)
        let b = makeTestKindergarten(kindercode: "B", name: "패배유치원", areaPerChild: 3)
        let scores = sut.calculateScores(for: [a, b])

        let summary = sut.winnerSummary(items: [a, b], scores: scores)

        #expect(summary != nil)
        #expect(summary?.contains("승리유치원") == true)
    }

    @Test func winnerSummary_tie_returnsNil() {
        let a = makeTestKindergarten(kindercode: "A")
        let b = makeTestKindergarten(kindercode: "B")
        let scores = sut.calculateScores(for: [a, b])

        let summary = sut.winnerSummary(items: [a, b], scores: scores)

        #expect(summary == nil)
    }

    @Test func shareURL_validIds_returnsURL() {
        let baseURL = URL(string: "https://example.com/compare")!

        let url = sut.shareURL(ids: ["A001", "A002"], baseURL: baseURL)

        #expect(url != nil)
        #expect(url?.absoluteString.contains("ids=A001,A002") == true)
    }

    @Test func shareURL_emptyIds_returnsNil() {
        let baseURL = URL(string: "https://example.com/compare")!

        let url = sut.shareURL(ids: [], baseURL: baseURL)

        #expect(url == nil)
    }
}
