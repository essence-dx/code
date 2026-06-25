"use client";

import { EditorWorkspaceClient } from "@/features/editor/components/editor-workspace-client";

export default function Home() {
  const activeFile = {
    id: "static-file",
    name: "Static Design",
    document: {
      version: 1,
      activePageId: "page-1",
      pages: [
        {
          id: "page-1",
          name: "Page 1",
          background: "#ffffff",
          layers: [],
          groups: [],
          guides: [],
          comments: [],
        },
      ],
      variables: {},
      components: {},
      updatedAt: new Date().toISOString(),
    },
    updatedAt: new Date(),
  };

  const editorUser = {
    name: "DX Designer",
    email: "local@dx.dev",
    image: null,
  };

  return (
    <EditorWorkspaceClient
      key={activeFile.id}
      fileId={activeFile.id}
      fileName={activeFile.name}
      files={[]}
      versions={[]}
      initialDocument={activeFile.document as any}
      user={{
        name: editorUser.name,
        email: editorUser.email,
        image: editorUser.image,
      }}
    />
  );
}
