# Cordova File & Photo PoC

Proof of concept app demonstrating usage of camera and files via Cordova.


## Requirements & Setup

### 1. Common
1. Install Node.js
2. Open a command prompt
 -`npm install -g cordova` This makes cordova available via command prompt
 - Navigate to the `FileAndPhotoPrototype` directory
 - `cordova plugin add cordova-plugin-file` Add the file plugin
 - `cordova plugin add cordova-plugin-camera` Add the camera plugin
 - `cordova plugin add cordova-plugin-console` Add the console plugin. This allows `console.log` messages to show up in the Xcode debug console

### 2-a. Android
1. Install the Android SDK
2. Setup Android tools via Android SDK Manager
 - Windows Location: `SDK Manager.exe` in the SDK install directory
 - OSX in Terminal: 
    - `cd ~/Library/Android/sdk/tools`
    - `./android sdk`
 - Install HAXM under the Extras header so emulation isn't terrible.
 - Ensure you have the following:
    - Android SDK Tools (Latest)
    - Android SDK Platform Tools (Latest)
    - Android SDK Build-tools (Latest 23.x.x version)
    - The following under Android 6.0 (API 23):
  	  - SDK Platform
   	  - Intel x86 Atom System Image
3. Use AVD Manager to create an android virtual device to use for emulation
 - Windows Location: `AVD Manager.exe` in the SDK install directory
 - OSX in Terminal:
    - `cd ~/Library/Android/sdk/tools`
    - `./android avd`
 - Use API Level 23 for Target, Intel Atom for CPU/ABI, No Skin for Skin, and Emulated for Back Camera
 - Enable Use Host GPU if possible as it greatly increases framerate
4. `cordova platform add android`
5. To run the app: `cordova run android`

### 2-i. iOS (OSX Only)
1. Install Xcode
2. Open a terminal window and run this command `xcode-select --install`
3. `npm install -g ios-sim`
4. `sudo npm install -g ios-deploy`
5. `cordova platform add ios`
6. `cordova build ios`
7. Open Xcode
8. Open the .xcodeproj found under FileAndPhotoPrototype/platforms/ios
 - You'll need to resolve the code signing issues before you can run this on a real device. Luckily this is now free

#### iOS Commands
- `cordova run ios --device`
- `cordova run ios --list ` Allows you to see all available deploy targets
- `cordova run ios --target="target_name"` Deploy to a specific target
- `cordova emulate ios`


## Camera Quirks
- Look into error messages given for denied permission. We will likely want to present a useful error message

### iOS
- destinationType.FILE_URI saves to temp directory which is emptied on app exit
- destinationType.NATIVE_URI with sourceType.CAMERA always saves file to photo album
- alert() inside either callback can cause problems. Surround with 0 timeout

### Android
- allowEdit is unpredictable and should not be used due to it using any image cropping application
- encodingType is ignored if the image is unedited
- Camera is always JPEG
- PHOTOLIBRARY and SAVEDPHOTOALBUM return the selected file in its existing encoding

## New Project From Scratch

### Using Eclipse
- Install THyM in Eclipse - http://download.eclipse.org/thym/releases/latest/
- File -> New -> Project
 - Mobile -> Hybrid Mobile (Cordova)...
 - Name your application
 - Add the desired plugins

### Using cordova CLI
- To be documented

## Debugging

### Android
To view JavaScript console messages, use a LogCat filter for the log tag `chromium`

### iOS
To view JavaScript console messages, run the app via Xcode and open up the debug console