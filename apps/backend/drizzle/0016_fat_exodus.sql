-- Add messages column to threads table for persistent chat history
ALTER TABLE "threads" ADD COLUMN "messages" jsonb DEFAULT '[]'::jsonb NOT NULL;
