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
    let showsStatusCard: Bool
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
                    title: "지도를 준비 중이에요",
                    message: "지도를 불러오지 못했어요. 아래 목록으로 먼저 둘러보세요.",
                    showsContent: !showsStatusCard
                )
            }
#else
            MapUnavailablePlaceholder(
                title: "지도를 준비 중이에요",
                message: "지도를 불러오지 못했어요. 아래 목록으로 먼저 둘러보세요.",
                showsContent: !showsStatusCard
            )
#endif
            if let runtimeMessage, appKey != nil {
                MapUnavailablePlaceholder(
                    title: "지도를 불러오지 못했어요",
                    message: runtimeMessage,
                    showsContent: !showsStatusCard
                )
                .transition(.opacity)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct MapUnavailablePlaceholder: View {
    let title: String
    let message: String
    var showsContent = true

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                Color(red: 0.98, green: 0.992, blue: 0.973)

                Ellipse()
                    .fill(
                        RadialGradient(
                            colors: [sunYellow.opacity(0.20), sunYellow.opacity(0.06), .clear],
                            center: UnitPoint(x: 0.6, y: 0.5),
                            startRadius: 0,
                            endRadius: 110
                        )
                    )
                    .frame(width: 220, height: 180)
                    .offset(x: -100, y: 100)
                    .blur(radius: 40)

                Ellipse()
                    .fill(
                        RadialGradient(
                            colors: [jadeGreen.opacity(0.16), jadeGreen.opacity(0.04), .clear],
                            center: UnitPoint(x: 0.3, y: 0.4),
                            startRadius: 0,
                            endRadius: 130
                        )
                    )
                    .frame(width: 260, height: 200)
                    .offset(x: 100, y: -160)
                    .blur(radius: 40)

                if showsContent {
                    VStack {
                        Spacer(minLength: max(220, proxy.size.height * 0.46))

                        HStack(alignment: .top, spacing: 14) {
                            ZStack {
                                Circle()
                                    .fill(jadeGreen.opacity(0.16))
                                    .frame(width: 46, height: 46)
                                Image(systemName: "map.circle.fill")
                                    .font(.title2.weight(.bold))
                                    .foregroundStyle(jadeDeep)
                            }

                            VStack(alignment: .leading, spacing: 8) {
                                NativeBadge("지도 상태", tone: .slate)
                                Text(title)
                                    .font(.headline.weight(.semibold))
                                    .foregroundStyle(inkBlack)
                                Text(message)
                                    .font(.footnote)
                                    .foregroundStyle(slateBlue)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            Spacer(minLength: 0)
                        }
                        .padding(18)
                        .glassPanel(cornerRadius: 28)
                        .padding(.horizontal, 24)

                        Spacer()
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
        private var lastAppliedContainerSize: CGSize = .zero
        private var pendingInitialViewAdd = false
        private var hasRequestedMapView = false
        private let minimumRenderableViewDimension: CGFloat = 10

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

            if !controller.isEngineActive {
                controller.activateEngine()
            }

            addMapViewIfNeeded(reason: "update")
            applyMapViewRectIfNeeded(reason: "update")

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
            pendingInitialViewAdd = false
            hasRequestedMapView = false
            lastAppliedContainerSize = .zero
        }

        private func initializeSDKIfNeeded() {
            guard !Self.initializedAppKeys.contains(appKey) else { return }
            SDKInitializer.InitSDK(appKey: appKey)
            Self.initializedAppKeys.insert(appKey)
        }

        func addViews() {
            pendingInitialViewAdd = true
            addMapViewIfNeeded(reason: "addViews")
        }

        private func addMapViewIfNeeded(reason: String) {
            guard pendingInitialViewAdd else { return }
            guard !hasRequestedMapView else { return }
            guard let controller else { return }

            let rawSize = container?.bounds.size ?? .zero
            guard rawSize.width > minimumRenderableViewDimension,
                  rawSize.height > minimumRenderableViewDimension else {
                Self.logger.notice("Deferring Kakao view add until layout settles. reason=\(reason, privacy: .public)")
                return
            }

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

            let viewSize = resolvedViewSize(from: rawSize)
            hasRequestedMapView = true
            Self.logger.notice(
                "Adding Kakao view reason=\(reason, privacy: .public) width=\(viewSize.width, privacy: .public) height=\(viewSize.height, privacy: .public)"
            )
            controller.addView(mapInfo, viewSize: viewSize)
        }

        func addViewSucceeded(_ viewName: String, viewInfoName: String) {
            runtimeMessage.wrappedValue = nil
            pendingInitialViewAdd = false
            mapView = controller?.getView(viewName) as? KakaoMap
            mapView?.keepLevelOnResize = true
            applyMapViewRectIfNeeded(reason: "addViewSucceeded")
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
            hasRequestedMapView = false
            runtimeMessage.wrappedValue = "지도를 불러오지 못했어요. 아래 목록으로 먼저 둘러보세요."
        }

        func containerDidResized(_ size: CGSize) {
            addMapViewIfNeeded(reason: "containerDidResized")
            applyMapViewRectIfNeeded(reason: "containerDidResized", size: size)
        }

        func authenticationSucceeded() {
            Self.logger.notice("Kakao authentication succeeded")
            runtimeMessage.wrappedValue = nil
        }

        func authenticationFailed(_ errorCode: Int, desc: String) {
            Self.logger.error("Kakao authentication failed code=\(errorCode, privacy: .public) desc=\(desc, privacy: .public)")
            runtimeMessage.wrappedValue = runtimeFailureMessage(for: errorCode)
        }

        private func runtimeFailureMessage(for errorCode: Int) -> String {
            switch errorCode {
            case 401:
                return "Kakao 지도 인증이 거부됐어요. 앱 키와 Kakao 개발자 설정을 확인해 주세요."
            case 403:
                return "Kakao 지도 권한이 없어 지도를 열 수 없어요. 설정을 확인해 주세요."
            case 429:
                return "Kakao 지도 호출 한도를 넘어 잠시 후 다시 시도해 주세요."
            case 499:
                return "Kakao 지도 서버와 통신하지 못했어요. 네트워크를 확인해 주세요."
            default:
                return "지도를 불러오지 못했어요. 아래 목록으로 먼저 둘러보세요."
            }
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

        private func resolvedViewSize(from rawSize: CGSize) -> CGSize {
            return rawSize
        }

        private func applyMapViewRectIfNeeded(reason: String, size explicitSize: CGSize? = nil) {
            guard let mapView else { return }

            let rawSize = explicitSize ?? container?.bounds.size ?? .zero
            let size = resolvedViewSize(from: rawSize)
            guard size != lastAppliedContainerSize else { return }

            mapView.viewRect = CGRect(origin: .zero, size: size)
            lastAppliedContainerSize = size
            Self.logger.notice(
                "Applied Kakao viewRect reason=\(reason, privacy: .public) width=\(size.width, privacy: .public) height=\(size.height, privacy: .public)"
            )
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
                ("marker-default", pngNormalizedImage(makeMarkerImage(fill: UIColor(leafGreen), border: UIColor.white, text: nil, emphasized: false))),
                ("marker-selected", pngNormalizedImage(makeMarkerImage(fill: UIColor(sunYellow), border: UIColor.white, text: nil, emphasized: true))),
                ("marker-compared-1", pngNormalizedImage(makeMarkerImage(fill: UIColor(leafGreen), border: UIColor(sunYellow), text: "1", emphasized: false))),
                ("marker-compared-2", pngNormalizedImage(makeMarkerImage(fill: UIColor(leafGreen), border: UIColor(sunYellow), text: "2", emphasized: false))),
                ("marker-compared-3", pngNormalizedImage(makeMarkerImage(fill: UIColor(leafGreen), border: UIColor(sunYellow), text: "3", emphasized: false))),
                ("marker-selected-compared-1", pngNormalizedImage(makeMarkerImage(fill: UIColor(sunYellow), border: UIColor(leafGreen), text: "1", emphasized: true))),
                ("marker-selected-compared-2", pngNormalizedImage(makeMarkerImage(fill: UIColor(sunYellow), border: UIColor(leafGreen), text: "2", emphasized: true))),
                ("marker-selected-compared-3", pngNormalizedImage(makeMarkerImage(fill: UIColor(sunYellow), border: UIColor(leafGreen), text: "3", emphasized: true))),
                ("current-location", pngNormalizedImage(makeCurrentLocationImage())),
            ]

            for (styleID, image) in stylePairs {
                let iconStyle = PoiIconStyle(symbol: image, anchorPoint: CGPoint(x: 0.5, y: 1.0))
                let perLevelStyle = PerLevelPoiStyle(iconStyle: iconStyle, level: 0)
                labelManager.addPoiStyle(PoiStyle(styleID: styleID, styles: [perLevelStyle]))
            }
            didConfigureStyles = true
        }

        private func pngNormalizedImage(_ image: UIImage) -> UIImage {
            guard let pngData = image.pngData(),
                  let normalizedImage = UIImage(data: pngData, scale: UIScreen.main.scale) else {
                Self.logger.notice("Kakao marker image PNG normalization skipped")
                return image
            }

            return normalizedImage
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
            let size = CGSize(width: 16, height: 21)
            let renderer = UIGraphicsImageRenderer(size: size)

            return renderer.image { context in
                let cg = context.cgContext
                let pinRect = CGRect(x: 2.5, y: 1.0, width: 11, height: 14)
                let shadowColor = UIColor.black.withAlphaComponent(emphasized ? 0.20 : 0.12)

                cg.setShadow(offset: CGSize(width: 0, height: 2), blur: 3.5, color: shadowColor.cgColor)
                let path = UIBezierPath()
                path.move(to: CGPoint(x: pinRect.midX, y: pinRect.maxY + 4))
                path.addCurve(
                    to: CGPoint(x: pinRect.minX, y: pinRect.midY),
                    controlPoint1: CGPoint(x: pinRect.midX - 4.5, y: pinRect.maxY + 1.5),
                    controlPoint2: CGPoint(x: pinRect.minX, y: pinRect.maxY - 2)
                )
                path.addArc(
                    withCenter: CGPoint(x: pinRect.midX, y: pinRect.midY),
                    radius: pinRect.width / 2,
                    startAngle: .pi,
                    endAngle: 0,
                    clockwise: true
                )
                path.addCurve(
                    to: CGPoint(x: pinRect.midX, y: pinRect.maxY + 4),
                    controlPoint1: CGPoint(x: pinRect.maxX, y: pinRect.maxY - 2),
                    controlPoint2: CGPoint(x: pinRect.midX + 4.5, y: pinRect.maxY + 1.5)
                )
                path.close()

                fill.setFill()
                path.fill()

                border.setStroke()
                path.lineWidth = emphasized ? 2.2 : 1.8
                path.stroke()

                let ringRect = CGRect(x: pinRect.midX - 2.4, y: pinRect.midY - 2.4, width: 4.8, height: 4.8)
                let ringPath = UIBezierPath(ovalIn: ringRect)
                UIColor.white.setFill()
                ringPath.fill()

                let centerRect = CGRect(x: pinRect.midX - 1.15, y: pinRect.midY - 1.15, width: 2.3, height: 2.3)
                let centerPath = UIBezierPath(ovalIn: centerRect)
                (emphasized ? UIColor(jadeDeep) : fill).setFill()
                centerPath.fill()

                if let text {
                    let badgeRect = CGRect(x: 9, y: 3.2, width: 6.4, height: 6.4)
                    let badgePath = UIBezierPath(ovalIn: badgeRect)
                    UIColor.white.setFill()
                    badgePath.fill()

                    let attributes: [NSAttributedString.Key: Any] = [
                        .font: UIFont.systemFont(ofSize: 4.8, weight: .bold),
                        .foregroundColor: emphasized ? UIColor(jadeDeep) : fill,
                    ]
                    let textSize = text.size(withAttributes: attributes)
                    let textOrigin = CGPoint(
                        x: badgeRect.midX - textSize.width / 2,
                        y: badgeRect.midY - textSize.height / 2 - 0.15
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
