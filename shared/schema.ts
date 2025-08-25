import { 
  pgTable, 
  text, 
  uuid, 
  integer, 
  boolean, 
  timestamp, 
  date,
  jsonb,
  pgEnum,
  varchar
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Enums
export const appRoleEnum = pgEnum('app_role', ['admin', 'member']);
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'used', 'expired']);
export const eventStatusEnum = pgEnum('event_status', ['upcoming', 'ongoing', 'completed', 'cancelled']);
export const postStatusEnum = pgEnum('post_status', ['active', 'flagged', 'removed']);
export const challengeStatusEnum = pgEnum('challenge_status', ['active', 'completed', 'draft']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'completed', 'failed', 'refunded']);

// Profiles table
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  username: text("username").unique(),
  full_name: text("full_name"),
  bio: text("bio"),
  avatar_url: text("avatar_url"),
  location: text("location"),
  instagram_handle: text("instagram_handle"),
  total_loyalty_points: integer("total_loyalty_points").default(0),
  available_loyalty_points: integer("available_loyalty_points").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// User roles table
export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").references(() => profiles.id, { onDelete: 'cascade' }),
  role: appRoleEnum("role").default('member'),
  assigned_at: timestamp("assigned_at").defaultNow(),
  assigned_by: uuid("assigned_by").references(() => profiles.id),
});

// Invites table
export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  created_by: uuid("created_by").references(() => profiles.id, { onDelete: 'set null' }),
  used_by: uuid("used_by").references(() => profiles.id, { onDelete: 'set null' }),
  status: inviteStatusEnum("status").default('pending'),
  invite_type: text("invite_type"),
  max_uses: integer("max_uses"),
  current_uses: integer("current_uses").default(0),
  expires_at: timestamp("expires_at"),
  used_at: timestamp("used_at"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  start_time: timestamp("start_time").notNull(),
  end_time: timestamp("end_time"),
  max_capacity: integer("max_capacity"),
  current_capacity: integer("current_capacity").default(0),
  price_cents: integer("price_cents").default(0),
  loyalty_points_price: integer("loyalty_points_price"),
  attendance_points: integer("attendance_points"),
  image_url: text("image_url"),
  status: eventStatusEnum("status").default('upcoming'),
  qr_code_token: text("qr_code_token"),
  qr_code_generated_at: timestamp("qr_code_generated_at"),
  qr_code_generated_by: uuid("qr_code_generated_by"),
  created_by: uuid("created_by").references(() => profiles.id, { onDelete: 'set null' }),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Event registrations table
export const eventRegistrations = pgTable("event_registrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  event_id: uuid("event_id").references(() => events.id, { onDelete: 'cascade' }),
  user_id: uuid("user_id").references(() => profiles.id, { onDelete: 'cascade' }),
  payment_method: text("payment_method"),
  stripe_session_id: text("stripe_session_id"),
  loyalty_points_used: integer("loyalty_points_used"),
  payment_status: paymentStatusEnum("payment_status").default('pending'),
  registered_at: timestamp("registered_at").defaultNow(),
});

// Event attendance table
export const eventAttendance = pgTable("event_attendance", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  event_id: uuid("event_id").references(() => events.id, { onDelete: 'cascade' }),
  user_id: uuid("user_id").references(() => profiles.id, { onDelete: 'cascade' }),
  attended_at: timestamp("attended_at").defaultNow(),
  points_awarded: integer("points_awarded"),
  verified_by: uuid("verified_by"),
  created_at: timestamp("created_at").defaultNow(),
});

// Challenges table
export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  challenge_type: text("challenge_type"),
  start_date: date("start_date"),
  end_date: date("end_date"),
  step_goal: integer("step_goal"),
  points_reward: integer("points_reward").default(0),
  winner_reward_points: integer("winner_reward_points"),
  runner_up_reward_points: integer("runner_up_reward_points"),
  participation_reward_points: integer("participation_reward_points"),
  auto_award_enabled: boolean("auto_award_enabled"),
  badge_name: text("badge_name"),
  badge_image_url: text("badge_image_url"),
  status: challengeStatusEnum("status").default('draft'),
  created_by: uuid("created_by").references(() => profiles.id, { onDelete: 'set null' }),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Challenge participations table
export const challengeParticipations = pgTable("challenge_participations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  challenge_id: uuid("challenge_id").references(() => challenges.id, { onDelete: 'cascade' }),
  user_id: uuid("user_id").references(() => profiles.id, { onDelete: 'cascade' }),
  completed: boolean("completed").default(false),
  completion_date: timestamp("completion_date"),
  progress_data: jsonb("progress_data"),
  joined_at: timestamp("joined_at").defaultNow(),
});

// Challenge cycles table
export const challengeCycles = pgTable("challenge_cycles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  parent_challenge_id: uuid("parent_challenge_id").references(() => challenges.id, { onDelete: 'cascade' }),
  cycle_start: timestamp("cycle_start").notNull(),
  cycle_end: timestamp("cycle_end").notNull(),
  status: text("status").default('active'),
  winner_user_id: uuid("winner_user_id"),
  runner_up_user_id: uuid("runner_up_user_id"),
  participants_count: integer("participants_count"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Walking leaderboards table
export const walkingLeaderboards = pgTable("walking_leaderboards", {
  challenge_id: uuid("challenge_id").references(() => challenges.id, { onDelete: 'cascade' }),
  user_id: uuid("user_id").references(() => profiles.id, { onDelete: 'cascade' }),
  total_steps: integer("total_steps").default(0),
  daily_steps: jsonb("daily_steps"),
  last_updated: timestamp("last_updated").defaultNow(),
  is_validated: boolean("is_validated").default(false),
});

// Social posts table
export const socialPosts = pgTable("social_posts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").references(() => profiles.id, { onDelete: 'cascade' }),
  content: text("content"),
  image_urls: text("image_urls").array(),
  is_story: boolean("is_story").default(false),
  expires_at: timestamp("expires_at"),
  likes_count: integer("likes_count").default(0),
  comments_count: integer("comments_count").default(0),
  status: postStatusEnum("status").default('active'),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Post likes table
export const postLikes = pgTable("post_likes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  post_id: uuid("post_id").references(() => socialPosts.id, { onDelete: 'cascade' }),
  user_id: uuid("user_id").references(() => profiles.id, { onDelete: 'cascade' }),
  created_at: timestamp("created_at").defaultNow(),
});

// Post comments table
export const postComments = pgTable("post_comments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  post_id: uuid("post_id").references(() => socialPosts.id, { onDelete: 'cascade' }),
  user_id: uuid("user_id").references(() => profiles.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Loyalty transactions table
export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").references(() => profiles.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // 'earned', 'redeemed', 'expired'
  points: integer("points").notNull(),
  description: text("description"),
  reference_id: uuid("reference_id"),
  reference_type: text("reference_type"),
  source_category: text("source_category"),
  expires_at: timestamp("expires_at"),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow(),
});

// Direct messages table
export const directMessages = pgTable("direct_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sender_id: uuid("sender_id").references(() => profiles.id, { onDelete: 'cascade' }),
  recipient_id: uuid("recipient_id").references(() => profiles.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  message_type: text("message_type").default('text'),
  media_url: text("media_url"),
  read_at: timestamp("read_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Health data table
export const healthData = pgTable("health_data", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").references(() => profiles.id, { onDelete: 'cascade' }),
  date: date("date").defaultNow(),
  steps: integer("steps"),
  distance_km: integer("distance_km"),
  calories_burned: integer("calories_burned"),
  active_minutes: integer("active_minutes"),
  sleep_hours: integer("sleep_hours"),
  water_glasses: integer("water_glasses"),
  weight_kg: integer("weight_kg"),
  mood_score: integer("mood_score"),
  energy_level: integer("energy_level"),
  stress_level: integer("stress_level"),
  heart_rate_avg: integer("heart_rate_avg"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Schema validation helpers
export const insertProfileSchema = createInsertSchema(profiles);
export const insertEventSchema = createInsertSchema(events);
export const insertChallengeSchema = createInsertSchema(challenges);
export const insertSocialPostSchema = createInsertSchema(socialPosts);
export const insertHealthDataSchema = createInsertSchema(healthData);

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type SocialPost = typeof socialPosts.$inferSelect;
export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;
export type HealthData = typeof healthData.$inferSelect;
export type InsertHealthData = z.infer<typeof insertHealthDataSchema>;
