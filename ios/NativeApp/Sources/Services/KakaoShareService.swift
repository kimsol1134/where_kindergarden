#if canImport(KakaoSDKShare)
import Foundation
import KakaoSDKCommon
import KakaoSDKShare
import KakaoSDKTemplate
import UIKit

public enum KakaoShareService {
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
        let description = names.joined(separator: ", ")

        let link = Link(
            webUrl: shareURL,
            mobileWebUrl: shareURL
        )

        let content = Content(
            title: "우리동네 유치원 비교",
            imageUrl: nil,
            description: description,
            link: link
        )

        let feedTemplate = FeedTemplate(
            content: content,
            buttons: [
                Button(
                    title: "비교표 보기",
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
                return
            }

            if let sharingResult {
                UIApplication.shared.open(sharingResult.url, options: [:])
            }
        }
    }
}
#endif
