import SwiftUI

struct RootView: View {
    @ObservedObject var session = SessionStore.shared

    var body: some View {
        Group {
            if session.user == nil || session.isLoading {
                AuthView()
            } else {
                MainTabs()
            }
        }
        .onAppear { NotificationManager.shared.requestAuthorization() }
    }
}

struct MainTabs: View {
    @ObservedObject var session = SessionStore.shared
    var body: some View {
        TabView {
            EventsListView()
                .tabItem { Label("Events", systemImage: "calendar") }

            MyRegistrationsView()
                .tabItem { Label("My", systemImage: "checkmark.circle") }

            if session.isOrgAdmin {
                OrgHomeView()
                    .tabItem { Label("Org", systemImage: "building.2") }
            }

            if session.isSuperAdmin {
                AdminOverviewView()
                    .tabItem { Label("Admin", systemImage: "shield") }
            }

            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
        }
    }
}

struct AdminPlaceholder: View {
    var body: some View {
        VStack(spacing: GCSpacing.lg) {
            Text("Super Admin")
                .font(.title.bold())
            Text("Full native admin screens can be implemented here. Trials & Grants already exist on web and can be mirrored incrementally.")
                .multilineTextAlignment(.center)
                .foregroundColor(GCColors.mutedText)
                .padding(.horizontal, GCSpacing.xl)
        }
    }
}

#Preview {
    RootView()
}
