import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
import { ProductTabs } from "@/components/product/ProductTabs";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      samples: true,
      campaigns: {
        include: { campaign: true },
      },
      events: {
        include: { event: true },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const allCampaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <ProductTabs
      product={product}
      allCampaigns={allCampaigns}
      activeTab={searchParams.tab ?? "techpack"}
    />
  );
}
