"use client";

import { Html } from "@react-three/drei";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectCommentStore } from "../comment-store";

export function CommentPins() {
  const comments = useProjectCommentStore((state) => state.comments);
  const selectedCommentId = useProjectCommentStore((state) => state.selectedCommentId);
  const selectComment = useProjectCommentStore((state) => state.selectComment);
  const openComments = comments.filter((comment) => !comment.resolvedAt);

  return (
    <>
      {openComments.map((comment) => {
        const selected = selectedCommentId === comment.id;

        return (
          <group key={comment.id} position={comment.position}>
            <mesh>
              <sphereGeometry args={[selected ? 0.1 : 0.075, 20, 12]} />
              <meshBasicMaterial color={selected ? "#ffffff" : "#a1a1aa"} toneMapped={false} />
            </mesh>
            <Html center distanceFactor={10}>
              <Button
                className="size-7 rounded-full shadow-md"
                size="icon"
                type="button"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  selectComment(selected ? null : comment.id);
                }}
              >
                <MessageSquare className="size-3.5" />
              </Button>
            </Html>
          </group>
        );
      })}
    </>
  );
}
