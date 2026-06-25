import { strict as assert } from "node:assert";
import { sceneDocumentSchema } from "@/features/editor/types";
import { createProjectTemplatePayload, projectTemplateOptions } from "@/features/projects/project-templates";

assert.ok(projectTemplateOptions.length >= 4, "advanced project templates should include several production starters");

const productTemplate = createProjectTemplatePayload({
  name: "Launch scene",
  templateId: "product-launch-review",
});
const productScene = sceneDocumentSchema.parse(productTemplate.sceneData);

assert.equal(productScene.name, "Launch scene");
assert.ok(productScene.objects.length > 5, "template should add starter objects beyond the default scene");
assert.equal(productTemplate.shareSettings.allowCodeExport, true);
assert.equal(productTemplate.shareSettings.allowViewerDownload, true);
assert.equal(productTemplate.shareSettings.reviewWorkflow.publicLink.status, "requested");
assert.equal(productTemplate.template.workspaceDefaults.folderName, "Launch Reviews");

const embedTemplate = createProjectTemplatePayload({
  templateId: "interface-embed",
});

assert.equal(embedTemplate.shareSettings.embedLayout, "responsive");
assert.equal(embedTemplate.shareSettings.allowPublicApi, false);
assert.equal(embedTemplate.shareSettings.allowViewerDownload, false);
assert.equal(embedTemplate.shareSettings.reviewWorkflow.embed.status, "requested");

const internalTemplate = createProjectTemplatePayload({
  templateId: "asset-qa-board",
});

assert.equal(internalTemplate.shareSettings.allowEmbed, false);
assert.equal(internalTemplate.shareSettings.allowView, true);
assert.equal(internalTemplate.shareSettings.reviewWorkflow.publicLink.status, "draft");

console.log("project templates smoke passed");
