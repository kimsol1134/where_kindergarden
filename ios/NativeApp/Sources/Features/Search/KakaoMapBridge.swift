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
private let defaultSearchZoomLevel = 5

struct SearchMapViewState: Equatable {
    let center: Coordinates
    let currentLocation: Coordinates?
    let markers: [SearchMapMarker]
    let selectedKindergartenID: String?
    let currentLocationRecenterRequestID: Int
}

enum SearchMapCameraCommand: Equatable {
    case none
    case fitSearchContext
    case centerOnCurrentLocation
}

private struct SearchMapAutoFitSignature: Equatable {
    struct Marker: Equatable {
        let id: String
        let coordinates: Coordinates
    }

    let center: Coordinates
    let markers: [Marker]

    init(state: SearchMapViewState) {
        center = state.center
        markers = state.markers.map { Marker(id: $0.id, coordinates: $0.coordinates) }
    }
}

enum SearchMapCameraDecision {
    static func command(
        previousRenderedState: SearchMapViewState?,
        nextState: SearchMapViewState,
        isPerformingExplicitCurrentLocationRecenter: Bool
    ) -> SearchMapCameraCommand {
        if nextState.currentLocationRecenterRequestID != 0,
           nextState.currentLocationRecenterRequestID != previousRenderedState?.currentLocationRecenterRequestID,
           nextState.currentLocation != nil {
            return .centerOnCurrentLocation
        }

        if isPerformingExplicitCurrentLocationRecenter {
            return .none
        }

        guard let previousRenderedState else {
            return .fitSearchContext
        }

        return SearchMapAutoFitSignature(state: previousRenderedState)
            == SearchMapAutoFitSignature(state: nextState)
            ? .none
            : .fitSearchContext
    }
}

struct KakaoSearchMapSurface: View {
    let appKey: String?
    let center: Coordinates
    let currentLocation: Coordinates?
    let markers: [SearchMapMarker]
    let selectedKindergartenID: String?
    let currentLocationRecenterRequestID: Int
    @Binding var runtimeMessage: String?
    let showsStatusCard: Bool
    let onMarkerTap: (String) -> Void

    private var state: SearchMapViewState {
        SearchMapViewState(
            center: center,
            currentLocation: currentLocation,
            markers: markers,
            selectedKindergartenID: selectedKindergartenID,
            currentLocationRecenterRequestID: currentLocationRecenterRequestID
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

    final class Coordinator: NSObject, MapControllerDelegate, KakaoMapEventDelegate {
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
            selectedKindergartenID: nil,
            currentLocationRecenterRequestID: 0
        )
        private var lastRenderedState: SearchMapViewState?
        private var lastAppliedContainerSize: CGSize = .zero
        private var pendingInitialViewAdd = false
        private var hasRequestedMapView = false
        private var activeCurrentLocationRecenterRequestID: Int?
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
            renderMap(cameraCommand: cameraCommand(for: state))
            lastRenderedState = state
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
            lastRenderedState = nil
            lastAppliedContainerSize = .zero
            activeCurrentLocationRecenterRequestID = nil
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
                defaultLevel: defaultSearchZoomLevel
            )

            hasRequestedMapView = true
            Self.logger.notice(
                "Adding Kakao view reason=\(reason, privacy: .public) width=\(rawSize.width, privacy: .public) height=\(rawSize.height, privacy: .public)"
            )
            controller.addView(mapInfo, viewSize: rawSize)
        }

        func addViewSucceeded(_ viewName: String, viewInfoName: String) {
            runtimeMessage.wrappedValue = nil
            pendingInitialViewAdd = false
            mapView = controller?.getView(viewName) as? KakaoMap
            mapView?.keepLevelOnResize = true
            mapView?.eventDelegate = self
            applyMapViewRectIfNeeded(reason: "addViewSucceeded")
            if let container {
                Self.logger.notice(
                    "Kakao addViewSucceeded viewName=\(viewName, privacy: .public) renderMode=\(Self.describe(container.renderMode), privacy: .public) hasRenderView=\((container.renderView != nil), privacy: .public)"
                )
            } else {
                Self.logger.notice("Kakao addViewSucceeded viewName=\(viewName, privacy: .public) without container reference")
            }
            renderMap(cameraCommand: cameraCommand(for: currentState))
            lastRenderedState = currentState
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

        private func cameraCommand(for state: SearchMapViewState) -> SearchMapCameraCommand {
            SearchMapCameraDecision.command(
                previousRenderedState: lastRenderedState,
                nextState: state,
                isPerformingExplicitCurrentLocationRecenter: activeCurrentLocationRecenterRequestID != nil
            )
        }

        private func renderMap(cameraCommand: SearchMapCameraCommand) {
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

            switch cameraCommand {
            case .none:
                break
            case .fitSearchContext:
                fitCameraToSearchContext()
            case .centerOnCurrentLocation:
                centerCameraOnCurrentLocation()
            }
        }

        private func applyMapViewRectIfNeeded(reason: String, size explicitSize: CGSize? = nil) {
            guard let mapView else { return }

            let size = explicitSize ?? container?.bounds.size ?? .zero
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

        private func fitCameraToSearchContext() {
            guard let mapView else { return }

            var points = currentState.markers.map {
                MapPoint(longitude: $0.coordinates.lng, latitude: $0.coordinates.lat)
            }
            points.append(MapPoint(longitude: currentState.center.lng, latitude: currentState.center.lat))

            if points.count > 1 {
                let area = AreaRect(points: points)
                let cameraUpdate = CameraUpdate.make(area: area)
                mapView.moveCamera(cameraUpdate)
                Self.logger.debug("Moved Kakao camera to area with \(points.count, privacy: .public) points")
            } else {
                let target = MapPoint(longitude: currentState.center.lng, latitude: currentState.center.lat)
                let cameraUpdate = CameraUpdate.make(target: target, zoomLevel: defaultSearchZoomLevel, mapView: mapView)
                mapView.moveCamera(cameraUpdate)
                Self.logger.debug("Moved Kakao camera to target lat=\(self.currentState.center.lat, privacy: .public) lng=\(self.currentState.center.lng, privacy: .public)")
            }
        }

        private func centerCameraOnCurrentLocation() {
            guard let mapView, let currentLocation = currentState.currentLocation else {
                activeCurrentLocationRecenterRequestID = nil
                return
            }

            let requestID = currentState.currentLocationRecenterRequestID
            activeCurrentLocationRecenterRequestID = requestID
            let zoomLevel = mapView.zoomLevel > 0 ? mapView.zoomLevel : defaultSearchZoomLevel
            let target = MapPoint(longitude: currentLocation.lng, latitude: currentLocation.lat)
            let cameraUpdate = CameraUpdate.make(target: target, zoomLevel: zoomLevel, mapView: mapView)
            mapView.moveCamera(cameraUpdate) { [weak self, weak mapView] in
                guard let self, let mapView else { return }
                self.logMapInteraction(
                    "Current-location camera callback fired. focused=\(mapView.isFocused)"
                )
                self.completeExplicitCurrentLocationRecenter(
                    requestID: requestID,
                    on: mapView,
                    reason: "moveCamera callback"
                )
            }
            Self.logger.debug(
                "Centered Kakao camera on current location lat=\(currentLocation.lat, privacy: .public) lng=\(currentLocation.lng, privacy: .public) zoom=\(zoomLevel, privacy: .public)"
            )
        }

        func kakaoMapFocusDidChanged(kakaoMap: KakaoMap, focus: Bool) {
            logMapInteraction("Map focus changed. focused=\(focus)")
        }

        func cameraWillMove(kakaoMap: KakaoMap, by: MoveBy) {
            logMapInteraction("Camera will move. focused=\(kakaoMap.isFocused) by=\(String(describing: by))")
        }

        func cameraDidStopped(kakaoMap: KakaoMap, by: MoveBy) {
            logMapInteraction(
                "Camera stopped. focused=\(kakaoMap.isFocused) explicitRecenterInProgress=\(activeCurrentLocationRecenterRequestID != nil)"
            )

            completeActiveCurrentLocationRecenter(on: kakaoMap, reason: "cameraDidStopped")
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

        private func configureStylesIfNeeded(labelManager: LabelManager) {
            guard !didConfigureStyles else { return }
            let markerAnchor = CGPoint(x: 0.5, y: 1.0)
            let stylePairs: [(String, UIImage, CGPoint)] = [
                ("marker-default", pngNormalizedImage(makeMarkerImage(fill: UIColor(leafGreen), border: UIColor.white, text: nil, emphasized: false)), markerAnchor),
                ("marker-selected", pngNormalizedImage(makeMarkerImage(fill: UIColor(sunYellow), border: UIColor.white, text: nil, emphasized: true)), markerAnchor),
                ("marker-compared-1", pngNormalizedImage(makeMarkerImage(fill: UIColor(leafGreen), border: UIColor(sunYellow), text: "1", emphasized: false)), markerAnchor),
                ("marker-compared-2", pngNormalizedImage(makeMarkerImage(fill: UIColor(leafGreen), border: UIColor(sunYellow), text: "2", emphasized: false)), markerAnchor),
                ("marker-compared-3", pngNormalizedImage(makeMarkerImage(fill: UIColor(leafGreen), border: UIColor(sunYellow), text: "3", emphasized: false)), markerAnchor),
                ("marker-selected-compared-1", pngNormalizedImage(makeMarkerImage(fill: UIColor(sunYellow), border: UIColor(leafGreen), text: "1", emphasized: true)), markerAnchor),
                ("marker-selected-compared-2", pngNormalizedImage(makeMarkerImage(fill: UIColor(sunYellow), border: UIColor(leafGreen), text: "2", emphasized: true)), markerAnchor),
                ("marker-selected-compared-3", pngNormalizedImage(makeMarkerImage(fill: UIColor(sunYellow), border: UIColor(leafGreen), text: "3", emphasized: true)), markerAnchor),
                ("current-location", pngNormalizedImage(makeCurrentLocationImage()), CGPoint(x: 0.5, y: 0.5)),
            ]

            for (styleID, image, anchorPoint) in stylePairs {
                let iconStyle = PoiIconStyle(symbol: image, anchorPoint: anchorPoint)
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
            let size = CGSize(width: 30, height: 30)
            let renderer = UIGraphicsImageRenderer(size: size)
            let brandBlue = UIColor(red: 0.11, green: 0.52, blue: 0.98, alpha: 1)

            return renderer.image { context in
                let cg = context.cgContext
                let haloRect = CGRect(x: 1.5, y: 1.5, width: 27, height: 27)
                let ringRect = CGRect(x: 7.5, y: 7.5, width: 15, height: 15)
                let coreRect = CGRect(x: 10.5, y: 10.5, width: 9, height: 9)

                cg.setFillColor(brandBlue.withAlphaComponent(0.20).cgColor)
                cg.fillEllipse(in: haloRect)

                cg.setFillColor(UIColor.white.cgColor)
                cg.fillEllipse(in: ringRect)

                cg.setFillColor(brandBlue.cgColor)
                cg.fillEllipse(in: coreRect)
            }
        }

        private func logMapInteraction(_ message: String) {
            Self.logger.notice("\(message, privacy: .public)")
        }

        private func completeActiveCurrentLocationRecenter(on kakaoMap: KakaoMap, reason: String) {
            guard let requestID = activeCurrentLocationRecenterRequestID else { return }
            completeExplicitCurrentLocationRecenter(requestID: requestID, on: kakaoMap, reason: reason)
        }

        private func completeExplicitCurrentLocationRecenter(
            requestID: Int,
            on kakaoMap: KakaoMap,
            reason: String
        ) {
            guard activeCurrentLocationRecenterRequestID == requestID else { return }

            activeCurrentLocationRecenterRequestID = nil
            restoreMapInteractivity(kakaoMap, reason: reason)
        }

        private func restoreMapInteractivity(_ kakaoMap: KakaoMap, reason: String) {
            if let controller, !controller.isEngineActive {
                controller.activateEngine()
                logMapInteraction("Re-activated engine. reason=\(reason)")
            }

            if !kakaoMap.isEnabled {
                kakaoMap.isEnabled = true
                logMapInteraction("Re-enabled map view. reason=\(reason)")
            }

            kakaoMap.refresh()
            logMapInteraction("Refreshed map view. reason=\(reason) focused=\(kakaoMap.isFocused)")
        }
    }
}
#endif
