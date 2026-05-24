import { Prisma } from 'generated/prisma/browser';

export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: {
    category: { select: { id: true; name: true; slug: true } };
  };
}>;
