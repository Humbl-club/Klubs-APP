import SwiftUI
import UIKit

struct Event: Decodable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let start_time: String
    let price_cents: Int?
    let loyalty_points_price: Int?
    let location: String?
}

struct EventsListView: View {
    @State private var events: [Event] = []
    @State private var loading = true
    @State private var error: String?
    @StateObject private var loyalty = LoyaltyStore()
    @ObservedObject var router = DeepLinkRouter.shared
    @State private var toastMessage: String?
    @State private var registeredEventIds: Set<String> = []

    var body: some View {
        NavigationView {
            ZStack {
                LinearGradient(gradient: Gradient(colors: [GCColors.background, GCColors.background.opacity(0.96)]), startPoint: .topLeading, endPoint: .bottomTrailing)
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: GCSpacing.lg) {
                        HStack {
                            Text("Events")
                                .font(.system(size: 28, weight: .bold))
                            Spacer()
                            if SessionStore.shared.isOrgAdmin {
                                GCButton(title: "+ New", variant: .glass) {
                                    presentCreate()
                                }
                            }
                        }
                        .padding(.top, GCSpacing.xl)
                        .padding(.horizontal, GCSpacing.xl)

                        if loading {
                            ProgressView("Loading events…")
                                .padding()
                        } else if let error = error {
                            GCCard { Text(error).foregroundColor(.red) }
                                .padding(.horizontal, GCSpacing.xl)
                        } else {
                            LazyVStack(spacing: GCSpacing.lg, pinnedViews: []) {
                                ForEach(events) { e in
                                    GCCard {
                                        VStack(alignment: .leading, spacing: GCSpacing.sm) {
                                            HStack {
                                                GCBadge(text: isUpcoming(e) ? "Upcoming" : "Past", tint: isUpcoming(e) ? GCColors.primary : GCColors.mutedText)
                                                if registeredEventIds.contains(e.id) {
                                                    GCBadge(text: "Registered", tint: GCColors.success)
                                                }
                                                Spacer()
                                            }
                                            NavigationLink(destination: EventDetailView(event: e)) {
                                                Text(e.title)
                                            }
                                                .font(.system(size: 18, weight: .semibold))
                                            if let desc = e.description {
                                                Text(desc)
                                                    .font(.system(size: 14))
                                                    .foregroundColor(GCColors.mutedText)
                                                    .lineLimit(2)
                                            }
                                            HStack(spacing: GCSpacing.md) {
                                                Text(dateString(e.start_time))
                                                    .font(.caption)
                                                    .foregroundColor(GCColors.mutedText)
                                                if let cents = e.price_cents, cents > 0 {
                                                    Text(String(format: "€%.2f", Double(cents)/100))
                                                        .font(.caption)
                                                        .foregroundColor(GCColors.mutedText)
                                                } else {
                                                    Text("Free").font(.caption).foregroundColor(GCColors.success)
                                                }
                                            }
                        HStack(spacing: GCSpacing.sm) {
                            GCButton(title: "Details", variant: .glass) {}
                            if let cents = e.price_cents, cents > 0 {
                                GCButton(title: "Register", variant: .primary, fullWidth: true) {
                                    presentPayment(for: e)
                                }
                                .disabled(registeredEventIds.contains(e.id))
                            } else if let points = e.loyalty_points_price, points > 0 {
                                GCButton(title: "Use Points (\(points))", variant: .primary, fullWidth: true) {
                                    Task { await pointsFlow(for: e) }
                                }
                                .disabled(loyalty.availablePoints < (e.loyalty_points_price ?? Int.max))
                            } else {
                                if registeredEventIds.contains(e.id) {
                                    GCButton(title: "Registered", variant: .glass, fullWidth: true) {}
                                        .disabled(true)
                                } else {
                                    GCButton(title: "Register", variant: .primary, fullWidth: true) {
                                        Task { await registerForFree(eventId: e.id) }
                                    }
                                }
                            }
                        }.padding(.top, GCSpacing.sm)
                                        }
                                    }
                                    .padding(.horizontal, GCSpacing.xl)
                                }
                            }
                            .padding(.bottom, GCSpacing.xl)
                        }
                    }
                }
            }
            .navigationBarHidden(true)
        }
        .gcToast(message: $toastMessage)
        .task {
            await loadEvents()
            await loyalty.refresh()
            await loadRegistrations()
        }
        .onReceive(NotificationCenter.default.publisher(for: .paymentSucceeded)) { note in
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            if let id = note.userInfo?["eventId"] as? String, let ev = events.first(where: { $0.id == id }) {
                withAnimation { self.registeredEventIds.insert(id) }
                let f = ISO8601DateFormatter()
                if let start = f.date(from: ev.start_time) {
                    NotificationManager.shared.scheduleEventReminder(eventId: ev.id, title: ev.title, start: start)
                }
            }
            withAnimation { toastMessage = "Payment successful" }
            Task { await loadEvents() }
        }
        .onReceive(NotificationCenter.default.publisher(for: .paymentCancelled)) { _ in
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
            withAnimation { toastMessage = "Payment canceled" }
        }
        .onReceive(NotificationCenter.default.publisher(for: .paymentFailed)) { note in
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            let err = (note.userInfo?["error"] as? String) ?? "Payment failed"
            withAnimation { toastMessage = err }
        }
        .onChange(of: toastMessage) { value in
            guard value != nil else { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                withAnimation { toastMessage = nil }
            }
        }
        .onChange(of: router.eventId) { eid in
            guard let id = eid, let ev = events.first(where: { $0.id == id }) else { return }
            presentEventDetail(ev)
            router.eventId = nil
        }
    }

    func loadEvents() async {
        loading = true
        error = nil
        do {
            let client = SupabaseClientProvider.shared
            let response = try await client.database.from("events").select().order(column: "start_time", ascending: true).execute()
            let items = try response.decoded([Event].self)
            await MainActor.run {
                self.events = items
                self.loading = false
            }
            CacheStore.save(items, to: "events.json")
        } catch {
            await MainActor.run {
                if let cached: [Event] = CacheStore.load([Event].self, from: "events.json") {
                    self.events = cached
                    self.error = "Loaded cached events (offline)"
                } else {
                    self.error = error.localizedDescription
                }
                self.loading = false
            }
        }
    }

    func isoDate(_ s: String) -> Date {
        let f = ISO8601DateFormatter()
        return f.date(from: s) ?? Date()
    }

    func isUpcoming(_ e: Event) -> Bool { isoDate(e.start_time) > Date() }
    func dateString(_ s: String) -> String {
        DateFormatter.localizedString(from: isoDate(s), dateStyle: .medium, timeStyle: .short)
    }

    func presentPayment(for e: Event) {
        let vc = UIHostingController(rootView: PaymentCheckout(eventId: e.id))
        UIHelpers.present(vc)
    }

    func presentCreate() {
        let vc = UIHostingController(rootView: EventCreateView())
        UIHelpers.present(vc)
    }

    func presentEventDetail(_ e: Event) {
        let vc = UIHostingController(rootView: EventDetailView(event: e))
        UIHelpers.present(vc)
    }

    func pointsFlow(for e: Event) async {
        let ok = await loyalty.redeemPoints(for: e.id)
        if ok {
            await MainActor.run {
                self.registeredEventIds.insert(e.id)
                self.toastMessage = "Registered using points"
            }
            let f = ISO8601DateFormatter()
            if let start = f.date(from: e.start_time) {
                NotificationManager.shared.scheduleEventReminder(eventId: e.id, title: e.title, start: start)
            }
            await loadEvents()
        } else {
            self.error = loyalty.lastError
        }
    }

    func registerForFree(eventId: String) async {
        do {
            let client = SupabaseClientProvider.shared
            let user = try await client.auth.session.user
            var url = AppConfig.supabaseURL
            url.appendPathComponent("rest/v1/rpc/register_for_event")
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
            if let token = try? await client.auth.session.accessToken {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            let body: [String: Any] = [
                "event_id_param": eventId,
                "user_id_param": user.id,
                "payment_method_param": NSNull(),
                "loyalty_points_used_param": 0
            ]
            req.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                let msg = String(data: data, encoding: .utf8) ?? ""
                throw NSError(domain: "register", code: (resp as? HTTPURLResponse)?.statusCode ?? -1, userInfo: [NSLocalizedDescriptionKey: msg])
            }
            // Haptic + toast + schedule local reminder
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            await MainActor.run { self.toastMessage = "Registered for event" }
            await MainActor.run { self.registeredEventIds.insert(eventId) }
            if let ev = self.events.first(where: { $0.id == eventId }) {
                let f = ISO8601DateFormatter()
                if let start = f.date(from: ev.start_time) {
                    NotificationManager.shared.scheduleEventReminder(eventId: ev.id, title: ev.title, start: start)
                }
            }
            await loadEvents()
        } catch {
            await MainActor.run { self.error = error.localizedDescription }
        }
    }

    func loadRegistrations() async {
        do {
            let client = SupabaseClientProvider.shared
            let user = try await client.auth.session.user
            let resp = try await client.database
                .from("event_registrations")
                .select("event_id")
                .eq(column: "user_id", value: user.id)
                .execute()
            struct Row: Decodable { let event_id: String }
            let rows = try resp.decoded([Row].self)
            await MainActor.run { self.registeredEventIds = Set(rows.map { $0.event_id }) }
        } catch { /* ignore */ }
    }

}

#Preview {
    EventsListView()
}
