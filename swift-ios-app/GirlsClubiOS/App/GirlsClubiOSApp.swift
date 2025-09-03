import SwiftUI

@main
struct GirlsClubiOSApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .onOpenURL { url in
                    DeepLinkRouter.shared.handle(url: url)
                }
        }
    }
}
