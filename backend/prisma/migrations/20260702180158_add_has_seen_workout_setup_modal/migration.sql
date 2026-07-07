-- Migration: add_has_seen_workout_setup_modal
-- This migration historically added the hasSeenWorkoutSetupModal column to User.

ALTER TABLE "User" ADD COLUMN "hasSeenWorkoutSetupModal" BOOLEAN NOT NULL DEFAULT false;
