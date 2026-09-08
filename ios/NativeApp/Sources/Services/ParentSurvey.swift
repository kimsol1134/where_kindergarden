import Foundation
import Observation

/// Shared by automatic survey and StoreKit prompts for the lifetime of an app launch.
/// Staying in the background does not reset it, so a returning user is never asked twice.
@MainActor
public final class SessionPromptGate {
    public enum Kind { case survey, review }
    public private(set) var claimedBy: Kind?

    public init() {}

    public func claim(_ kind: Kind) -> Bool {
        guard claimedBy == nil else { return false }
        claimedBy = kind
        return true
    }
}

public struct ParentSurveyCampaign: Sendable {
    public let id: String
    public let url: URL?

    public init(id: String, url: URL?) {
        self.id = id
        // Never show an invitation pointing at an editor, arbitrary host, or insecure URL.
        self.url = url.flatMap { candidate in
            guard candidate.scheme == "https", candidate.host == "docs.google.com",
                  candidate.path.hasPrefix("/forms/d/e/"),
                  candidate.path.hasSuffix("/viewform"),
                  candidate.user == nil, candidate.password == nil,
                  candidate.query == nil, candidate.fragment == nil else { return nil }
            return candidate
        }
    }

    // Set only after the responder form has been published and checked without sign-in.
    public static let current = ParentSurveyCampaign(
        id: "parent-needs-2026-fall",
        url: URL(string: "https://docs.google.com/forms/d/e/1FAIpQLScdR-EJW-JzJTRqibkPVw4V-fBJbBW1_YJmRZO_4HfnHNrSGA/viewform")
    )
}

/// Counts actual, distinct detail presentations; selecting a row alone is not enough.
@Observable
@MainActor
public final class ParentSurveyCoordinator {
    public private(set) var isInvitationVisible = false
    public private(set) var isOpening = false
    public private(set) var openError: String?
    public let campaign: ParentSurveyCampaign

    private let persistence: NativeAppPersistence
    private let gate: SessionPromptGate
    private let analytics: (any AnalyticsTracking)?
    private var viewedKindergartenIDs: Set<String> = []
    private var didRecordImpression = false

    public init(
        campaign: ParentSurveyCampaign = .current,
        persistence: NativeAppPersistence,
        gate: SessionPromptGate,
        analytics: (any AnalyticsTracking)? = nil
    ) {
        self.campaign = campaign
        self.persistence = persistence
        self.gate = gate
        self.analytics = analytics
    }

    public func recordDetailPresented(kindercode: String) {
        guard !kindercode.isEmpty else { return }
        viewedKindergartenIDs.insert(kindercode)
    }

    /// Called by fullScreenCover.onDismiss, never while the detail is still covering search.
    public func returnedToSearch() {
        guard !isInvitationVisible, campaign.url != nil, !campaign.id.isEmpty,
              viewedKindergartenIDs.count >= 2,
              !persistence.seenSurveyCampaigns().contains(campaign.id),
              gate.claim(.survey) else { return }
        isInvitationVisible = true
    }

    /// UI calls this when the card is actually mounted in the visible results panel.
    public func recordImpression() {
        guard isInvitationVisible, !didRecordImpression else { return }
        didRecordImpression = true
        persistence.markSurveyCampaignSeen(campaign.id)
        track(.surveyInvitationShown)
    }

    public func dismiss() {
        guard isInvitationVisible else { return }
        persistence.markSurveyCampaignSeen(campaign.id)
        track(.surveyInvitationDismissed)
        isInvitationVisible = false
    }

    public func beginOpening() -> URL? {
        guard isInvitationVisible, !isOpening, let url = campaign.url else { return nil }
        isOpening = true
        openError = nil
        track(.surveyLinkTapped)
        return url
    }

    /// OS URL handoff is not a form submission, nor proof of a successful page load.
    public func finishOpening(accepted: Bool) {
        guard isOpening else { return }
        isOpening = false
        track(.surveyLinkOpenResult, additional: ["accepted": .bool(accepted)])
        if accepted {
            persistence.markSurveyCampaignSeen(campaign.id)
            isInvitationVisible = false
        } else {
            openError = "설문을 열지 못했어요. 다시 눌러 주세요."
        }
    }

    private func track(_ event: AnalyticsEvent, additional: AnalyticsProperties = [:]) {
        var properties: AnalyticsProperties = [
            "survey_id": .string(campaign.id),
            "source": .string("search_after_detail"),
            "detail_count": .int(viewedKindergartenIDs.count),
        ]
        properties.merge(additional) { _, new in new }
        analytics?.track(event: event, properties: properties)
    }
}
