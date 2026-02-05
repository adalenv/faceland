-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('short_text', 'long_text', 'single_choice', 'multiple_choice', 'email', 'phone', 'consent');

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "FormStatus" NOT NULL DEFAULT 'draft',
    "introTitle" TEXT,
    "introDescription" TEXT,
    "thankYouTitle" TEXT DEFAULT 'Thank you!',
    "thankYouMessage" TEXT DEFAULT 'Your response has been recorded.',
    "redirectUrl" TEXT,
    "redirectDelaySec" INTEGER DEFAULT 5,
    "webhookUrl" TEXT,
    "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookSecret" TEXT,
    "publishedVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormVersion" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "configJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "utmJson" JSONB,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "questionLabel" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "requestBodyJson" JSONB NOT NULL,
    "responseStatus" INTEGER,
    "responseBodyText" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Form_slug_key" ON "Form"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FormVersion_formId_versionNumber_key" ON "FormVersion"("formId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Question_formId_key_key" ON "Question"("formId", "key");

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "FormVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormVersion" ADD CONSTRAINT "FormVersion_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
