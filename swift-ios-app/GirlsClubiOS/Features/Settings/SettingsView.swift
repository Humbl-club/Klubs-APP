import SwiftUI
import UIKit

struct SettingsView: View {
    @State private var remindersEnabled: Bool = NotificationPreferences.remindersEnabled
    @State private var leadMinutes: Int = NotificationPreferences.leadTimeMinutes
    @ObservedObject var session = SessionStore.shared
    @State private var toastMessage: String?
    @State private var showDeleteSheet = false
    @State private var deleteText = ""

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Notifications")) {
                    Toggle("Enable Event Reminders", isOn: $remindersEnabled)
                    Stepper("Lead Time: \(leadMinutes) minutes", value: $leadMinutes, in: 5...240, step: 5)
                    Button("Save Reminder Settings") { saveReminders() }
                }

                Section(header: Text("About")) {
                    HStack { Text("App"); Spacer(); Text(appName).foregroundStyle(.secondary) }
                    HStack { Text("Version"); Spacer(); Text(appVersion).foregroundStyle(.secondary) }
                    HStack { Text("Build"); Spacer(); Text(appBuild).foregroundStyle(.secondary) }
                    Button("Open Website") { openURL("https://girlsclub.app") }
                    Button("Privacy Policy") { openURL("https://girlsclub.app/privacy") }
                    Button("Scan Attendance QR") { openScanner() }
                    Button("Get Calendar Feed Link") { Task { await getCalendarFeedLink() } }
                    Button("Export My Data") { Task { await exportData() } }
                }

                Section(header: Text("Account")) {
                    Button(role: .destructive) { Task { await signOut() } } label: { Text("Sign Out") }
                    Button(role: .destructive) { showDeleteSheet = true } label: { Text("Delete Account") }
                }
            }
            .navigationTitle("Settings")
        }
        .sheet(isPresented: $showDeleteSheet) { deleteAccountSheet }
        .gcToast(message: $toastMessage)
    }

    @ViewBuilder
    private var deleteAccountSheet: some View {
        NavigationView {
            Form {
                Section(footer: Text("This will permanently delete your account and data. Type DELETE to confirm.").foregroundStyle(.secondary)) {
                    TextField("Type DELETE to confirm", text: $deleteText)
                        .textInputAutocapitalization(.characters)
                }
                Section {
                    Button("Confirm Deletion", role: .destructive) {
                        deleteAccount()
                    }.disabled(deleteText != "DELETE")
                }
            }
            .navigationTitle("Delete Account")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { showDeleteSheet = false } } }
        }
    }

    private var appName: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleName") as? String ?? "GirlsClub" }
    private var appVersion: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0" }
    private var appBuild: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1" }

    func openURL(_ s: String) { if let u = URL(string: s) { UIApplication.shared.open(u) } }

    func saveReminders() {
        NotificationPreferences.remindersEnabled = remindersEnabled
        NotificationPreferences.leadTimeMinutes = leadMinutes
        withAnimation { toastMessage = "Reminder settings saved" }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { withAnimation { toastMessage = nil } }
    }

    func deleteAccount() {
        Task {
            do {
                guard let token = try? await SupabaseClientProvider.shared.auth.session.accessToken else { return }
                _ = try await FunctionsClient.call(name: "delete-account", body: [:], accessToken: token)
                withAnimation { toastMessage = "Account deleted" }
                showDeleteSheet = false
                // Proactively sign out locally
                try await session.signOut()
            } catch {
                withAnimation { toastMessage = error.localizedDescription }
            }
        }
    }

    func exportData() async {
        do {
            guard let token = try? await SupabaseClientProvider.shared.auth.session.accessToken else { return }
            let data = try await FunctionsClient.call(name: "export-user-data", body: [:], accessToken: token)
            let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("girlsclub-export.json")
            try data.write(to: tmp)
            presentShareSheet(items: [tmp])
        } catch {
            withAnimation { toastMessage = "Export failed" }
        }
    }

    func presentShareSheet(items: [Any]) {
        let av = UIActivityViewController(activityItems: items, applicationActivities: nil)
        UIHelpers.present(av)
    }



    func getCalendarFeedLink() async {
        do {
            guard let token = try? await SupabaseClientProvider.shared.auth.session.accessToken else { return }
            let data = try await FunctionsClient.call(name: "create-calendar-feed-token", body: [:], accessToken: token)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any], let url = json["ics_url"] as? String, let u = URL(string: url) {
                presentShareSheet(items: [u])
            }
        } catch {
            withAnimation { toastMessage = "Failed to get ICS link" }
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { withAnimation { toastMessage = nil } }
        }
    }
    func openScanner() {
        let vc = UIHostingController(rootView: AttendanceScannerView())
        UIHelpers.present(vc)
    }

    func signOut() async {
        do { try await session.signOut() } catch { withAnimation { toastMessage = error.localizedDescription } }
    }
}

#Preview { SettingsView() }
