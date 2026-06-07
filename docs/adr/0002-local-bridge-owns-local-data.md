# Local Bridge owns local data

The local bridge will own the local data store, and the web app will read and write through the bridge API. This keeps profile switching, macro dispatch, device sync, and background behavior available even when the browser UI is closed, while still allowing the web app to remain the primary user interface.
