CREATE TABLE "upload_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"byte_size" integer NOT NULL,
	"content_type" text NOT NULL,
	"access" "media_access" DEFAULT 'public' NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"media_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upload_intent_size" CHECK ("upload_intents"."byte_size" > 0),
	CONSTRAINT "upload_intent_alt_length" CHECK (char_length("upload_intents"."alt_text") <= 300)
);
--> statement-breakpoint
ALTER TABLE "upload_intents" ADD CONSTRAINT "upload_intents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_intents" ADD CONSTRAINT "upload_intents_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "upload_intents_expires_idx" ON "upload_intents" USING btree ("expires_at");