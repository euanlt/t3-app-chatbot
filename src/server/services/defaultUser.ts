import { db } from "~/server/db";
import { createLogger } from "./logger";

const logger = createLogger("DefaultUser");

export async function ensureDefaultUser() {
  try {
    const defaultUser = await db.user.findFirst({
      where: { id: "default-user" },
    });

    if (!defaultUser) {
      logger.info("Creating default user");
      await db.user.create({
        data: {
          id: "default-user",
          name: "Default User",
          email: "default@example.com",
        },
      });
      logger.info("Default user created successfully");
    } else {
      logger.info("Default user already exists", { id: defaultUser.id });
    }
  } catch (error) {
    logger.error("Failed to ensure default user exists", error instanceof Error ? error : { error });
  }
}