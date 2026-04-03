#if canImport(KakaoSDKShare)
import KakaoSDKCommon
import KakaoSDKShare
import KakaoSDKTemplate
import os
import UIKit

public enum KakaoShareService {
    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.wherekindergarten",
        category: "KakaoShare"
    )

    public static func initializeSDK(appKey: String) {
        KakaoSDK.initSDK(appKey: appKey)
    }

    public static var isKakaoTalkAvailable: Bool {
        ShareApi.isKakaoTalkSharingAvailable()
    }

    public static func shareCompare(
        names: [String],
        shareURL: URL
    ) {
        let namesText = names.joined(separator: " vs ")

        let link = Link(
            webUrl: shareURL,
            mobileWebUrl: shareURL
        )

        let content = Content(
            title: "\(namesText) 비교 결과",
            imageUrl: NativeAppConfiguration.defaultShareImageURL,
            imageWidth: 1200,
            imageHeight: 630,
            description: NativeAppConfiguration.shareDescription,
            link: link
        )

        let social = Social(viewCount: NativeAppConfiguration.totalKindergartenCount)

        let feedTemplate = FeedTemplate(
            content: content,
            social: social,
            buttons: [
                Button(
                    title: "비교표 바로 보기",
                    link: link
                )
            ]
        )

        guard let templateData = try? SdkJSONEncoder.custom.encode(feedTemplate),
              let templateJSON = try? JSONSerialization.jsonObject(with: templateData) as? [String: Any] else {
            return
        }

        ShareApi.shared.shareDefault(templateObject: templateJSON) { sharingResult, error in
            if let error {
                logger.error("Kakao share failed: \(error.localizedDescription, privacy: .public)")
                return
            }

            if let sharingResult {
                UIApplication.shared.open(sharingResult.url, options: [:])
            }
        }
    }
}
#endif
