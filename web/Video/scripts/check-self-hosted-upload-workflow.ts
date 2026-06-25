import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const uploadAdapter = read("src/lib/media/self-hosted-upload.ts");
const uploadProviderPresets = read("src/lib/media/self-hosted-upload-provider-presets.ts");
const uploadProfiles = read("src/lib/media/self-hosted-upload-profiles.ts");
const uploadProfileReadiness = read("src/lib/media/self-hosted-upload-profile-readiness.ts");
const uploadHistory = read("src/lib/media/self-hosted-upload-history.ts");
const mediaAdapter = read("src/lib/media/self-hosted-media.ts");
const uploadDialog = read("src/features/editor/components/self-hosted-media-upload-dialog.tsx");
const uploadHistoryList = read("src/features/editor/components/self-hosted-upload-history-list.tsx");
const uploadProfileReadinessHistory = read("src/features/editor/components/self-hosted-upload-profile-readiness-history.tsx");
const uploadProfileReadinessPanel = read("src/features/editor/components/self-hosted-upload-profile-readiness-panel.tsx");
const mediaBin = read("src/features/editor/components/media-bin.tsx");
const mediaCard = read("src/features/editor/components/media-asset-card.tsx");
const packageJson = read("package.json");
const capabilities = read("src/lib/product/capabilities/platform.ts");

assert(uploadAdapter.includes("uploadMediaAssetToSelfHostedStorage"), "Upload adapter must expose a media upload command.");
assert(uploadAdapter.includes("method: \"PUT\""), "Upload adapter must use signed PUT upload URLs.");
assert(uploadAdapter.includes("credentials: \"omit\""), "Upload adapter must not send app credentials to user storage.");
assert(uploadAdapter.includes("mode: \"cors\""), "Upload adapter must require browser-safe CORS upload targets.");
assert(uploadAdapter.includes("publicUrl"), "Upload adapter must store a public media URL, not the signed upload URL.");
assert(uploadAdapter.includes('source: "self-hosted-url"'), "Uploaded assets must become self-hosted media assets.");
assert(uploadAdapter.includes("loadBrowserMediaBlob"), "Upload adapter must read browser-stored media.");
assert(uploadAdapter.includes("loadTauriMediaBlob"), "Upload adapter must read desktop-stored media.");
assert(uploadAdapter.includes("loadSelfHostedMediaBlob"), "Upload adapter must support re-uploading linked media.");
assert(uploadProviderPresets.includes("selfHostedUploadProviderPresets"), "Upload provider presets must be available.");
assert(uploadProviderPresets.includes("cloudflare-r2"), "Upload provider presets must include Cloudflare R2.");
assert(uploadProviderPresets.includes("supabase-storage"), "Upload provider presets must include Supabase Storage.");
assert(uploadProviderPresets.includes("s3-compatible"), "Upload provider presets must include S3-compatible storage.");
assert(uploadProviderPresets.includes("normalizeSelfHostedUploadProviderId"), "Upload provider preset ids must be normalized.");
assert(uploadProfiles.includes("loadSelfHostedUploadProfiles"), "Upload profiles must be loadable from local storage.");
assert(uploadProfiles.includes("saveSelfHostedUploadProfile"), "Upload profiles must be saved for repeat storage origins.");
assert(uploadProfiles.includes("providerId"), "Upload profiles must remember their provider preset.");
assert(uploadProfiles.includes("createSelfHostedPublicUrl"), "Upload profiles must generate public media URLs.");
assert(uploadProfiles.includes("removeSelfHostedUploadProfile"), "Upload profiles must be removable.");
assert(uploadProfiles.includes("maxProfileCount"), "Upload profile storage must stay bounded.");
assert(uploadProfileReadiness.includes("checkSelfHostedUploadProfileReadiness"), "Upload profiles must expose readiness checks.");
assert(uploadProfileReadiness.includes("method: \"HEAD\""), "Upload profile readiness must use a browser HEAD probe.");
assert(uploadProfileReadiness.includes("mode: \"cors\""), "Upload profile readiness must test CORS access.");
assert(uploadProfileReadiness.includes("createSelfHostedPublicUrl"), "Upload profile readiness must verify derived public URLs.");
assert(uploadProfileReadiness.includes("loadSelfHostedUploadProfileReadinessHistory"), "Upload profile readiness history must be loadable.");
assert(uploadProfileReadiness.includes("saveSelfHostedUploadProfileReadinessReport"), "Upload profile readiness reports must be saved.");
assert(uploadProfileReadiness.includes("maxReadinessHistoryEntries"), "Upload profile readiness history must stay bounded.");
assert(uploadProfileReadiness.includes("createSelfHostedUploadProfileReadinessEvidencePacket"), "Upload profile readiness history must export evidence packets.");
assert(uploadProfileReadiness.includes("downloadSelfHostedUploadProfileReadinessEvidence"), "Upload profile readiness history must download evidence packets.");
assert(uploadProfileReadiness.includes("importSelfHostedUploadProfileReadinessEvidenceFile"), "Upload profile readiness history must import evidence files.");
assert(uploadProfileReadiness.includes("importSelfHostedUploadProfileReadinessEvidencePacket"), "Upload profile readiness history must restore evidence packets.");
assert(uploadHistory.includes("verifySelfHostedUploadPublicUrl"), "Upload history must verify public media URLs after upload.");
assert(uploadHistory.includes("saveSelfHostedUploadHistoryEntry"), "Upload history must persist bounded verification entries.");
assert(uploadHistory.includes("createSelfHostedUploadEvidencePacket"), "Upload history must export evidence packets.");
assert(uploadHistory.includes("downloadSelfHostedUploadEvidence"), "Upload history must download evidence packets.");
assert(uploadHistory.includes("importSelfHostedUploadEvidenceFile"), "Upload history must import evidence files.");
assert(uploadHistory.includes("importSelfHostedUploadEvidencePacket"), "Upload history must restore evidence packets.");
assert(uploadHistory.includes("maxHistoryEntries"), "Upload verification history must stay bounded.");
assert(mediaAdapter.includes("export function normalizeSelfHostedMediaUrl"), "URL validation must be shared by import and upload workflows.");
assert(uploadDialog.includes("SelfHostedMediaUploadDialog"), "Upload dialog must be implemented.");
assert(uploadDialog.includes("Signed upload URL"), "Upload dialog must collect a signed upload URL.");
assert(uploadDialog.includes("Public media URL"), "Upload dialog must collect the reusable public media URL.");
assert(uploadDialog.includes("Storage profile"), "Upload dialog must expose reusable storage profiles.");
assert(uploadDialog.includes("Save profile"), "Upload dialog must save reusable storage profiles.");
assert(uploadDialog.includes("Public folder URL"), "Upload dialog must collect the reusable public folder URL.");
assert(uploadDialog.includes("Provider preset"), "Upload dialog must expose provider presets.");
assert(uploadDialog.includes("selfHostedUploadProviderPresets"), "Upload dialog must render upload provider presets.");
assert(uploadDialog.includes("selectedProvider.uploadUrlPlaceholder"), "Upload dialog must apply provider upload URL hints.");
assert(uploadDialog.includes("checkSelfHostedUploadProfileReadiness"), "Upload dialog must run profile readiness checks.");
assert(uploadDialog.includes("Check profile"), "Upload dialog must expose a profile readiness action.");
assert(uploadDialog.includes("SelfHostedUploadProfileReadinessPanel"), "Upload dialog must show profile readiness results.");
assert(uploadDialog.includes("saveSelfHostedUploadProfileReadinessReport"), "Upload dialog must save profile readiness history.");
assert(uploadDialog.includes("SelfHostedUploadProfileReadinessHistory"), "Upload dialog must show recent profile readiness history.");
assert(uploadDialog.includes("onHistoryChange"), "Upload dialog must refresh profile readiness history after evidence imports.");
assert(uploadDialog.includes("createSelfHostedPublicUrl"), "Upload dialog must derive public URLs from selected profiles.");
assert(uploadDialog.includes("removeSelfHostedUploadProfile"), "Upload dialog must let users remove stale upload profiles.");
assert(uploadDialog.includes("SelfHostedUploadHistoryList"), "Upload dialog must show recent upload verification history.");
assert(uploadDialog.includes("onEntriesChange"), "Upload dialog must refresh upload history after evidence imports.");
assert(uploadHistoryList.includes("Recent upload checks"), "Upload history list must expose recent verification outcomes.");
assert(uploadHistoryList.includes("downloadSelfHostedUploadEvidence"), "Upload history list must expose evidence downloads.");
assert(uploadHistoryList.includes("importSelfHostedUploadEvidenceFile"), "Upload history list must expose evidence imports.");
assert(uploadProfileReadinessPanel.includes("Profile readiness"), "Upload profile readiness panel must show profile readiness results.");
assert(uploadProfileReadinessPanel.includes("readinessBadgeVariant"), "Upload profile readiness panel must label readiness states.");
assert(uploadProfileReadinessHistory.includes("Recent profile checks"), "Upload profile readiness history must show saved profile checks.");
assert(uploadProfileReadinessHistory.includes("activeProfileId"), "Upload profile readiness history must prioritize the selected profile.");
assert(uploadProfileReadinessHistory.includes("downloadSelfHostedUploadProfileReadinessEvidence"), "Upload profile readiness history must expose evidence downloads.");
assert(uploadProfileReadinessHistory.includes("importSelfHostedUploadProfileReadinessEvidenceFile"), "Upload profile readiness history must expose evidence imports.");
assert(mediaBin.includes("SelfHostedMediaUploadDialog"), "Media bin must render the upload dialog.");
assert(mediaBin.includes("uploadMediaAssetToSelfHostedStorage"), "Media bin must wire upload behavior.");
assert(mediaBin.includes("verifySelfHostedUploadPublicUrl"), "Media bin must check the public URL after uploads.");
assert(mediaBin.includes("saveSelfHostedUploadHistoryEntry"), "Media bin must save upload verification history.");
assert(mediaBin.includes("onUploadToStorage"), "Media bin must pass upload actions to media cards.");
assert(mediaCard.includes("CloudUpload"), "Media cards must expose a storage upload control.");
assert(packageJson.includes("check:self-hosted-upload-workflow"), "Package scripts must expose the upload workflow check.");
assert(capabilities.includes("signed upload handoff"), "Cloud media capability must mention the upload handoff evidence.");

console.log("Self-hosted upload workflow checks passed.");
