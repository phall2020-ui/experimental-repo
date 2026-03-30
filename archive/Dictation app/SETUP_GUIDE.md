# VoiceToNotion - Setup & Running Guide

## Prerequisites

You need **full Xcode** installed (not just Command Line Tools). The generated Swift project requires Xcode's IDE and simulator/device deployment tools.

### Check Your Current Installation

```bash
xcode-select -p
# If output is: /Library/Developer/CommandLineTools
# → You only have CLI tools, need to install full Xcode
```

## Installation Steps

### 1. Install Full Xcode

**Option A: From App Store (Easiest)**
```bash
# Open App Store, search for "Xcode", click Install
# This will be ~15GB, takes 30+ minutes depending on connection
```

**Option B: From Apple Developer Website**
- Visit [developer.apple.com/download](https://developer.apple.com/download)
- Sign in with your Apple ID
- Download Xcode `.xip` file
- Double-click to extract and install

**Verify Installation**
```bash
xcode-select -p
# Should output: /Applications/Xcode.app/Contents/Developer
```

### 2. Select Xcode Command Line Tools

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

---

## Opening the Project

### Quick Start
```bash
open "/Users/peterhall/Documents/GitHub/Dictation app/VoiceToNotion/VoiceToNotion.xcodeproj"
```

This opens the project in Xcode. Wait for indexing to complete (watch the top status bar).

---

## First-Time Setup in Xcode

### 1. Select Development Team

When you first open the project, Xcode will ask for a development team:

1. **In the Project Navigator** (left sidebar), select the blue "VoiceToNotion" project icon
2. **Select the "VoiceToNotion" target** (not the project)
3. **Go to "Signing & Capabilities"** tab
4. In the **"Team"** dropdown, select your Apple ID or "Add an Account..."
   - If you don't have an Apple Developer account, you can create a free one
   - Free accounts can deploy to simulator and personal devices

### 2. Update Bundle Identifier (Optional but Recommended)

The default bundle ID is `com.example.VoiceToNotion`. You can make it unique:

1. Still in "Signing & Capabilities"
2. Change **"Bundle Identifier"** to something like `com.yourname.VoiceToNotion`
3. This prevents conflicts if you have multiple test apps

---

## Running the App

### On iOS Simulator (Easiest for Testing)

1. **Select a Simulator** at the top of Xcode:
   - Click the device selector (currently shows "VoiceToNotion")
   - Choose a simulator like "iPhone 16 Pro" or "iPhone 15 Pro"

2. **Build & Run**:
   - Press `Cmd + R` or click the **▶ Play** button
   - Xcode will build the app and launch it in the simulator
   - First build takes 1-2 minutes, subsequent builds are faster

3. **Using the Simulator App**:
   - Tap the microphone button to start/stop recording
   - The simulator captures audio from your Mac's microphone
   - Tap the gear icon (⚙) to go to Settings
   - Enter your Notion API key and database ID
   - Tap "Save Credentials"
   - Record a test voice note

### On Physical iPhone

You need:
- Your iPhone connected via USB or wireless
- An Apple ID associated with the device
- The device added to your Xcode account

Steps:
1. **Connect your iPhone** to your Mac via USB
2. **Trust the computer** when prompted on your phone
3. **In Xcode**, select your device from the device selector
4. **Press `Cmd + R`** to build and deploy
5. When prompted, **unlock your phone** to allow Xcode to install the app
6. The app will install and launch on your device

---

## Configuring Notion Credentials

Once the app is running (simulator or device):

1. **Tap the gear icon (⚙)** in the top-right corner
2. **Enter your API Key**:
   - Go to [notion.so/my-integrations](https://notion.so/my-integrations)
   - Create a new integration
   - Copy the "Internal Integration Secret" (starts with `ntn_`)
   - Paste it in the "API Key" field

3. **Enter your Database ID**:
   - Option A: Just paste your full Notion URL (e.g., `https://notion.so/2d21...?v=abc...`)
   - Option B: Extract the ID part: the 32-character string after `notion.so/`
   - The app will auto-parse the URL

4. **Tap "Save Credentials"**
   - You should see a green ✅ checkmark
   - Credentials are saved securely in the device's Keychain

---

## Testing the App Features

### Voice Recording
1. **Tap the large blue microphone button** to start recording
2. **Speak clearly** (e.g., "This is a test note about meeting tomorrow at 3pm")
3. **Tap the red STOP button** to finish
4. The app will:
   - Extract transcript from your speech
   - Auto-tag it (e.g., "Meeting", "Future Task")
   - Generate a summary if the text is long enough
   - Send it to Notion or queue it offline

### Offline Support
- **Disconnect from WiFi/Cellular** before recording
- The note will show "Queued for sync ✅"
- **Reconnect to network** and the app will automatically sync
- Watch the "X pending" badge disappear as notes sync

### Action Button (iPhone 15 Pro+ Only)
- **Hold the Action Button** on your device
- Select "Start voice note in VoiceToNotion" from Siri
- The app will launch and start recording automatically

---

## Troubleshooting

### "Signing for VoiceToNotion requires a development team"
**Solution**: You skipped the "Select Development Team" step above. Do that now.

### Simulator won't start
```bash
# Reset the simulator
xcrun simctl erase all

# Then try building again with Cmd+R
```

### Microphone not working in simulator
- **For simulator**, Xcode uses your Mac's microphone
- Check System Preferences → Security & Privacy → Microphone
- Grant Xcode access

### "No speech recognition authorization"
- On simulator: **Settings app → Privacy → Speech Recognition → VoiceToNotion → Allow**
- On device: Device Settings → Privacy → Speech Recognition → VoiceToNotion → Allow

### App crashes on launch
1. **Build → Clean Build Folder** (`Shift + Cmd + K`)
2. **Delete Derived Data**:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData/VoiceToNotion*
   ```
3. **Build again** with `Cmd + R`

### Notion save fails with "Check token, data source id"
- Verify your API key starts with `ntn_`
- Verify you shared the database with your integration:
  - In Notion, open the database
  - Click "..." → "Share" → Add your integration
- Check that the database URL format is correct

---

## Project Structure

```
VoiceToNotion/
├── VoiceToNotionApp.swift          # App entry point
├── ContentView.swift                # Main recording UI
├── SettingsView.swift               # Notion credential config
├── NotionClient.swift               # Notion API integration
├── NetworkMonitor.swift             # Connectivity detection
├── OfflineQueue.swift               # Persistent offline queue
├── AutoTagger.swift                 # Automatic tag extraction
├── IntelligenceSummarizer.swift    # Text summarization
├── ActionButtonHandler.swift        # Action Button shortcuts
├── Info.plist                       # App permissions & config
└── Assets.xcassets/                 # App icons
```

---

## Key Features

✅ **Background Recording** - Records when screen is locked
✅ **Offline Support** - Notes queue when offline, auto-sync when connected
✅ **Auto-Tagging** - Keyword detection + AI-powered tags (iOS 18.1+)
✅ **Smart Summarization** - Longer notes auto-summarized
✅ **Action Button** - iPhone 15 Pro+ native shortcut integration
✅ **Secure Storage** - Credentials stored in device Keychain
✅ **Full Notion Integration** - Creates rich pages with transcript, tags, and summary

---

## Next Steps

1. ✅ Install full Xcode
2. ✅ Open the project
3. ✅ Select your development team
4. ✅ Run on simulator (`Cmd + R`)
5. ✅ Configure Notion credentials in Settings
6. ✅ Test recording a voice note
7. ✅ Check your Notion database for the saved note!

---

## Questions?

For issues with:
- **Xcode setup**: Apple's [official guide](https://developer.apple.com/download/)
- **Notion API**: [Notion API docs](https://developers.notion.com/)
- **App bugs**: Check console output in Xcode's Debug area (bottom panel)
