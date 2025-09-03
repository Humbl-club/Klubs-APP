import SwiftUI

struct RegistrationRow: Decodable, Identifiable {
    let id: String
    let event_id: String
    let registered_at: String?
}

struct MyRegistrationsView: View {
    @State private var events: [Event] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        NavigationView {
            List {
                if let e = error { Text(e).foregroundColor(.red) }
                Section(header: Text("Upcoming")) {
                    ForEach(events.filter { isUpcoming($0) }) { e in
                        NavigationLink(destination: EventDetailView(event: e)) {
                            VStack(alignment: .leading) {
                                Text(e.title).font(.headline)
                                Text(dateString(e.start_time)).font(.caption).foregroundColor(GCColors.mutedText)
                            }
                        }
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) { Task { await unregister(eventId: e.id) } } label: {
                                Label("Unregister", systemImage: "trash")
                            }
                        }
                    }
                }
                Section(header: Text("Past")) {
                    ForEach(events.filter { !isUpcoming($0) }) { e in
                        NavigationLink(destination: EventDetailView(event: e)) {
                            VStack(alignment: .leading) {
                                Text(e.title).font(.headline)
                                Text(dateString(e.start_time)).font(.caption).foregroundColor(GCColors.mutedText)
                            }
                        }
                    }
                }
            }
            .navigationTitle("My Events")
        }
        .task { await load() }
    }

    func load() async {
        loading = true; error = nil
        do {
            let client = SupabaseClientProvider.shared
            let user = try await client.auth.session.user
            let regsResp = try await client.database
                .from("event_registrations")
                .select("event_id")
                .eq(column: "user_id", value: user.id)
                .order(column: "registered_at", ascending: false)
                .execute()
            struct Row: Decodable { let event_id: String }
            let rows = try regsResp.decoded([Row].self)
            let ids = rows.map { $0.event_id }
            guard !ids.isEmpty else { self.events = []; return }
            let evResp = try await client.database
                .from("events")
                .select()
                .in(column: "id", values: ids)
                .execute()
            let es = try evResp.decoded([Event].self)
            await MainActor.run { self.events = es }
        } catch {
            await MainActor.run { self.error = error.localizedDescription }
        }
        loading = false
    }

    func isoDate(_ s: String) -> Date { ISO8601DateFormatter().date(from: s) ?? Date() }
    func isUpcoming(_ e: Event) -> Bool { isoDate(e.start_time) > Date() }
    func dateString(_ s: String) -> String {
        DateFormatter.localizedString(from: isoDate(s), dateStyle: .medium, timeStyle: .short)
    }

    func unregister(eventId: String) async {
        do {
            var url = AppConfig.supabaseURL; url.appendPathComponent("rest/v1/rpc/unregister_from_event")
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
            if let token = try? await SupabaseClientProvider.shared.auth.session.accessToken { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
            let user = try await SupabaseClientProvider.shared.auth.session.user
            let body: [String: Any] = ["event_id_param": eventId, "user_id_param": user.id]
            req.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                let msg = String(data: data, encoding: .utf8) ?? ""
                throw NSError(domain: "unregister", code: (resp as? HTTPURLResponse)?.statusCode ?? -1, userInfo: [NSLocalizedDescriptionKey: msg])
            }
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

#Preview { MyRegistrationsView() }
