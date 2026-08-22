-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'LIVE', 'PAUSED', 'FINISHED', 'POSTPONED', 'CANCELLED', 'DELAYED', 'TBC');

-- CreateEnum
CREATE TYPE "ParticipantType" AS ENUM ('TEAM', 'PLAYER');

-- CreateEnum
CREATE TYPE "Side" AS ENUM ('HOME', 'AWAY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "StandingType" AS ENUM ('DRIVERS', 'CONSTRUCTORS', 'LEAGUE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FavoriteType" AS ENUM ('SPORT', 'COMPETITION', 'TEAM', 'PLAYER', 'EVENT');

-- CreateEnum
CREATE TYPE "WidgetType" AS ENUM ('BASIC', 'SCHEDULE', 'ENHANCED', 'LIVE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('EVENT_STARTING', 'EVENT_STARTING_1H', 'EVENT_STARTING_30M', 'LIVE_STARTED', 'RESULT_AVAILABLE', 'SCHEDULE_CHANGE', 'EVENT_POSTPONED', 'EVENT_CANCELLED', 'CHAMPIONSHIP_UPDATE');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD');

-- CreateEnum
CREATE TYPE "EntitlementSource" AS ENUM ('PLAN', 'DEV_GRANT', 'MANUAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "planTier" "PlanTier" NOT NULL DEFAULT 'FREE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "iconUrl" TEXT,
    "accentColor" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "region" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "number" INTEGER,
    "label" TEXT NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "venueId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT,
    "lengthKm" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "color" TEXT,
    "logoUrl" TEXT,
    "country" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "teamId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "number" INTEGER,
    "nationality" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "photoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "seasonId" TEXT,
    "roundId" TEXT,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "statusDetail" TEXT,
    "venueId" TEXT,
    "isBroadcast" BOOLEAN NOT NULL DEFAULT false,
    "broadcastInfo" JSONB,
    "metadata" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventParticipant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "ParticipantType" NOT NULL,
    "teamId" TEXT,
    "playerId" TEXT,
    "side" "Side" NOT NULL DEFAULT 'UNKNOWN',
    "label" TEXT,
    "position" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "EventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventResult" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "position" INTEGER,
    "positionText" TEXT,
    "points" DOUBLE PRECISION,
    "timeMs" INTEGER,
    "gapMs" INTEGER,
    "status" TEXT,
    "metadata" JSONB,

    CONSTRAINT "EventResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Standings" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "type" "StandingType" NOT NULL,
    "name" TEXT NOT NULL,
    "dataUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandingEntry" (
    "id" TEXT NOT NULL,
    "standingsId" TEXT NOT NULL,
    "type" "ParticipantType" NOT NULL,
    "teamId" TEXT,
    "playerId" TEXT,
    "position" INTEGER NOT NULL,
    "positionText" TEXT,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wins" INTEGER,
    "losses" INTEGER,
    "draws" INTEGER,
    "played" INTEGER,
    "previousPos" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "StandingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "FavoriteType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Widget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WidgetType" NOT NULL,
    "name" TEXT NOT NULL,
    "size" TEXT NOT NULL DEFAULT 'medium',
    "sportId" TEXT,
    "competitionId" TEXT,
    "config" JSONB,
    "instanceToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastDataAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "appVersion" TEXT,
    "pushToken" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "eventId" TEXT,
    "data" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "leadMinutes" INTEGER,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "priceMonthlyCents" INTEGER NOT NULL,
    "priceYearlyCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "billingProvider" TEXT,
    "externalId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "source" "EntitlementSource" NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSource" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sportId" TEXT,
    "baseUrl" TEXT NOT NULL,
    "rateLimitPerSec" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProviderSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderMapping" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "internalId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "jobType" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "sourceId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "errors" JSONB,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Sport_slug_key" ON "Sport"("slug");

-- CreateIndex
CREATE INDEX "Sport_category_isActive_idx" ON "Sport"("category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Competition_slug_key" ON "Competition"("slug");

-- CreateIndex
CREATE INDEX "Competition_sportId_isActive_idx" ON "Competition"("sportId", "isActive");

-- CreateIndex
CREATE INDEX "Season_isCurrent_idx" ON "Season"("isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "Season_competitionId_name_key" ON "Season"("competitionId", "name");

-- CreateIndex
CREATE INDEX "Round_seasonId_startTime_idx" ON "Round"("seasonId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Round_seasonId_number_key" ON "Round"("seasonId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");

-- CreateIndex
CREATE INDEX "Venue_country_idx" ON "Venue"("country");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE INDEX "Team_sportId_idx" ON "Team"("sportId");

-- CreateIndex
CREATE INDEX "Player_teamId_idx" ON "Player"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_sportId_slug_key" ON "Player"("sportId", "slug");

-- CreateIndex
CREATE INDEX "Event_sportId_startTime_idx" ON "Event"("sportId", "startTime");

-- CreateIndex
CREATE INDEX "Event_status_startTime_idx" ON "Event"("status", "startTime");

-- CreateIndex
CREATE INDEX "Event_competitionId_seasonId_startTime_idx" ON "Event"("competitionId", "seasonId", "startTime");

-- CreateIndex
CREATE INDEX "Event_roundId_idx" ON "Event"("roundId");

-- CreateIndex
CREATE INDEX "EventParticipant_eventId_idx" ON "EventParticipant"("eventId");

-- CreateIndex
CREATE INDEX "EventParticipant_teamId_idx" ON "EventParticipant"("teamId");

-- CreateIndex
CREATE INDEX "EventParticipant_playerId_idx" ON "EventParticipant"("playerId");

-- CreateIndex
CREATE INDEX "EventResult_eventId_position_idx" ON "EventResult"("eventId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "EventResult_eventId_participantId_key" ON "EventResult"("eventId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "Standings_competitionId_seasonId_type_key" ON "Standings"("competitionId", "seasonId", "type");

-- CreateIndex
CREATE INDEX "StandingEntry_standingsId_position_idx" ON "StandingEntry"("standingsId", "position");

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_type_targetId_key" ON "Favorite"("userId", "type", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Widget_instanceToken_key" ON "Widget"("instanceToken");

-- CreateIndex
CREATE INDEX "Widget_userId_idx" ON "Widget"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_userId_deviceId_key" ON "Device"("userId", "deviceId");

-- CreateIndex
CREATE INDEX "Notification_userId_sentAt_idx" ON "Notification"("userId", "sentAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_category_key" ON "NotificationPreference"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_tier_key" ON "SubscriptionPlan"("tier");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex
CREATE INDEX "Entitlement_userId_idx" ON "Entitlement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Entitlement_userId_key_source_key" ON "Entitlement"("userId", "key", "source");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSource_slug_key" ON "ProviderSource"("slug");

-- CreateIndex
CREATE INDEX "ProviderSource_sportId_idx" ON "ProviderSource"("sportId");

-- CreateIndex
CREATE INDEX "ProviderMapping_sourceId_entityType_internalId_idx" ON "ProviderMapping"("sourceId", "entityType", "internalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderMapping_sourceId_entityType_externalId_key" ON "ProviderMapping"("sourceId", "entityType", "externalId");

-- CreateIndex
CREATE INDEX "SyncJob_status_scheduledFor_idx" ON "SyncJob"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "SyncJob_jobType_status_idx" ON "SyncJob"("jobType", "status");

-- CreateIndex
CREATE INDEX "SyncLog_sourceId_startedAt_idx" ON "SyncLog"("sourceId", "startedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventResult" ADD CONSTRAINT "EventResult_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventResult" ADD CONSTRAINT "EventResult_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "EventParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Standings" ADD CONSTRAINT "Standings_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Standings" ADD CONSTRAINT "Standings_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandingEntry" ADD CONSTRAINT "StandingEntry_standingsId_fkey" FOREIGN KEY ("standingsId") REFERENCES "Standings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandingEntry" ADD CONSTRAINT "StandingEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandingEntry" ADD CONSTRAINT "StandingEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSource" ADD CONSTRAINT "ProviderSource_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMapping" ADD CONSTRAINT "ProviderMapping_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProviderSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProviderSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "SyncJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProviderSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
