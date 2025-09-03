import Foundation
import Combine

@MainActor
final class DeepLinkRouter: ObservableObject {
    static let shared = DeepLinkRouter()
    @Published var eventId: String?

    private init() {}

    func handle(url: URL) {
        // Expected: girlsclub://event/<id>
        guard url.scheme == "girlsclub" else { return }
        let path = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let comps = path.split(separator: "/").map(String.init)
        if url.host == "event", let id = comps.first {
            self.eventId = id
        }
    }
}

