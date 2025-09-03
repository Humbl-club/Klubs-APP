import UIKit

enum UIHelpers {
    static func present(_ vc: UIViewController, animated: Bool = true) {
        guard let window = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap({ $0.windows })
            .first(where: { $0.isKeyWindow }) else { return }
        window.rootViewController?.present(vc, animated: animated)
    }
}
