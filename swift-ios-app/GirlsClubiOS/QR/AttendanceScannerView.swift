import SwiftUI

struct AttendanceScannerView: View {
    @ObservedObject var delegate = QRScannerDelegate()
    @State private var toast: String?

    var body: some View {
        ZStack {
            QRScannerView(delegate: delegate)
                .ignoresSafeArea()
            VStack {
                HStack { Spacer(); GCBadge(text: "Scan QR", tint: GCColors.primary).padding() }
                Spacer()
            }
        }
        .gcToast(message: $toast)
        .onChange(of: delegate.scanned) { token in
            guard let t = token else { return }
            Task { await markAttendance(token: t) }
        }
    }

    func markAttendance(token: String) async {
        do {
            let client = SupabaseClientProvider.shared
            let user = try await client.auth.session.user
            var url = AppConfig.supabaseURL; url.appendPathComponent("rest/v1/rpc/mark_event_attendance")
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
            if let token = try? await client.auth.session.accessToken { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
            let body: [String: Any] = ["event_qr_token": token, "scanning_user_id": user.id]
            req.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                let msg = String(data: data, encoding: .utf8) ?? "Failed"
                throw NSError(domain: "attendance", code: (resp as? HTTPURLResponse)?.statusCode ?? -1, userInfo: [NSLocalizedDescriptionKey: msg])
            }
            await MainActor.run { toast = "Attendance recorded" }
        } catch {
            await MainActor.run { toast = error.localizedDescription }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { withAnimation { toast = nil } }
    }
}

#Preview { AttendanceScannerView() }

