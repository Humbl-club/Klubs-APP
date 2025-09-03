import SwiftUI

struct GCToastModifier: ViewModifier {
    @Binding var message: String?

    func body(content: Content) -> some View {
        ZStack(alignment: .top) {
            content
            if let msg = message {
                HStack {
                    Text(msg)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.vertical, 10)
                        .padding(.horizontal, 16)
                        .background(GCColors.primary.opacity(0.95))
                        .clipShape(Capsule())
                        .gcShadow(GCShadow.soft)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 16)
                .transition(.move(edge: .top).combined(with: .opacity))
                .animation(.spring(response: 0.35, dampingFraction: 0.9), value: message)
            }
        }
    }
}

extension View {
    func gcToast(message: Binding<String?>) -> some View {
        self.modifier(GCToastModifier(message: message))
    }
}

