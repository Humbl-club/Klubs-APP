import Foundation
import UserNotifications

final class NotificationManager: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationManager()

    private override init() { super.init() }

    func requestAuthorization() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        center.requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
    }

    func scheduleEventReminder(eventId: String, title: String, start: Date, minutesBefore: Int = NotificationPreferences.leadTimeMinutes) {
        guard NotificationPreferences.remindersEnabled else { return }
        let content = UNMutableNotificationContent()
        content.title = "Upcoming Event"
        content.body = "\(title) starts soon"
        content.sound = .default
        content.userInfo = ["event_id": eventId]

        let fireDate = start.addingTimeInterval(TimeInterval(-minutesBefore * 60))
        if fireDate < Date() { return }

        let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: fireDate)
        let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
        let req = UNNotificationRequest(identifier: "event_\(eventId)_reminder", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(req) { _ in }
    }

    // Foreground presentation
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }
}

enum NotificationPreferences {
    private static let enabledKey = "GC_RemindersEnabled"
    private static let leadKey = "GC_ReminderLeadMinutes"

    static var remindersEnabled: Bool {
        get { UserDefaults.standard.object(forKey: enabledKey) as? Bool ?? true }
        set { UserDefaults.standard.set(newValue, forKey: enabledKey) }
    }

    static var leadTimeMinutes: Int {
        get { UserDefaults.standard.object(forKey: leadKey) as? Int ?? 30 }
        set { UserDefaults.standard.set(newValue, forKey: leadKey) }
    }
}

