import Foundation
import Models

public struct CompareUseCase: Sendable {

    public init() {}

    /// 8개 메트릭 기반 비교 점수 계산
    /// 반환: 각 유치원의 우세 항목 수 배열
    public func calculateScores(for items: [Kindergarten]) -> [Int] {
        guard items.count >= 2 else { return Array(repeating: 0, count: items.count) }
        var scores = Array(repeating: 0, count: items.count)

        // 교사 대 아동 비율: 낮을수록 좋음
        let ratios = items.map {
            $0.teacherCount > 0
                ? Double($0.currentCount) / Double($0.teacherCount)
                : Double.infinity
        }
        if let minRatio = ratios.filter({ $0.isFinite }).min(),
           ratios.filter({ $0 == minRatio }).count < items.count {
            for (i, r) in ratios.enumerated() where r == minRatio { scores[i] += 1 }
        }

        // 1인당 면적: 높을수록 좋음
        let areas = items.map(\.areaPerChild)
        if let maxArea = areas.max(), maxArea > 0, Set(areas).count > 1 {
            for (i, item) in items.enumerated() where item.areaPerChild == maxArea { scores[i] += 1 }
        }

        // CCTV: 많을수록 좋음
        let cctvs = items.map(\.cctvCount)
        if let maxCctv = cctvs.max(), maxCctv > 0, Set(cctvs).count > 1 {
            for (i, item) in items.enumerated() where item.cctvCount == maxCctv { scores[i] += 1 }
        }

        // 방과후: 있으면 좋음 (모두 같지 않을 때만)
        let afterSchools = items.map(\.hasAfterSchool)
        if Set(afterSchools).count > 1 {
            for (i, item) in items.enumerated() where item.hasAfterSchool { scores[i] += 1 }
        }

        // 놀이터: 있으면 좋음
        let playgrounds = items.map(\.hasPlayground)
        if Set(playgrounds).count > 1 {
            for (i, item) in items.enumerated() where item.hasPlayground { scores[i] += 1 }
        }

        // 급식: 직영이면 좋음
        let meals = items.map(\.mealType)
        if Set(meals).count > 1 {
            for (i, item) in items.enumerated() where item.mealType == .direct { scores[i] += 1 }
        }

        // 통학버스: 많을수록 좋음
        let buses = items.map { $0.hasBus ? $0.busCount : 0 }
        if let maxBus = buses.max(), maxBus > 0, Set(buses).count > 1 {
            for (i, b) in buses.enumerated() where b == maxBus { scores[i] += 1 }
        }

        return scores
    }

    /// 우승자 요약 문자열
    public func winnerSummary(items: [Kindergarten], scores: [Int]) -> String? {
        guard let maxScore = scores.max(), maxScore > 0 else { return nil }
        let winners = scores.enumerated().filter { $0.element == maxScore }
        guard winners.count == 1, let winner = winners.first else { return nil }
        return "\(items[winner.offset].name)이 \(maxScore)개 항목에서 우세"
    }

    /// 비교 공유 URL 생성
    public func shareURL(ids: [String], baseURL: URL) -> URL? {
        guard !ids.isEmpty,
              var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
        else { return nil }
        components.queryItems = [URLQueryItem(name: "ids", value: ids.joined(separator: ","))]
        return components.url
    }
}
