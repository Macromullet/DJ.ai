# Code Signing

## Why Code Signing Matters

Code signing cryptographically verifies that your application:
1. **Comes from you** — the publisher is authenticated
2. **Hasn't been tampered with** — the binary is unmodified since signing

Without code signing:
- **Windows**: SmartScreen blocks the installer with "Windows protected your PC" warning
- **macOS**: Gatekeeper refuses to open the app ("cannot be opened because the developer cannot be verified")
- **Linux**: No OS-level signing enforcement, but package managers may verify signatures

## Platform-Specific Signing

### Windows: Authenticode

Windows uses Authenticode certificates (.pfx files) to sign executables:

```yaml
# In CI environment variables
CSC_LINK: base64-encoded .pfx certificate
CSC_KEY_PASSWORD: certificate password
```

electron-builder automatically signs when these environment variables are present.

### macOS: Code Signing + Notarization

macOS requires two steps:
1. **Code signing** — using an Apple Developer ID certificate
2. **Notarization** — Apple scans the app and issues a notarization ticket

```yaml
# In CI environment variables
APPLE_ID: developer@example.com
APPLE_APP_SPECIFIC_PASSWORD: app-specific-password
APPLE_TEAM_ID: XXXXXXXXXX
CSC_LINK: base64-encoded .p12 certificate
CSC_KEY_PASSWORD: certificate password
```

Notarization sends your app to Apple's servers for malware scanning. This takes 1-5 minutes and is required for macOS 10.15+ (Catalina and later).

### Linux: No Mandatory Signing

Linux doesn't enforce code signing at the OS level. However:
- Package repositories (apt, snap) may require GPG signing
- AppImage files can include embedded signatures
- Enterprise environments may have their own signing requirements

## The Signing Process

```
Unsigned App → Code Sign → Notarize (macOS) → Staple Ticket → Distribute
                  │              │                    │
           Certificate      Apple Servers     Embeds approval
           (local)          (remote scan)     in the binary
```

## Cost and Requirements

| Platform | Certificate Source | Cost | Validity |
|----------|-------------------|------|----------|
| Windows | DigiCert, Sectigo, etc. | $200-500/year | 1-3 years |
| macOS | Apple Developer Program | $99/year | 1 year |
| Linux | Self-signed / GPG | Free | Varies |

## Key Links

- [electron-builder Code Signing](https://www.electron.build/code-signing)
- [Apple Notarization](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Windows Authenticode](https://learn.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)

## Key Takeaways

- Code signing is **optional for development** but essential for production
- Windows and macOS **actively block** unsigned apps with scary warnings
- macOS requires both **signing and notarization** (Apple server verification)
- Store certificates as **CI secrets**, never in source code

## DJ.ai Connection

DJ.ai's CI configuration supports optional code signing via environment variables (`CSC_LINK`, `APPLE_ID`) in the release workflow. During development, builds are unsigned — the SmartScreen/Gatekeeper warnings are expected. For production release, the signing certificates would be stored as GitHub Actions secrets and automatically applied by electron-builder during the build. The release workflow (`.github/workflows/release-electron.yml`) is `workflow_dispatch` only, ensuring signing happens only for intentional releases.
