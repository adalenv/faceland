-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "distributionEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CrmClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "httpMethod" TEXT NOT NULL DEFAULT 'POST',
    "headers" JSONB,
    "fieldMapping" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmQuota" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "leadLimit" INTEGER NOT NULL,
    "periodDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmDelivery" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "requestBody" JSONB NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormDistributionClient" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER,

    CONSTRAINT "FormDistributionClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormDistributionClient_formId_clientId_key" ON "FormDistributionClient"("formId", "clientId");

-- AddForeignKey
ALTER TABLE "CrmQuota" ADD CONSTRAINT "CrmQuota_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "CrmClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDelivery" ADD CONSTRAINT "CrmDelivery_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "CrmClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDelivery" ADD CONSTRAINT "CrmDelivery_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDelivery" ADD CONSTRAINT "CrmDelivery_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormDistributionClient" ADD CONSTRAINT "FormDistributionClient_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormDistributionClient" ADD CONSTRAINT "FormDistributionClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "CrmClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
