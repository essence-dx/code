import { ExportReviewPageClient } from "@/features/review/components/export-review-page-client";

export default async function ExportReviewPage({ params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await params;
  return <ExportReviewPageClient reviewId={reviewId} />;
}
