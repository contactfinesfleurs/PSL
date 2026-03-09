import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
import { ProductTabs } from "@/components/product/ProductTabs";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

  // Base product query (always works)
  const baseProduct = await prisma.product.findUnique({
    where: { id },
    include: {
      samples: true,
      campaigns: { include: { campaign: true } },
      events: { include: { event: true } },
    },
  });

  if (!baseProduct) {
    notFound();
  }

  // Optional tables — may not exist if DB migration hasn't run yet
  const loans = await prisma.sampleLoan
    .findMany({ where: { productId: id }, orderBy: { sentAt: "desc" } })
    .catch(() => []);

  const placements = await prisma.mediaPlacement
    .findMany({ where: { productId: id }, orderBy: { publishedAt: "desc" } })
    .catch(() => []);

  const allCampaigns = await prisma.campaign
    .findMany({ orderBy: { createdAt: "desc" } })
    .catch(() => []);

  const product = { ...baseProduct, loans, placements };

  return (
    <ProductTabs
      product={product}
      allCampaigns={allCampaigns}
      activeTab={tab ?? "techpack"}
    />
  );
}
