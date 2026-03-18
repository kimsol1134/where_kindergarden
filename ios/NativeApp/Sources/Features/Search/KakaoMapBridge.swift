import Models
import Services
import SwiftUI

struct SearchMapMarker: Equatable, Identifiable {
    let id: String
    let title: String
    let coordinates: Coordinates
    let compareOrder: Int?
}

private let defaultMapCenter = Coordinates(lat: 37.5665, lng: 126.9780)

private struct SearchMapViewState: Equatable {
    let center: Coordinates
    let currentLocation: Coordinates?
    let markers: [SearchMapMarker]
    let selectedKindergartenID: String?
}

struct KakaoSearchMapSurface: View {
    let appKey: String?
    let center: Coordinates
    let currentLocation: Coordinates?
    let markers: [SearchMapMarker]
    let selectedKindergartenID: String?
    @Binding var runtimeMessage: String?
    let onMarkerTap: (String) -> Void

    private var state: SearchMapViewState {
        SearchMapViewState(
            center: center,
            currentLocation: currentLocation,
            markers: markers,
            selectedKindergartenID: selectedKindergartenID
        )
    }

    var body: some View {
        ZStack {
#if os(iOS) && canImport(UIKit) && canImport(KakaoMapsSDK)
            if let appKey {
                KakaoSearchMapRepresentable(
                    appKey: appKey,
                    state: state,
                    runtimeMessage: $runtimeMessage,
                    onMarkerTap: onMarkerTap
                )
            } else {
                MapUnavailablePlaceholder(
                    title: "Kakao Maps 설정 필요",
                    message: "\(NativeAppConfiguration.kakaoKeysConfigRelativePath)에서 \(NativeAppConfiguration.kakaoNativeAppKeyBuildSetting) 값을 채워야 지도를 표시할 수 있습니다."
                )
            }
#else
            MapUnavailablePlaceholder(
                title: "Kakao Maps 준비 중",
                message: "이 환경에서는 Kakao iOS SDK를 로드할 수 없어 지도 대신 안전한 placeholder를 표시합니다."
            )
#endif

            if let runtimeMessage {
                VStack {
                    Spacer()
                    Text(runtimeMessage)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.black.opacity(0.75), in: Capsule())
                        .padding(.bottom, 20)
                }
                .transition(.opacity)
            }
        }
    }
}

private struct MapUnavailablePlaceholder: View {
    let title: String
    let message: String

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [mistWhite, .white, leafGreen.opacity(0.12)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            Circle()
                .fill(sunYellow.opacity(0.26))
                .frame(width: 220, height: 220)
                .offset(x: -120, y: 120)

            Circle()
                .fill(leafGreen.opacity(0.18))
                .frame(width: 260, height: 260)
                .offset(x: 120, y: -180)

            VStack {
                Spacer(minLength: 150)

                HStack(alignment: .top, spacing: 14) {
                    Image(systemName: "map.circle.fill")
                        .font(.system(size: 34, weight: .semibold))
                        .foregroundStyle(leafGreen)
                        .padding(12)
                        .background(leafGreen.opacity(0.12), in: RoundedRectangle(cornerRadius: 18, style: .continuous))

                    VStack(alignment: .leading, spacing: 8) {
                        Text(title)
                            .font(.headline.weight(.semibold))
                            .foregroundStyle(.primary)
                        Text(message)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 0)
                }
                .padding(20)
                .background(.white.opacity(0.82), in: RoundedRectangle(cornerRadius: 28, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .stroke(Color.white.opacity(0.86), lineWidth: 1)
                )
                .shadow(color: warmSand.opacity(0.18), radius: 20, y: 12)
                .padding(.horizontal, 24)

                Spacer()
            }
        }
    }
}

#if os(iOS) && canImport(UIKit) && canImport(KakaoMapsSDK)
import KakaoMapsSDK
import OSLog
import UIKit

private struct KakaoSearchMapRepresentable: UIViewRepresentable {
    let appKey: String
    let state: SearchMapViewState
    @Binding var runtimeMessage: String?
    let onMarkerTap: (String) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(
            appKey: appKey,
            runtimeMessage: $runtimeMessage,
            onMarkerTap: onMarkerTap
        )
    }

    func makeUIView(context: Context) -> KMViewContainer {
        let container = KMViewContainer()
        container.backgroundColor = .clear
        context.coordinator.attach(to: container)
        return container
    }

    func updateUIView(_ uiView: KMViewContainer, context: Context) {
        context.coordinator.update(state: state)
    }

    static func dismantleUIView(_ uiView: KMViewContainer, coordinator: Coordinator) {
        coordinator.stop()
    }

    final class Coordinator: NSObject, MapControllerDelegate {
        private static var initializedAppKeys = Set<String>()
        private static let logger = Logger(subsystem: "com.solkim.wherekindergarten.native", category: "KakaoMap")

        private let appKey: String
        private let runtimeMessage: Binding<String?>
        private let onMarkerTap: (String) -> Void

        private weak var container: KMViewContainer?
        private var controller: KMController?
        private var mapView: KakaoMap?
        private var resultLayer: LabelLayer?
        private var currentLocationLayer: LabelLayer?
        private var resultHandlers: [any DisposableEventHandler] = []
        private var didConfigureStyles = false
        private var currentState = SearchMapViewState(
            center: defaultMapCenter,
            currentLocation: nil,
            markers: [],
            selectedKindergartenID: nil
        )
        private var lastCameraSignature = ""

        init(
            appKey: String,
            runtimeMessage: Binding<String?>,
            onMarkerTap: @escaping (String) -> Void
        ) {
            self.appKey = appKey
            self.runtimeMessage = runtimeMessage
            self.onMarkerTap = onMarkerTap
        }

        func attach(to container: KMViewContainer) {
            self.container = container
            initializeSDKIfNeeded()

            Self.logger.notice(
                "Attaching Kakao map container. renderMode=\(Self.describe(container.renderMode), privacy: .public)"
            )

            let controller = KMController(viewContainer: container)
            self.controller = controller
            controller.delegate = self
            controller.prepareEngine()
            controller.activateEngine()
            Self.logger.notice("Prepared and activated Kakao engine. state=\(controller.getStateDescMessage(), privacy: .public)")
        }

        func update(state: SearchMapViewState) {
            currentState = state

            guard let controller else { return }

            if controller.isEngineActive == false {
                controller.activateEngine()
            }

            guard mapView != nil else { return }
            renderMap(moveCameraIfNeeded: shouldMoveCamera(for: state))
        }

        func stop() {
            if let controller {
                Self.logger.notice("Stopping Kakao engine. state=\(controller.getStateDescMessage(), privacy: .public)")
            }
            controller?.pauseEngine()
            controller?.resetEngine()
            controller = nil
            mapView = nil
            resultLayer = nil
            currentLocationLayer = nil
            resultHandlers.removeAll()
        }

        private func initializeSDKIfNeeded() {
            guard !Self.initializedAppKeys.contains(appKey) else { return }
            SDKInitializer.InitSDK(appKey: appKey)
            Self.initializedAppKeys.insert(appKey)
        }

        func addViews() {
            let defaultPosition = MapPoint(
                longitude: currentState.center.lng,
                latitude: currentState.center.lat
            )
            let mapInfo = MapviewInfo(
                viewName: "search-map",
                viewInfoName: "map",
                defaultPosition: defaultPosition,
                defaultLevel: 5
            )
            controller?.addView(mapInfo)
        }

        func addViewSucceeded(_ viewName: String, viewInfoName: String) {
            runtimeMessage.wrappedValue = nil
            mapView = controller?.getView(viewName) as? KakaoMap
            if let container {
                Self.logger.notice(
                    "Kakao addViewSucceeded viewName=\(viewName, privacy: .public) renderMode=\(Self.describe(container.renderMode), privacy: .public) hasRenderView=\((container.renderView != nil), privacy: .public)"
                )
            } else {
                Self.logger.notice("Kakao addViewSucceeded viewName=\(viewName, privacy: .public) without container reference")
            }
            renderMap(moveCameraIfNeeded: true)
        }

        func addViewFailed(_ viewName: String, viewInfoName: String) {
            Self.logger.error("Kakao addViewFailed viewName=\(viewName, privacy: .public) viewInfoName=\(viewInfoName, privacy: .public)")
            runtimeMessage.wrappedValue = "지도를 초기화하지 못했습니다."
        }

        func containerDidResized(_ size: CGSize) {
            mapView?.viewRect = CGRect(origin: .zero, size: size)
            Self.logger.debug("Kakao container resized width=\(size.width, privacy: .public) height=\(size.height, privacy: .public)")
        }

        func authenticationSucceeded() {
            Self.logger.notice("Kakao authentication succeeded")
            runtimeMessage.wrappedValue = nil
        }

        func authenticationFailed(_ errorCode: Int, desc: String) {
            Self.logger.error("Kakao authentication failed code=\(errorCode, privacy: .public) desc=\(desc, privacy: .public)")
            runtimeMessage.wrappedValue = "Kakao 지도 인증 실패 (\(errorCode)): \(desc)"
        }

        private func renderMap(moveCameraIfNeeded: Bool) {
            guard let mapView else { return }

            let labelManager = mapView.getLabelManager()
            configureStylesIfNeeded(labelManager: labelManager)
            resultLayer = labelManager.getLabelLayer(layerID: "search-results")
                ?? labelManager.addLabelLayer(
                    option: LabelLayerOptions(
                        layerID: "search-results",
                        competitionType: .none,
                        competitionUnit: .poi,
                        orderType: .rank,
                        zOrder: 1
                    )
                )
            currentLocationLayer = labelManager.getLabelLayer(layerID: "current-location")
                ?? labelManager.addLabelLayer(
                    option: LabelLayerOptions(
                        layerID: "current-location",
                        competitionType: .none,
                        competitionUnit: .poi,
                        orderType: .rank,
                        zOrder: 10
                    )
                )

            resultLayer?.setClickable(true)
            currentLocationLayer?.setClickable(false)

            renderResultPois()
            renderCurrentLocationPoi()

            if moveCameraIfNeeded {
                updateCamera()
            }
        }

        private func renderResultPois() {
            resultLayer?.clearAllItems()
            resultHandlers.removeAll()

            for marker in currentState.markers {
                let styleID = styleID(
                    for: marker.compareOrder,
                    isSelected: marker.id == currentState.selectedKindergartenID
                )
                let option = PoiOptions(styleID: styleID, poiID: marker.id)
                option.rank = marker.id == currentState.selectedKindergartenID ? 100 : 0
                option.clickable = true
                let position = MapPoint(longitude: marker.coordinates.lng, latitude: marker.coordinates.lat)
                let poi = resultLayer?.addPoi(option: option, at: position)
                poi?.show()

                if let poi {
                    let handler = poi.addPoiTappedEventHandler(target: self, handler: Coordinator.handlePoiTapped)
                    resultHandlers.append(handler)
                }
            }
        }

        private func renderCurrentLocationPoi() {
            currentLocationLayer?.clearAllItems()

            guard let location = currentState.currentLocation else { return }

            let option = PoiOptions(styleID: "current-location", poiID: "current-location")
            option.rank = 1_000
            let point = MapPoint(longitude: location.lng, latitude: location.lat)
            let poi = currentLocationLayer?.addPoi(option: option, at: point)
            poi?.show()
        }

        private func updateCamera() {
            guard let mapView else { return }

            var points = currentState.markers.map {
                MapPoint(longitude: $0.coordinates.lng, latitude: $0.coordinates.lat)
            }
            points.append(MapPoint(longitude: currentState.center.lng, latitude: currentState.center.lat))

            if let currentLocation = currentState.currentLocation {
                points.append(MapPoint(longitude: currentLocation.lng, latitude: currentLocation.lat))
            }

            if points.count > 1 {
                let area = AreaRect(points: points)
                let cameraUpdate = CameraUpdate.make(area: area)
                mapView.moveCamera(cameraUpdate)
                Self.logger.debug("Moved Kakao camera to area with \(points.count, privacy: .public) points")
            } else {
                let target = MapPoint(longitude: currentState.center.lng, latitude: currentState.center.lat)
                let cameraUpdate = CameraUpdate.make(target: target, zoomLevel: 5, mapView: mapView)
                mapView.moveCamera(cameraUpdate)
                Self.logger.debug("Moved Kakao camera to target lat=\(self.currentState.center.lat, privacy: .public) lng=\(self.currentState.center.lng, privacy: .public)")
            }
        }

        private static func describe(_ mode: RenderMode) -> String {
            switch Int(mode.rawValue) {
            case 0:
                return "gl"
            case 1:
                return "metal"
            case 2:
                return "undefined"
            default:
                return "unknown"
            }
        }

        private func shouldMoveCamera(for nextState: SearchMapViewState) -> Bool {
            let signature = cameraSignature(for: nextState)
            defer { lastCameraSignature = signature }
            return signature != lastCameraSignature
        }

        private func cameraSignature(for state: SearchMapViewState) -> String {
            let markerIDs = state.markers
                .map { "\($0.id):\($0.coordinates.lat):\($0.coordinates.lng)" }
                .joined(separator: "|")
            let currentLocation = state.currentLocation.map { "\($0.lat):\($0.lng)" } ?? "none"
            return "\(state.center.lat):\(state.center.lng)|\(currentLocation)|\(markerIDs)"
        }

        private func configureStylesIfNeeded(labelManager: LabelManager) {
            guard !didConfigureStyles else { return }
            let stylePairs: [(String, UIImage)] = [
                ("marker-default", makeMarkerImage(fill: UIColor(leafGreen), border: UIColor.white, text: nil, emphasized: false)),
                ("marker-selected", makeMarkerImage(fill: UIColor(sunYellow), border: UIColor.white, text: nil, emphasized: true)),
                ("marker-compared-1", makeMarkerImage(fill: UIColor(leafGreen), border: UIColor(sunYellow), text: "1", emphasized: false)),
                ("marker-compared-2", makeMarkerImage(fill: UIColor(leafGreen), border: UIColor(sunYellow), text: "2", emphasized: false)),
                ("marker-compared-3", makeMarkerImage(fill: UIColor(leafGreen), border: UIColor(sunYellow), text: "3", emphasized: false)),
                ("marker-selected-compared-1", makeMarkerImage(fill: UIColor(sunYellow), border: UIColor(leafGreen), text: "1", emphasized: true)),
                ("marker-selected-compared-2", makeMarkerImage(fill: UIColor(sunYellow), border: UIColor(leafGreen), text: "2", emphasized: true)),
                ("marker-selected-compared-3", makeMarkerImage(fill: UIColor(sunYellow), border: UIColor(leafGreen), text: "3", emphasized: true)),
                ("current-location", makeCurrentLocationImage()),
            ]

            for (styleID, image) in stylePairs {
                let iconStyle = PoiIconStyle(symbol: image, anchorPoint: CGPoint(x: 0.5, y: 1.0))
                let perLevelStyle = PerLevelPoiStyle(iconStyle: iconStyle, level: 0)
                labelManager.addPoiStyle(PoiStyle(styleID: styleID, styles: [perLevelStyle]))
            }
            didConfigureStyles = true
        }

        private func styleID(for compareOrder: Int?, isSelected: Bool) -> String {
            guard let compareOrder else {
                return isSelected ? "marker-selected" : "marker-default"
            }

            if isSelected {
                return "marker-selected-compared-\(compareOrder)"
            }

            return "marker-compared-\(compareOrder)"
        }

        private func handlePoiTapped(_ param: PoiInteractionEventParam) {
            onMarkerTap(param.poiItem.itemID)
        }

        private func makeMarkerImage(
            fill: UIColor,
            border: UIColor,
            text: String?,
            emphasized: Bool
        ) -> UIImage {
            let size = CGSize(width: 42, height: 54)
            let renderer = UIGraphicsImageRenderer(size: size)

            return renderer.image { context in
                let cg = context.cgContext
                let pinRect = CGRect(x: 5, y: 2, width: 32, height: 40)
                let shadowColor = UIColor.black.withAlphaComponent(emphasized ? 0.25 : 0.16)

                cg.setShadow(offset: CGSize(width: 0, height: 8), blur: 12, color: shadowColor.cgColor)
                let path = UIBezierPath()
                path.move(to: CGPoint(x: pinRect.midX, y: pinRect.maxY + 10))
                path.addCurve(
                    to: CGPoint(x: pinRect.minX, y: pinRect.midY),
                    controlPoint1: CGPoint(x: pinRect.midX - 12, y: pinRect.maxY + 4),
                    controlPoint2: CGPoint(x: pinRect.minX, y: pinRect.maxY - 6)
                )
                path.addArc(
                    withCenter: CGPoint(x: pinRect.midX, y: pinRect.midY),
                    radius: pinRect.width / 2,
                    startAngle: .pi,
                    endAngle: 0,
                    clockwise: true
                )
                path.addCurve(
                    to: CGPoint(x: pinRect.midX, y: pinRect.maxY + 10),
                    controlPoint1: CGPoint(x: pinRect.maxX, y: pinRect.maxY - 6),
                    controlPoint2: CGPoint(x: pinRect.midX + 12, y: pinRect.maxY + 4)
                )
                path.close()

                fill.setFill()
                path.fill()

                border.setStroke()
                path.lineWidth = emphasized ? 4 : 3
                path.stroke()

                if let text {
                    let badgeRect = CGRect(x: 12, y: 10, width: 18, height: 18)
                    let badgePath = UIBezierPath(ovalIn: badgeRect)
                    UIColor.white.setFill()
                    badgePath.fill()

                    let attributes: [NSAttributedString.Key: Any] = [
                        .font: UIFont.systemFont(ofSize: 11, weight: .bold),
                        .foregroundColor: fill,
                    ]
                    let textSize = text.size(withAttributes: attributes)
                    let textOrigin = CGPoint(
                        x: badgeRect.midX - textSize.width / 2,
                        y: badgeRect.midY - textSize.height / 2
                    )
                    text.draw(at: textOrigin, withAttributes: attributes)
                }
            }
        }

        private func makeCurrentLocationImage() -> UIImage {
            let size = CGSize(width: 24, height: 24)
            let renderer = UIGraphicsImageRenderer(size: size)

            return renderer.image { context in
                let cg = context.cgContext
                let outerRect = CGRect(x: 2, y: 2, width: 20, height: 20)
                let innerRect = CGRect(x: 6, y: 6, width: 12, height: 12)

                cg.setFillColor(UIColor.white.cgColor)
                cg.fillEllipse(in: outerRect)
                cg.setFillColor(UIColor.systemBlue.cgColor)
                cg.fillEllipse(in: innerRect)
            }
        }
    }
}
#endif
