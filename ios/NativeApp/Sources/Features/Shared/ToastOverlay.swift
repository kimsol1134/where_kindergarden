import SwiftUI

struct ToastOverlay: View {
    let message: String
    let icon: String
    @Binding var isPresented: Bool

    var body: some View {
        if isPresented {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(jadeDeep)
                Text(message)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(inkBlack)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .glassPanel(cornerRadius: CornerRadius.medium)
            .transition(.move(edge: .top).combined(with: .opacity))
            .task {
                do {
                    try await Task.sleep(for: .seconds(2))
                    withAnimation(.spring(duration: 0.3, bounce: 0.12)) {
                        isPresented = false
                    }
                } catch {}
            }
        }
    }
}

extension View {
    public func toast(isPresented: Binding<Bool>, message: String, icon: String = "checkmark.circle.fill") -> some View {
        overlay(alignment: .top) {
            ToastOverlay(message: message, icon: icon, isPresented: isPresented)
                .padding(.top, 8)
                .animation(.spring(duration: 0.35, bounce: 0.12), value: isPresented.wrappedValue)
        }
    }
}
