// ShieldConfigurationExtension.swift
// App Extension — customizes the system-native "app blocked" screen.
// This is the screen a user sees when they try to open a blocked app during a session.
//
// Target type: Shield Configuration Extension
// Bundle ID: com.yourco.monkmode.shield
//
// The system shows this screen INSTEAD of launching the blocked app.
// We style it to match MonkMode's stark B&W aesthetic and add a
// motivational/friction-increasing message.

import ManagedSettings
import ManagedSettingsUI
import UIKit

class MonkModeShieldConfiguration: ShieldConfigurationDataSource {

  override func configuration(
    shielding application: Application
  ) -> ShieldConfiguration {
    // Minimal, deliberate, slightly cold intercept screen
    ShieldConfiguration(
      backgroundBlurStyle: .systemUltraThinMaterialDark,
      backgroundColor: UIColor(red: 0.04, green: 0.04, blue: 0.04, alpha: 1.0),
      icon: shieldIcon(),
      title: ShieldConfiguration.Label(
        text: "NOT NOW.",
        color: UIColor(white: 0.3, alpha: 1.0)
      ),
      subtitle: ShieldConfiguration.Label(
        text: application.localizedDisplayName ?? "This app",
        color: UIColor(white: 0.2, alpha: 1.0)
      ),
      primaryButtonLabel: ShieldConfiguration.Label(
        text: "Return to Focus",
        color: UIColor(white: 0.5, alpha: 1.0)
      ),
      primaryButtonBackgroundColor: UIColor(white: 0.08, alpha: 1.0),
      // Secondary button intentionally absent — no "ask for more time" escape hatch
      secondaryButtonLabel: nil
    )
  }

  override func configuration(
    shielding application: Application,
    in category: ActivityCategory
  ) -> ShieldConfiguration {
    // Same config for category-level blocks
    configuration(shielding: application)
  }

  private func shieldIcon() -> UIImage? {
    // Simple circle with an X — rendered programmatically to avoid asset deps
    let size = CGSize(width: 56, height: 56)
    UIGraphicsBeginImageContextWithOptions(size, false, 0)
    defer { UIGraphicsEndImageContext() }
    guard let ctx = UIGraphicsGetCurrentContext() else { return nil }

    ctx.setStrokeColor(UIColor(white: 0.25, alpha: 1.0).cgColor)
    ctx.setLineWidth(1.0)
    ctx.strokeEllipse(in: CGRect(x: 1, y: 1, width: 54, height: 54))

    let attrs: [NSAttributedString.Key: Any] = [
      .font: UIFont(name: "Courier", size: 20) ?? UIFont.systemFont(ofSize: 20),
      .foregroundColor: UIColor(white: 0.25, alpha: 1.0)
    ]
    let str = NSAttributedString(string: "×", attributes: attrs)
    let strSize = str.size()
    str.draw(at: CGPoint(x: (size.width - strSize.width) / 2, y: (size.height - strSize.height) / 2))

    return UIGraphicsGetImageFromCurrentImageContext()
  }
}
