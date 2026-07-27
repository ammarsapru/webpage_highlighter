-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "apiTokenHash" TEXT,
    "openRouterApiKey" TEXT,
    "openRouterModel" TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini'
);
INSERT INTO "new_Settings" ("apiTokenHash", "id", "openRouterApiKey", "openRouterModel") SELECT "apiTokenHash", "id", "openRouterApiKey", "openRouterModel" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
