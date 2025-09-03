import SwiftUI
import UIKit
import Supabase
import EventKit

struct EventDetailView: View {
    let event: Event
    @State private var isRegistered = false
    @State private var loading = false
    @State private var toast: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: GCSpacing.lg) {
                Text(event.title)
                    .font(.system(size: 24, weight: .bold))
                    .padding(.top, GCSpacing.xl)
                    .padding(.horizontal, GCSpacing.xl)

                GCCard {
                    VStack(alignment: .leading, spacing: GCSpacing.md) {
                        if isRegistered {
                            HStack { GCBadge(text: "Registered", tint: GCColors.success); Spacer() }
                        }
                        if let desc = event.description { Text(desc) }
                        HStack(spacing: GCSpacing.md) {
                            Text(dateString(event.start_time)).font(.caption).foregroundColor(GCColors.mutedText)
                            if let cents = event.price_cents, cents > 0 {
                                Text(String(format: "€%.2f", Double(cents)/100)).font(.caption).foregroundColor(GCColors.mutedText)
                            } else {
                                Text("Free").font(.caption).foregroundColor(GCColors.success)
                            }
                        }
                        if let loc = event.location, !loc.isEmpty {
                            HStack(spacing: GCSpacing.sm) {
                                Text("Location:").font(.caption).foregroundColor(GCColors.mutedText)
                                Button(loc) { openInMaps(query: loc) }
                                    .font(.caption)
                                    .foregroundColor(GCColors.primary)
                            }
                        }
                    }
                    if isRegistered && isUpcoming(event) {
                        HStack { Spacer()
                            GCButton(title: "Unregister", variant: .outline) {
                                Task { await unregister() }
                            }
                        }
                    }
                }.padding(.horizontal, GCSpacing.xl)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .gcToast(message: $toast)
        .task { await loadRegistration() }
    }

    func dateString(_ s: String) -> String {
        let f = ISO8601DateFormatter();
        let d = f.date(from: s) ?? Date();
        return DateFormatter.localizedString(from: d, dateStyle: .medium, timeStyle: .short)
    }

    func openInMaps(query: String) {
        let q = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "http://maps.apple.com/?q=\(q)") {
            UIApplication.shared.open(url)
        }
    }

    func loadRegistration() async {
        loading = true
        defer { loading = false }
        do {
            let client = SupabaseClientProvider.shared
            let user = try await client.auth.session.user
            let resp = try await client.database
                .from("event_registrations")
                .select("id")
                .eq(column: "event_id", value: event.id)
                .eq(column: "user_id", value: user.id)
                .maybeSingle()
                .execute()
            struct Row: Decodable { let id: String }
            if let row: Row? = try? resp.decoded(Row?.self) {
                await MainActor.run { self.isRegistered = (row != nil) }
            } else {
                await MainActor.run { self.isRegistered = false }
            }
        } catch {
            await MainActor.run { self.isRegistered = false }
        }
    }

    func unregister() async {
        do {
            var url = AppConfig.supabaseURL; url.appendPathComponent("rest/v1/rpc/unregister_from_event")
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
            if let token = try? await SupabaseClientProvider.shared.auth.session.accessToken { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
            let user = try await SupabaseClientProvider.shared.auth.session.user
            let body: [String: Any] = ["event_id_param": event.id, "user_id_param": user.id]
            req.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                let msg = String(data: data, encoding: .utf8) ?? ""
                throw NSError(domain: "unregister", code: (resp as? HTTPURLResponse)?.statusCode ?? -1, userInfo: [NSLocalizedDescriptionKey: msg])
            }
            await MainActor.run { self.isRegistered = false; self.toast = "Unregistered" }
        } catch {
            await MainActor.run { self.toast = error.localizedDescription }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { withAnimation { toast = nil } }
    }

    func isUpcoming(_ e: Event) -> Bool {
        let f = ISO8601DateFormatter();
        let d = f.date(from: e.start_time) ?? Date()
        return d > Date()
    }


    func addToCalendar() async {
        let store = EKEventStore()
        do {
            try await store.requestAccess(to: .event)
            let ev = EKEvent(eventStore: store)
            ev.title = event.title
            let f = ISO8601DateFormatter()
            ev.startDate = f.date(from: event.start_time) ?? Date()
            ev.endDate = f.date(from: event.end_time ?? event.start_time) ?? ev.startDate.addingTimeInterval(3600)
            ev.location = event.location
            ev.calendar = store.defaultCalendarForNewEvents
            try store.save(ev, span: .thisEvent)
            await MainActor.run { toast = "Added to Calendar" }
        } catch {
            await MainActor.run { toast = error.localizedDescription }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { withAnimation { toast = nil } }
    }
}
