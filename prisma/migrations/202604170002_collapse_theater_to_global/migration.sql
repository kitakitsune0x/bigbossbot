ALTER TABLE "UserPreference"
ALTER COLUMN "theater" SET DEFAULT 'global';

UPDATE "UserPreference"
SET "theater" = 'global'
WHERE "theater" IN ('middle-east', 'ukraine');
