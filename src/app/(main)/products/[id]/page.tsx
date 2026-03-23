import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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

  const session = await getSession();
  const profileId = session?.profileId ?? "";

  // Core query — always works (samples, campaigns, events tables always exist)
  const [baseProduct, allCampaigns] = await Promise.all([
    prisma.product.findUnique({
      where: { id, profileId },
      include: {
        samples: true,
        campaigns: { include: { campaign: true } },
        events: { include: { event: true } },
      },
    }),
    prisma.campaign.findMany({ where: { profileId }, orderBy: { createdAt: "desc" } }),
  ]);

  if (!baseProduct) {
    notFound();
  }

  const [loans, placements] = await Promise.all([
    prisma.sampleLoan.findMany({
      where: { productId: id },
      orderBy: { sentAt: "desc" },
    }),
    prisma.mediaPlacement.findMany({
      where: { productId: id },
      orderBy: { publishedAt: "desc" },
    }),
  ]);

  const product = { ...baseProduct, loans, placements };

  return (
    <ProductTabs
      product={product}
      allCampaigns={allCampaigns}
      activeTab={tab ?? "techpack"}
    />
  );
}
