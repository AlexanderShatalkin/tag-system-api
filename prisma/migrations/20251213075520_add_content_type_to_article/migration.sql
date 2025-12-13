/*
  Warnings:

  - Added the required column `content_type` to the `Article` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "content_type" TEXT NOT NULL;
