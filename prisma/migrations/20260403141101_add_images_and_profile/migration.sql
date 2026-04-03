-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "image_urls" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "profile_image_url" VARCHAR(512);
