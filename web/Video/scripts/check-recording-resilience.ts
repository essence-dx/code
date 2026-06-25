import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const recordingControls = readFileSync(new URL("../src/features/editor/components/recording-controls.tsx", import.meta.url), "utf8");

assert.match(recordingControls, /Recording is not available in this browser\./);
assert.match(recordingControls, /recorder\.onstop = \(\) => \{/);
assert.match(recordingControls, /const recordingStream = capture\.stream/);
assert.match(recordingControls, /void finishRecording\(nextMode, recorder\)/);
assert.match(recordingControls, /Recording did not capture media\./);
assert.match(recordingControls, /Recording could not be saved\. Try again\./);
assert.match(recordingControls, /Screen recording permission was not granted\./);
assert.match(recordingControls, /Camera permission was not granted\./);
assert.match(recordingControls, /Screen and camera recording permission was not granted\./);
assert.match(recordingControls, /Microphone permission was not granted\./);
assert.match(recordingControls, /No camera or microphone is available\./);
assert.match(recordingControls, /No screen source, camera, or microphone is available\./);
assert.match(recordingControls, /No microphone is available\./);
assert.match(recordingControls, /createRecordingCapture\(nextMode, timelinePreset\)/);
assert.match(recordingControls, /audio\/webm;codecs=opus/);
assert.match(recordingControls, /onRecorded\(await saveBrowserMedia\(file\), nextMode, \{/);
assert.match(recordingControls, /const \[countdownSeconds, setCountdownSeconds\] = useState\(0\)/);
assert.match(recordingControls, /recordingTimelinePresets\.map/);
assert.match(recordingControls, /const \[timelinePreset, setTimelinePreset\]/);
assert.match(recordingControls, /runCountdown\(\s*countdownSeconds,\s*setCountdownRemaining/);
assert.match(recordingControls, /function cancelCountdown\(\)/);
assert.match(recordingControls, /Recording countdown canceled\./);
assert.match(recordingControls, /Teleprompter notes/);
assert.match(recordingControls, /function pauseRecording\(\)/);
assert.match(recordingControls, /function resumeRecording\(\)/);
assert.match(recordingControls, /function discardRecording\(\)/);
assert.match(recordingControls, /Recording discarded\./);
assert.match(recordingControls, /Retake/);
assert.match(recordingControls, /startRecording\("screen-camera"\)/);
assert.doesNotMatch(recordingControls, /recordingError instanceof Error \? recordingError\.message/);

const mediaBin = readFileSync(new URL("../src/features/editor/components/media-bin.tsx", import.meta.url), "utf8");
assert.match(mediaBin, /function addRecordedMedia/);
assert.match(mediaBin, /recordingLayerOptions\(\{/);
assert.match(mediaBin, /ensureRecordedTakesCollection\(asset\.id\)/);
assert.match(mediaBin, /function promoteRecordedTake/);
assert.match(mediaBin, /RecordingTakeReview/);
assert.match(mediaBin, /Promoted from take review\./);
assert.match(mediaBin, /Recorded takes/);
assert.match(mediaBin, /start: currentTime/);
assert.match(mediaBin, /Recording added to the timeline\./);

const recordingLayouts = readFileSync(new URL("../src/lib/editor/recording-layouts.ts", import.meta.url), "utf8");
assert.match(recordingLayouts, /picture-in-picture/);
assert.match(recordingLayouts, /split-left/);
assert.match(recordingLayouts, /split-right/);
assert.match(recordingLayouts, /recordingLayerOptions/);

const recordingCapture = readFileSync(new URL("../src/lib/media/recording-capture.ts", import.meta.url), "utf8");
assert.match(recordingCapture, /createScreenCameraCapture/);
assert.match(recordingCapture, /createCompositeCapture/);
assert.match(recordingCapture, /canvas\.captureStream/);
assert.match(recordingCapture, /attachMixedAudio/);
assert.match(recordingCapture, /drawStudioFrame/);
assert.match(recordingCapture, /function stopStream\(stream: MediaStream \| null\)/);

const takeReview = readFileSync(new URL("../src/features/editor/components/recording-take-review.tsx", import.meta.url), "utf8");
assert.match(takeReview, /export function RecordingTakeReview/);
assert.match(takeReview, /TakeSelect/);
assert.match(takeReview, /TakePreview/);
assert.match(takeReview, /Best A/);
assert.match(takeReview, /Best B/);
assert.match(takeReview, /onPromoteTake/);
assert.match(takeReview, /formatTime/);
assert.match(takeReview, /<video/);
assert.match(takeReview, /<audio/);

console.log("Recording resilience checks passed.");
