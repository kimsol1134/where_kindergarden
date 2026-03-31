import SwiftUI
#if canImport(UIKit)
import UIKit

// MARK: - Public SwiftUI API

struct NativeBottomSheet<Content: View>: UIViewControllerRepresentable {
    let detents: [SearchResultsSheetDetentKind: CGFloat]
    @Binding var selectedDetent: SearchResultsSheetDetentKind
    let cornerRadius: CGFloat
    @ViewBuilder let content: () -> Content

    func makeCoordinator() -> Coordinator {
        Coordinator(selectedDetent: $selectedDetent)
    }

    func makeUIViewController(context: Context) -> NativeBottomSheetController<Content> {
        let controller = NativeBottomSheetController<Content>(
            cornerRadius: cornerRadius,
            coordinator: context.coordinator
        )
        let hosting = UIHostingController(rootView: content())
        controller.setContent(hosting)
        controller.updateDetents(detents, animated: false)
        controller.snapToDetent(selectedDetent, animated: false)
        return controller
    }

    func updateUIViewController(_ controller: NativeBottomSheetController<Content>, context: Context) {
        controller.coordinator = context.coordinator
        controller.updateDetents(detents, animated: true)

        if controller.currentDetent != selectedDetent && !controller.isDragging {
            controller.snapToDetent(selectedDetent, animated: true)
        }

        controller.updateContent(content())
    }

    final class Coordinator {
        var selectedDetent: Binding<SearchResultsSheetDetentKind>

        init(selectedDetent: Binding<SearchResultsSheetDetentKind>) {
            self.selectedDetent = selectedDetent
        }
    }
}

// MARK: - UIKit Controller

final class NativeBottomSheetController<Content: View>: UIViewController, UIGestureRecognizerDelegate {

    // MARK: Properties

    fileprivate var coordinator: NativeBottomSheet<Content>.Coordinator?
    fileprivate private(set) var currentDetent: SearchResultsSheetDetentKind = .peek
    fileprivate private(set) var isDragging = false

    private let sheetCornerRadius: CGFloat
    private var detentHeights: [SearchResultsSheetDetentKind: CGFloat] = [:]

    private let shadowHost = UIView()
    private let containerView = UIView()
    private let grabberView = UIView()
    private var hostingController: UIHostingController<Content>?
    private var heightConstraint: NSLayoutConstraint!

    private var panGesture: UIPanGestureRecognizer!
    private weak var trackedScrollView: UIScrollView?
    private var runningAnimator: UIViewPropertyAnimator?

    private var dragStartHeight: CGFloat = 0
    private var isTransitioningFromScroll = false

    // MARK: Init

    init(cornerRadius: CGFloat, coordinator: NativeBottomSheet<Content>.Coordinator?) {
        self.sheetCornerRadius = cornerRadius
        self.coordinator = coordinator
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError() }

    // MARK: Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
        setupContainer()
        setupGrabber()
        setupPanGesture()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        discoverScrollView()
    }

    // MARK: Setup

    private func setupContainer() {
        shadowHost.translatesAutoresizingMaskIntoConstraints = false
        shadowHost.backgroundColor = .clear
        shadowHost.layer.shadowColor = UIColor.black.cgColor
        shadowHost.layer.shadowOpacity = 0.08
        shadowHost.layer.shadowRadius = 12
        shadowHost.layer.shadowOffset = CGSize(width: 0, height: -4)

        containerView.translatesAutoresizingMaskIntoConstraints = false
        containerView.backgroundColor = UIColor(paperWhite).withAlphaComponent(0.97)
        containerView.layer.cornerRadius = sheetCornerRadius
        containerView.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
        containerView.layer.cornerCurve = .continuous
        containerView.clipsToBounds = true

        view.addSubview(shadowHost)
        shadowHost.addSubview(containerView)

        heightConstraint = shadowHost.heightAnchor.constraint(equalToConstant: 200)

        NSLayoutConstraint.activate([
            shadowHost.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            shadowHost.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            shadowHost.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            heightConstraint,

            containerView.topAnchor.constraint(equalTo: shadowHost.topAnchor),
            containerView.leadingAnchor.constraint(equalTo: shadowHost.leadingAnchor),
            containerView.trailingAnchor.constraint(equalTo: shadowHost.trailingAnchor),
            containerView.bottomAnchor.constraint(equalTo: shadowHost.bottomAnchor),
        ])
    }

    private func setupGrabber() {
        grabberView.translatesAutoresizingMaskIntoConstraints = false
        grabberView.backgroundColor = UIColor(slateSoft).withAlphaComponent(0.35)
        grabberView.layer.cornerRadius = 2.5

        containerView.addSubview(grabberView)
        NSLayoutConstraint.activate([
            grabberView.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 10),
            grabberView.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            grabberView.widthAnchor.constraint(equalToConstant: 40),
            grabberView.heightAnchor.constraint(equalToConstant: 5),
        ])

        grabberView.isAccessibilityElement = true
        grabberView.accessibilityTraits = .adjustable
        grabberView.accessibilityLabel = "시트 크기 조절"
    }

    private func setupPanGesture() {
        panGesture = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
        panGesture.delegate = self
        containerView.addGestureRecognizer(panGesture)
    }

    // MARK: Content

    func setContent(_ hosting: UIHostingController<Content>) {
        loadViewIfNeeded()

        hostingController = hosting
        hosting.view.backgroundColor = .clear

        addChild(hosting)
        containerView.addSubview(hosting.view)
        hosting.didMove(toParent: self)

        hosting.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hosting.view.topAnchor.constraint(equalTo: grabberView.bottomAnchor, constant: 8),
            hosting.view.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            hosting.view.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            hosting.view.bottomAnchor.constraint(equalTo: containerView.bottomAnchor),
        ])
    }

    func updateContent(_ content: Content) {
        hostingController?.rootView = content
    }

    // MARK: Detents

    func updateDetents(_ detents: [SearchResultsSheetDetentKind: CGFloat], animated: Bool) {
        self.detentHeights = detents
    }

    func snapToDetent(_ detent: SearchResultsSheetDetentKind, animated: Bool) {
        guard let targetHeight = detentHeights[detent] else { return }

        runningAnimator?.stopAnimation(true)
        runningAnimator = nil

        currentDetent = detent
        updateScrollEnabled()

        if animated {
            let reduceMotion = UIAccessibility.isReduceMotionEnabled
            let animator = UIViewPropertyAnimator(
                duration: reduceMotion ? 0.2 : 0.45,
                dampingRatio: reduceMotion ? 1.0 : 0.82
            ) { [self] in
                heightConstraint.constant = targetHeight
                view.superview?.layoutIfNeeded()
            }
            animator.addCompletion { [weak self] _ in
                self?.runningAnimator = nil
            }
            runningAnimator = animator
            animator.startAnimation()
        } else {
            heightConstraint.constant = targetHeight
        }
    }

    private func heightForDetent(_ detent: SearchResultsSheetDetentKind) -> CGFloat {
        detentHeights[detent] ?? 200
    }

    private var peekHeight: CGFloat { heightForDetent(.peek) }
    private var expandedHeight: CGFloat { heightForDetent(.expanded) }

    // MARK: Scroll View Discovery

    private func discoverScrollView() {
        guard trackedScrollView == nil, let hostingView = hostingController?.view else { return }

        if let scrollView = findScrollView(in: hostingView) {
            trackedScrollView = scrollView
            updateScrollEnabled()
        }
    }

    private func findScrollView(in view: UIView) -> UIScrollView? {
        for subview in view.subviews {
            if let scrollView = subview as? UIScrollView {
                return scrollView
            }
            if let found = findScrollView(in: subview) {
                return found
            }
        }
        return nil
    }

    private func updateScrollEnabled() {
        trackedScrollView?.isScrollEnabled = (currentDetent == .expanded)
    }

    // MARK: Pan Gesture

    func gestureRecognizer(
        _ gestureRecognizer: UIGestureRecognizer,
        shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
    ) -> Bool {
        otherGestureRecognizer.view is UIScrollView
    }

    @objc private func handlePan(_ gesture: UIPanGestureRecognizer) {
        switch gesture.state {
        case .began:
            handlePanBegan(gesture)
        case .changed:
            handlePanChanged(gesture)
        case .ended, .cancelled:
            handlePanEnded(gesture)
        default:
            break
        }
    }

    private func handlePanBegan(_ gesture: UIPanGestureRecognizer) {
        runningAnimator?.stopAnimation(true)
        runningAnimator = nil

        isDragging = true
        dragStartHeight = heightConstraint.constant
        isTransitioningFromScroll = false
    }

    private func handlePanChanged(_ gesture: UIPanGestureRecognizer) {
        let translationY = gesture.translation(in: containerView).y

        if let scrollView = trackedScrollView, currentDetent == .expanded {
            let scrollOffset = scrollView.contentOffset.y
            let velocityY = gesture.velocity(in: containerView).y

            if !isTransitioningFromScroll && scrollOffset <= 0 && velocityY > 0 {
                isTransitioningFromScroll = true
                dragStartHeight = heightConstraint.constant
                gesture.setTranslation(.zero, in: containerView)
                scrollView.contentOffset = .zero
                scrollView.isScrollEnabled = false
                return
            }

            if !isTransitioningFromScroll && scrollOffset > 0 {
                return
            }
        }

        let rawHeight = dragStartHeight - translationY
        let clampedHeight = rubberBand(rawHeight, min: peekHeight, max: expandedHeight)
        heightConstraint.constant = clampedHeight
    }

    private func handlePanEnded(_ gesture: UIPanGestureRecognizer) {
        isDragging = false

        let velocityY = gesture.velocity(in: containerView).y
        let currentHeight = heightConstraint.constant

        let projectedHeight = currentHeight - velocityY * 0.15
        let targetDetent = nearestDetent(for: projectedHeight)

        coordinator?.selectedDetent.wrappedValue = targetDetent
        snapToDetent(targetDetent, animated: true)
    }

    // MARK: Helpers

    private func rubberBand(_ value: CGFloat, min minVal: CGFloat, max maxVal: CGFloat) -> CGFloat {
        let limit: CGFloat = 60

        if value < minVal {
            let offset = minVal - value
            return minVal - limit * (1 - exp(-offset / limit))
        }

        if value > maxVal {
            let offset = value - maxVal
            return maxVal + limit * (1 - exp(-offset / limit))
        }

        return value
    }

    private func nearestDetent(for height: CGFloat) -> SearchResultsSheetDetentKind {
        let maxValue = expandedHeight / SearchResultsSheetPolicy.expandedFraction
        return SearchResultsSheetPolicy.nearestDetent(for: height, maximumDetentValue: maxValue)
    }
}
#endif
