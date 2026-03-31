import Models
import SwiftUI

struct KindergartenDetailSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var showAllReviews = false
    let kindergarten: Kindergarten
    let reviews: [ReviewLink]
    let reviewsVersion: String?
    let vacancySummary: VacancySummary?
    let vacancyDatasetVersion: String?
    let isVacancyLoading: Bool
    let vacancyError: String?
    let isCompared: Bool
    let isFavorite: Bool
    let fitReasons: [KindergartenFitReason]
    let fitSummary: String?
    let onToggleCompare: () -> Void
    let onToggleFavorite: () -> Void

    // MARK: - Computed Properties

    private var homepageURL: URL? {
        guard let homepage = kindergarten.homepage?.trimmingCharacters(in: .whitespacesAndNewlines),
              !homepage.isEmpty else {
            return nil
        }

        if let url = URL(string: homepage), url.scheme != nil {
            return url
        }

        return URL(string: "https://\(homepage)")
    }

    private var phoneURL: URL? {
        guard let phone = kindergarten.phone?.filter(\.isNumber), !phone.isEmpty else {
            return nil
        }

        return URL(string: "tel://\(phone)")
    }

    private var mapURL: URL? {
        var components = URLComponents(string: "http://maps.apple.com/")
        components?.queryItems = [
            URLQueryItem(name: "ll", value: "\(kindergarten.location.lat),\(kindergarten.location.lng)"),
            URLQueryItem(name: "q", value: kindergarten.name),
        ]
        return components?.url
    }

    private var formattedEstablishDate: String? {
        guard kindergarten.establishDate.count == 8 else {
            return nil
        }

        let year = kindergarten.establishDate.prefix(4)
        let monthStart = kindergarten.establishDate.index(kindergarten.establishDate.startIndex, offsetBy: 4)
        let dayStart = kindergarten.establishDate.index(kindergarten.establishDate.startIndex, offsetBy: 6)
        let month = kindergarten.establishDate[monthStart..<dayStart]
        let day = kindergarten.establishDate.suffix(2)
        return "\(year).\(month).\(day)"
    }

    private var mealTypeLabel: String {
        switch kindergarten.mealType {
        case .direct:
            return "직영"
        case .outsourced:
            return "위탁"
        case .none:
            return "확인 전"
        }
    }

    private var buildingSummary: String {
        let year = kindergarten.buildingYear.map { "\($0)년" } ?? "연도 확인 전"
        if let floorInfo = kindergarten.floorInfo, !floorInfo.isEmpty {
            return "\(year) · \(floorInfo)"
        }
        return year
    }

    private var playgroundSummary: String {
        guard kindergarten.hasPlayground else {
            return "없음"
        }

        let indoor = kindergarten.indoorPlaygroundArea > 0 ? "실내 \(Int(kindergarten.indoorPlaygroundArea))m²" : nil
        let outdoor = kindergarten.outdoorPlaygroundArea > 0 ? "실외 \(Int(kindergarten.outdoorPlaygroundArea))m²" : nil
        let details = [indoor, outdoor].compactMap { $0 }
        return details.isEmpty ? "있음" : details.joined(separator: " · ")
    }

    private var homepageSubtitle: String {
        guard let homepageURL else {
            return kindergarten.homepage ?? ""
        }

        return homepageURL.host(percentEncoded: false) ?? homepageURL.absoluteString
    }

    private var hasContactInfo: Bool {
        mapURL != nil || homepageURL != nil || phoneURL != nil
    }

    private var distanceLabel: String {
        kindergarten.distance >= 0 ? String(format: "%.1fkm", kindergarten.distance) : "거리 확인 전"
    }

    private var reviewSignalSummary: String {
        guard !reviews.isEmpty else {
            return "아직 후기가 없어요"
        }

        let latestDate = reviews.compactMap(\.date).max() ?? "확인 전"
        return "후기 \(reviews.count)건 · 최근 \(latestDate)"
    }

    // MARK: - New Computed Properties

    private var districtName: String {
        let parts = kindergarten.address.split(separator: " ")
        guard parts.count >= 2 else { return "" }
        return String(parts[1])
    }

    private var contextualSubtitle: String {
        var segments: [String] = []
        if !districtName.isEmpty {
            segments.append(districtName)
        }
        segments.append(distanceLabel)
        if kindergarten.hasBus {
            segments.append("셔틀")
        }
        if kindergarten.hasAfterSchool {
            segments.append("방과후")
        }
        return segments.joined(separator: " · ")
    }

    private var typeBadgeTone: NativeBadge.Tone {
        switch kindergarten.type {
        case .public:
            return .jade
        case .private:
            return .sand
        case .home:
            return .slate
        }
    }

    private var vacancyCount: Int {
        if let summary = vacancySummary {
            return summary.vacancyCount
        }
        return kindergarten.capacity - kindergarten.currentCount
    }

    private var teacherRatioLabel: String {
        let teacherCount = max(kindergarten.teacherCount, 1)
        let ratio = Int(ceil(Double(kindergarten.currentCount) / Double(teacherCount)))
        return "1:\(ratio)"
    }

    private var operationInfo: String {
        var parts: [String] = []
        if let hours = kindergarten.operationHours, !hours.isEmpty {
            parts.append(hours)
        }
        if kindergarten.hasBus {
            parts.append("셔틀 \(kindergarten.busCount)대")
        }
        return parts.isEmpty ? "운영 시간 확인 전" : parts.joined(separator: " · ")
    }

    private var mealInfo: String {
        switch kindergarten.mealType {
        case .direct:
            return "직영 급식"
        case .outsourced:
            return "위탁 급식"
        case .none:
            return "급식 정보 확인 전"
        }
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                // Section A: Header
                sectionHeader

                // Section B: Snapshot Card
                DetailSnapshotCard(
                    operationInfo: operationInfo,
                    mealInfo: mealInfo,
                    reviewInfo: reviewSignalSummary
                )

                // Section C: Vacancy Detail
                if vacancySummary != nil || isVacancyLoading || vacancyError != nil {
                    sectionVacancy
                }

                // Section D: Details Grid
                sectionDetails

                // Section E: Reviews
                sectionReviews

                // Section F: Quick Links
                if hasContactInfo {
                    sectionLinks
                }

                // Section G: Footer
                sectionFooter
            }
            .padding(24)
            .padding(.bottom, 24)
        }
        .background {
            NativeScreenBackground(topTintOpacity: 0.14)
        }
    }

    // MARK: - Section A: Header

    private var sectionHeader: some View {
        VStack(alignment: .leading, spacing: 18) {
            // A1: Top bar
            HStack(alignment: .top) {
                HStack(spacing: 8) {
                    NativeBadge(kindergarten.type.label, tone: typeBadgeTone)
                    VacancyStatusPill(
                        vacancySummary: vacancySummary,
                        isLoading: isVacancyLoading
                    )
                }
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(slateBlue)
                        .frame(width: 44, height: 44)
                        .contentShape(Circle())
                        .background(paperWhite.opacity(0.88), in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("닫기")
            }

            // A2: Name + contextual subtitle
            VStack(alignment: .leading, spacing: 8) {
                Text(kindergarten.name)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(inkBlack)
                Text(contextualSubtitle)
                    .font(.subheadline)
                    .foregroundStyle(slateBlue)
                    .lineLimit(1)

                if let fitSummary {
                    Text(fitSummary)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(inkBlack.opacity(0.84))
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            if !fitReasons.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(fitReasons) { reason in
                            NativeBadge(reason.title, tone: reason.tone)
                        }
                    }
                }
            }

            // A3: Decision Metrics (3-column)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 10) {
                NativeMetricTile(
                    label: vacancySummary != nil ? "빈자리" : "정원 여유",
                    value: "\(vacancyCount)명",
                    accent: vacancyCount > 0 ? jadeGreen : coralRed
                )
                NativeMetricTile(
                    label: "1인당 면적",
                    value: String(format: "%.1fm²", kindergarten.areaPerChild),
                    accent: kindergarten.areaPerChild >= 5 ? jadeGreen : amberOrange
                )
                NativeMetricTile(
                    label: "교사 비율",
                    value: teacherRatioLabel,
                    accent: teacherRatioN <= 10 ? jadeGreen : amberOrange
                )
            }

            // A4: Action buttons
            HStack(spacing: 10) {
                DetailActionButton(
                    title: isFavorite ? "저장 취소" : "저장",
                    systemImage: isFavorite ? "heart.slash.fill" : "heart.fill",
                    tone: .sun,
                    action: onToggleFavorite
                )

                DetailActionButton(
                    title: isCompared ? "비교 빼기" : "비교 담기",
                    systemImage: isCompared ? "checkmark.circle.fill" : "plus.circle.fill",
                    tone: .jade,
                    action: onToggleCompare
                )

                if let phoneURL {
                    Link(destination: phoneURL) {
                        DetailActionButtonLabel(
                            title: "전화",
                            systemImage: "phone.fill",
                            tone: .slate
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(22)
        .solidPanel(cornerRadius: CornerRadius.xlarge, tint: paperWhite.opacity(0.98))
    }

    private var teacherRatioN: Int {
        let teacherCount = max(kindergarten.teacherCount, 1)
        return Int(ceil(Double(kindergarten.currentCount) / Double(teacherCount)))
    }

    // MARK: - Section C: Vacancy Detail

    private var sectionVacancy: some View {
        DetailSectionCard(title: "학년별 빈자리") {
            VStack(alignment: .leading, spacing: 10) {
                if isVacancyLoading {
                    ForEach(0..<3, id: \.self) { _ in
                        HStack(spacing: 10) {
                            Text("3세")
                                .font(.subheadline)
                                .foregroundStyle(slateBlue)
                                .frame(width: 36, alignment: .leading)
                            RoundedRectangle(cornerRadius: 4, style: .continuous)
                                .fill(slateSoft.opacity(0.15))
                                .frame(height: 8)
                            Text("0명 여유")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(slateSoft)
                                .frame(width: 64, alignment: .trailing)
                        }
                        .redacted(reason: .placeholder)
                    }
                } else if let error = vacancyError {
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(coralRed)
                } else if let summary = vacancySummary {
                    ForEach(summary.detail) { row in
                        VacancyBarRow(
                            label: row.age,
                            vacancy: row.vacancyCount
                        )
                    }
                    if let updatedAt = summary.updatedAt {
                        Text("기준: \(summary.aidYear)학년도 · 업데이트 \(updatedAt)")
                            .font(.caption2)
                            .foregroundStyle(slateSoft)
                            .padding(.top, 4)
                    }
                }
            }
        }
    }

    // MARK: - Section D: Details Grid

    private var sectionDetails: some View {
        DetailSectionCard(title: "상세 정보") {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("운영")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(slateSoft)
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                        DetailFactCard(title: "교사", value: "\(kindergarten.teacherCount)명 (경력 \(kindergarten.seniorTeacherCount)명)")
                        DetailFactCard(title: "급식", value: mealTypeLabel)
                        DetailFactCard(title: "설립", value: formattedEstablishDate ?? kindergarten.establishDate)
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("시설")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(slateSoft)
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                        DetailFactCard(title: "건물", value: buildingSummary)
                        DetailFactCard(title: "놀이공간", value: playgroundSummary)
                        DetailFactCard(title: "CCTV", value: "\(kindergarten.cctvCount)대")
                    }
                }
            }
        }
    }

    // MARK: - Section E: Reviews

    private var sectionReviews: some View {
        DetailSectionCard(title: reviews.isEmpty ? "후기" : "후기 (\(reviews.count)건)") {
            VStack(alignment: .leading, spacing: 10) {
                if reviews.isEmpty {
                    Text("아직 등록된 후기가 없어요.")
                        .font(.subheadline)
                        .foregroundStyle(slateBlue)
                } else {
                    ForEach(showAllReviews ? reviews : Array(reviews.prefix(3))) { review in
                        if let url = URL(string: review.url) {
                            Link(destination: url) {
                                ReviewCard(review: review)
                            }
                            .buttonStyle(.plain)
                        } else {
                            ReviewCard(review: review)
                        }
                    }

                    if reviews.count > 3 {
                        Button {
                            withAnimation(.spring(duration: 0.35, bounce: 0.12)) {
                                showAllReviews.toggle()
                            }
                        } label: {
                            HStack(spacing: 6) {
                                Text(showAllReviews ? "접기" : "전체 후기 보기 (\(reviews.count)건)")
                                    .font(.footnote.weight(.semibold))
                                Image(systemName: showAllReviews ? "chevron.up" : "chevron.down")
                                    .font(.caption2.weight(.bold))
                            }
                            .foregroundStyle(jadeDeep)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    // MARK: - Section F: Quick Links

    private var sectionLinks: some View {
        DetailSectionCard(title: "바로가기") {
            VStack(spacing: 10) {
                if let mapURL {
                    Link(destination: mapURL) {
                        DetailLinkRow(
                            title: "지도에서 보기",
                            subtitle: kindergarten.address,
                            systemImage: "map.fill"
                        )
                    }
                    .buttonStyle(.plain)
                }

                if let homepageURL {
                    Link(destination: homepageURL) {
                        DetailLinkRow(
                            title: "홈페이지",
                            subtitle: homepageSubtitle,
                            systemImage: "globe"
                        )
                    }
                    .buttonStyle(.plain)
                }

                if let phoneURL, let phone = kindergarten.phone {
                    Link(destination: phoneURL) {
                        DetailLinkRow(
                            title: "전화하기",
                            subtitle: phone,
                            systemImage: "phone.fill"
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Section G: Footer

    private var sectionFooter: some View {
        VStack(spacing: 4) {
            Text("기준 정보: 유치원 알리미 · 업데이트 \(reviewsVersion ?? "확인 전")")
                .font(.caption2)
                .foregroundStyle(slateSoft)
            if let version = vacancyDatasetVersion {
                Text("빈자리 정보: \(formatDatePrefix(version))")
                    .font(.caption2)
                    .foregroundStyle(slateSoft)
            }
        }
        .frame(maxWidth: .infinity, alignment: .center)
        .padding(.top, 8)
    }

    private func formatDatePrefix(_ isoString: String) -> String {
        let dateOnly = String(isoString.prefix(10))
        if dateOnly.count == 10, dateOnly.contains("-") {
            return dateOnly
        }
        return isoString
    }
}

// MARK: - VacancyStatusPill

private struct VacancyStatusPill: View {
    let vacancySummary: VacancySummary?
    let isLoading: Bool

    @State private var isPulsing = false

    var body: some View {
        if isLoading {
            Text("확인 중...")
                .font(.caption2.weight(.bold))
                .foregroundStyle(slateSoft)
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(slateSoft.opacity(0.10), in: Capsule())
                .opacity(isPulsing ? 0.4 : 1.0)
                .onAppear {
                    withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                        isPulsing = true
                    }
                }
        } else if let summary = vacancySummary {
            let hasVacancy = summary.vacancyCount > 0
            Text(hasVacancy ? "빈자리 \(summary.vacancyCount)명" : "정원 마감")
                .font(.caption2.weight(.bold))
                .foregroundStyle(hasVacancy ? jadeDeep : coralRed)
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(
                    (hasVacancy ? jadeGreen : coralRed).opacity(0.15),
                    in: Capsule()
                )
                .overlay(
                    Capsule()
                        .stroke((hasVacancy ? jadeGreen : coralRed).opacity(0.20), lineWidth: 1)
                )
        }
    }
}

// MARK: - DetailSnapshotCard

private struct DetailSnapshotCard: View {
    let operationInfo: String
    let mealInfo: String
    let reviewInfo: String

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            snapshotRow(icon: "clock", color: slateBlue, text: operationInfo)
            snapshotRow(icon: "fork.knife", color: slateBlue, text: mealInfo)
            snapshotRow(icon: "text.quote", color: amberOrange, text: reviewInfo)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .nativeSectionPanel()
    }

    private func snapshotRow(icon: String, color: Color, text: String) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.14))
                    .frame(width: 32, height: 32)
                Image(systemName: icon)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(color)
            }
            Text(text)
                .font(.subheadline)
                .foregroundStyle(inkBlack)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

// MARK: - VacancyBarRow

private struct VacancyBarRow: View {
    let label: String
    let vacancy: Int

    private var hasVacancy: Bool { vacancy > 0 }

    private var shortLabel: String {
        if label.contains("혼합") {
            return "혼합"
        }
        return label
            .replacingOccurrences(of: "만", with: "")
            .replacingOccurrences(of: "세", with: "세")
    }

    var body: some View {
        HStack(spacing: 10) {
            Text(shortLabel)
                .font(.subheadline)
                .foregroundStyle(slateBlue)
                .lineLimit(1)
                .frame(width: 36, alignment: .leading)

            RoundedRectangle(cornerRadius: 4, style: .continuous)
                .fill(hasVacancy ? jadeGreen : coralRed)
                .frame(height: 8)

            Text(hasVacancy ? "\(vacancy)명 여유" : "마감")
                .font(.caption.weight(.semibold))
                .foregroundStyle(hasVacancy ? jadeDeep : coralRed)
                .frame(width: 64, alignment: .trailing)
        }
    }
}

// MARK: - Sub-components

private struct DetailActionButton: View {
    let title: String
    let systemImage: String
    let tone: NativeBadge.Tone
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            DetailActionButtonLabel(
                title: title,
                systemImage: systemImage,
                tone: tone
            )
        }
        .buttonStyle(.plain)
    }
}

private struct DetailActionButtonLabel: View {
    let title: String
    let systemImage: String
    let tone: NativeBadge.Tone

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: systemImage)
            Text(title)
                .lineLimit(1)
        }
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(inkBlack)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(backgroundColor, in: RoundedRectangle(cornerRadius: CornerRadius.small, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.small, style: .continuous)
                .stroke(strokeColor, lineWidth: 1)
        )
    }

    private var backgroundColor: Color {
        switch tone {
        case .jade:
            return jadeGreen.opacity(0.92)
        case .sun:
            return sunYellow.opacity(0.92)
        case .slate:
            return slateBlue.opacity(0.14)
        case .sand:
            return warmSand.opacity(0.30)
        }
    }

    private var strokeColor: Color {
        switch tone {
        case .jade:
            return jadeGreen.opacity(0.22)
        case .sun:
            return sunYellow.opacity(0.36)
        case .slate:
            return slateBlue.opacity(0.18)
        case .sand:
            return warmSand.opacity(0.36)
        }
    }
}

private struct DetailSectionCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline.weight(.semibold))
                .foregroundStyle(inkBlack)
            content
        }
        .nativeSectionPanel()
    }
}

private struct DetailLinkRow: View {
    let title: String
    let subtitle: String
    let systemImage: String

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(jadeGreen.opacity(0.16))
                    .frame(width: 36, height: 36)
                Image(systemName: systemImage)
                    .font(.callout.weight(.bold))
                    .foregroundStyle(jadeDeep)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(inkBlack)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(slateBlue)
                    .lineLimit(1)
            }

            Spacer()
            Image(systemName: "arrow.up.right.square")
                .foregroundStyle(slateSoft)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solidPanel(cornerRadius: CornerRadius.medium, tint: paperWhite)
    }
}

private struct DetailFactCard: View {
    let title: String
    let value: String

    var body: some View {
        NativeMetricTile(label: title, value: value)
    }
}

private struct ReviewCard: View {
    let review: ReviewLink

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(review.title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(inkBlack)
            Text(review.snippet)
                .font(.footnote)
                .foregroundStyle(slateBlue)
            HStack(spacing: 8) {
                Text(review.sourceName ?? review.source)
                if let date = review.date {
                    Text(date)
                }
            }
            .font(.caption)
            .foregroundStyle(slateSoft)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solidPanel(cornerRadius: CornerRadius.medium, tint: paperWhite)
    }
}
