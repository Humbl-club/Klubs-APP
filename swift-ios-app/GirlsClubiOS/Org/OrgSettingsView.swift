import SwiftUI

struct OrgSettingsView: View {
    var body: some View {
        ScrollView {
            VStack(spacing: GCSpacing.lg) {
                Text("Organization Settings")
                    .font(.system(size: 28, weight: .bold))
                    .padding(.top, GCSpacing.xl)
                    .padding(.horizontal, GCSpacing.xl)

                GCCard {
                    VStack(alignment: .leading, spacing: GCSpacing.md) {
                        Text("Settings placeholder")
                            .font(.headline)
                        Text("Manage organization details here. This is a stub view to complete the Org tab; extend with fields as needed.")
                            .font(.caption)
                            .foregroundColor(GCColors.mutedText)
                    }
                }
                .padding(.horizontal, GCSpacing.xl)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    OrgSettingsView()
}

