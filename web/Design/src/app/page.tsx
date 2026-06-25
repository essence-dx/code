import { EditorWorkspace } from "@/features/editor/components/editor-workspace";
import { createEmbeddedEditorProject } from "@/features/editor/embedded-project";

export default function Home() {
  const project = createEmbeddedEditorProject();

  return (
    <EditorWorkspace
      project={project}
      assets={[]}
      brandColors={[]}
      brandFonts={[]}
      brandLogos={[]}
      versions={[]}
      comments={[]}
      presence={[]}
      canManageSharing={false}
      canRestoreVersions={false}
      embedded
    />
  );
}
