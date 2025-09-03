import SwiftUI

struct ReminderSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var enabled: Bool = NotificationPreferences.remindersEnabled
    @State private var minutes: Int = NotificationPreferences.leadTimeMinutes

    var body: some View {
        NavigationView {
            Form {
                Section(footer: Text("Event reminder notifications are scheduled locally on your device.")) {
                    Toggle("Enable Reminders", isOn: $enabled)
                    Stepper("Lead Time: \(minutes) minutes", value: $minutes, in: 5...240, step: 5)
                }
            }
            .navigationTitle("Reminders")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Save") { save() } }
            }
        }
    }

    private func save() {
        NotificationPreferences.remindersEnabled = enabled
        NotificationPreferences.leadTimeMinutes = minutes
        dismiss()
    }
}

#Preview { ReminderSettingsView() }

