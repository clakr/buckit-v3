import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { getDB } from "#/db";
import { authMiddleware } from "#/lib/middlewares";

export const getDebts = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDB(env.db);

    return db.query.debts.findMany({
      where: {
        userId: context.user.id,
      },
    });
  });

// export const getBucket = createServerFn({
//   method: "GET",
// })
//   .middleware([verifyUserBucketMiddleware])
//   .handler(async ({ data }) => {
//     const db = getDB(env.db);
//
//     const bucket = await db.query.buckets.findFirst({
//       where: {
//         id: data.bucketId,
//       },
//       with: {
//         allocations: {
//           with: {
//             bankAccount: {
//               columns: {
//                 name: true,
//                 currency: true,
//               },
//             },
//           },
//         },
//       },
//     });
//
//     return bucket ?? null;
//   });
//
// export const validateBucketName = createServerFn({
//   method: "GET",
// })
//   .middleware([authMiddleware])
//   .validator(z.string().trim())
//   .handler(async ({ context, data }) => {
//     const db = getDB(env.db);
//
//     const result = await db
//       .select({
//         id: buckets.id,
//         name: buckets.name,
//       })
//       .from(buckets)
//       .where(
//         and(
//           eq(buckets.userId, context.session.userId),
//           eq(lower(buckets.name), data.toLowerCase()),
//         ),
//       )
//       .limit(1);
//
//     if (result.length > 0) {
//       return {
//         isValid: false,
//         message: "A bucket with this name already exists.",
//       };
//     }
//
//     return { isValid: true, message: "ok" };
//   });
//
// export const addBucket = createServerFn({
//   method: "POST",
// })
//   .middleware([authMiddleware])
//   .validator(addBucketSchema)
//   .handler(async ({ context, data }) => {
//     const db = getDB(env.db);
//
//     const { isValid, message } = await validateBucketName({
//       data: data.name,
//     });
//
//     if (!isValid) throw new Error(message);
//
//     return db
//       .insert(buckets)
//       .values({
//         id: uuidv7(),
//         userId: context.session.userId,
//         name: data.name,
//       })
//       .returning();
//   });
//
// export const validateEditBucketName = createServerFn({
//   method: "GET",
// })
//   .middleware([verifyUserBucketMiddleware])
//   .validator(editBucketSchema)
//   .handler(async ({ context, data }) => {
//     const db = getDB(env.db);
//
//     const result = await db
//       .select({
//         id: buckets.id,
//         name: buckets.name,
//       })
//       .from(buckets)
//       .where(
//         and(
//           eq(buckets.userId, context.session.userId),
//           eq(lower(buckets.name), data.name.toLowerCase()),
//           ne(buckets.id, data.bucketId),
//         ),
//       )
//       .limit(1);
//
//     if (result.length > 0) {
//       return {
//         isValid: false,
//         message: "A bucket with this name already exists.",
//       };
//     }
//
//     return { isValid: true, message: "ok" };
//   });
//
// export const editBucket = createServerFn({
//   method: "POST",
// })
//   .middleware([verifyUserBucketMiddleware])
//   .validator(editBucketSchema)
//   .handler(async ({ data }) => {
//     const db = getDB(env.db);
//
//     const { isValid, message } = await validateEditBucketName({
//       data,
//     });
//
//     if (!isValid) throw new Error(message);
//
//     return db
//       .update(buckets)
//       .set({
//         name: data.name,
//       })
//       .where(eq(buckets.id, data.bucketId))
//       .returning();
//   });
//
// export const deleteBucket = createServerFn({
//   method: "POST",
// })
//   .middleware([verifyUserBucketMiddleware])
//   .handler(async ({ data }) => {
//     const db = getDB(env.db);
//
//     return db.delete(buckets).where(eq(buckets.id, data.bucketId)).returning();
//   });
