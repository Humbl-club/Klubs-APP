import SwiftUI

struct OrgHomeView: View {
    @State private var tab = 0
    var body: some View {
        VStack(spacing: 0) {
            Picker("", selection: $tab) {
                Text("Connect").tag(0)
                Text("Settings").tag(1)
                Text("Switch").tag(2)
            }
            .pickerStyle(.segmented)
            .padding()

            if tab == 0 { ConnectPanel() }
            else if tab == 1 { OrgSettingsView() }
            else { OrgSwitcherView() }
        }
    }
}
