import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { 
  events, 
  eventRegistrations, 
  loyaltyTransactions, 
  profiles,
  challenges,
  challengeCycles,
  walkingLeaderboards,
  eventAttendance
} from "@shared/schema";
import { eq, and, desc, gte } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Payment creation endpoint (replaces create-payment edge function)
  app.post("/api/payments/create", async (req, res) => {
    try {
      const { eventId, usePoints, userId } = req.body;

      if (!eventId || !userId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get event details
      const [event] = await db.select().from(events).where(eq(events.id, eventId));
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // If using loyalty points
      if (usePoints && event.loyalty_points_price) {
        const [profile] = await db.select({ available_loyalty_points: profiles.available_loyalty_points })
          .from(profiles)
          .where(eq(profiles.id, userId));

        if (!profile || profile.available_loyalty_points < event.loyalty_points_price) {
          return res.status(400).json({ error: "Insufficient loyalty points" });
        }

        // Create registration directly
        await db.insert(eventRegistrations).values({
          event_id: eventId,
          user_id: userId,
          payment_method: "loyalty_points",
          loyalty_points_used: event.loyalty_points_price,
          payment_status: "completed"
        });

        // Create loyalty transaction
        await db.insert(loyaltyTransactions).values({
          user_id: userId,
          type: "redeemed",
          points: event.loyalty_points_price,
          description: `Event registration: ${event.title}`,
          reference_type: "event_registration",
          reference_id: eventId
        });

        return res.json({ success: true, paymentMethod: "points" });
      }

      // For Stripe payments, we'd need the Stripe secret key
      return res.status(501).json({ error: "Stripe payments not configured yet" });

    } catch (error) {
      console.error("Payment creation error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Walking challenges processing endpoint (replaces process-walking-challenges edge function)
  app.post("/api/challenges/process-walking", async (req, res) => {
    try {
      console.log('Processing walking challenges...');

      // Get all active recurring challenges
      const recurringChallenges = await db.select()
        .from(challenges)
        .where(and(
          eq(challenges.status, 'active'),
          // Challenge type includes recurring
        ));

      console.log(`Found ${recurringChallenges.length} recurring challenges`);

      for (const challenge of recurringChallenges) {
        await processRecurringChallenge(challenge);
      }

      // Process completed challenge cycles
      await processCompletedCycles();

      return res.json({
        success: true,
        message: 'Walking challenges processed successfully',
        processed_challenges: recurringChallenges.length
      });

    } catch (error) {
      console.error('Error processing walking challenges:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // QR Code generation for events
  app.post("/api/events/:eventId/generate-qr", async (req, res) => {
    try {
      const { eventId } = req.params;
      const { userId } = req.body;

      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      await db.update(events)
        .set({
          qr_code_token: token,
          qr_code_generated_at: new Date(),
          qr_code_generated_by: userId
        })
        .where(eq(events.id, eventId));

      return res.json({ token });
    } catch (error) {
      console.error("QR generation error:", error);
      return res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  // QR Code verification for attendance
  app.post("/api/events/verify-attendance", async (req, res) => {
    try {
      const { token, userId } = req.body;

      // Find event by QR token
      const [event] = await db.select().from(events).where(eq(events.qr_code_token, token));
      if (!event) {
        return res.status(404).json({ error: "Invalid QR code" });
      }

      // Check if user is registered for the event
      const [registration] = await db.select()
        .from(eventRegistrations)
        .where(and(
          eq(eventRegistrations.event_id, event.id),
          eq(eventRegistrations.user_id, userId),
          eq(eventRegistrations.payment_status, "completed")
        ));

      if (!registration) {
        return res.status(403).json({ error: "User not registered for this event" });
      }

      // Check if already attended
      const [existingAttendance] = await db.select()
        .from(eventAttendance)
        .where(and(
          eq(eventAttendance.event_id, event.id),
          eq(eventAttendance.user_id, userId)
        ));

      if (existingAttendance) {
        return res.status(400).json({ error: "Attendance already recorded" });
      }

      // Record attendance
      await db.insert(eventAttendance).values({
        event_id: event.id,
        user_id: userId,
        points_awarded: event.attendance_points || 0
      });

      // Award loyalty points if configured
      if (event.attendance_points && event.attendance_points > 0) {
        await db.insert(loyaltyTransactions).values({
          user_id: userId,
          type: "earned",
          points: event.attendance_points,
          description: `Event attendance: ${event.title}`,
          reference_type: "event_attendance",
          reference_id: event.id
        });
      }

      return res.json({ 
        success: true, 
        pointsAwarded: event.attendance_points || 0 
      });

    } catch (error) {
      console.error("Attendance verification error:", error);
      return res.status(500).json({ error: "Failed to verify attendance" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

// Helper functions for challenge processing
async function processRecurringChallenge(challenge: any) {
  const now = new Date();
  const cycleLength = challenge.challenge_type === 'weekly_recurring' ? 7 : 30;
  
  // Check if we need to create a new cycle
  const [activeCycle] = await db.select()
    .from(challengeCycles)
    .where(and(
      eq(challengeCycles.parent_challenge_id, challenge.id),
      eq(challengeCycles.status, 'active')
    ));

  if (!activeCycle) {
    // Create new cycle
    const cycleStart = new Date();
    const cycleEnd = new Date();
    cycleEnd.setDate(cycleEnd.getDate() + cycleLength);

    await db.insert(challengeCycles).values({
      parent_challenge_id: challenge.id,
      cycle_start: cycleStart,
      cycle_end: cycleEnd,
      status: 'active'
    });

    console.log(`Created new ${challenge.challenge_type} cycle for challenge ${challenge.id}`);
  } else {
    // Check if current cycle should be completed
    const cycleEnd = new Date(activeCycle.cycle_end);
    if (now >= cycleEnd) {
      await completeCycle(activeCycle, challenge);
    }
  }
}

async function completeCycle(cycle: any, challenge: any) {
  console.log(`Completing cycle ${cycle.id} for challenge ${challenge.id}`);

  try {
    // Get leaderboard for this cycle
    const leaderboard = await db.select({
      user_id: walkingLeaderboards.user_id,
      total_steps: walkingLeaderboards.total_steps
    })
    .from(walkingLeaderboards)
    .where(and(
      eq(walkingLeaderboards.challenge_id, challenge.id),
      eq(walkingLeaderboards.is_validated, true)
    ))
    .orderBy(desc(walkingLeaderboards.total_steps))
    .limit(10);

    let winner_user_id = null;
    let runner_up_user_id = null;

    if (leaderboard && leaderboard.length > 0) {
      // Award points if auto-award is enabled
      if (challenge.auto_award_enabled) {
        await awardPoints(leaderboard, challenge);
      }

      winner_user_id = leaderboard[0]?.user_id;
      runner_up_user_id = leaderboard[1]?.user_id;
    }

    // Update cycle as completed
    await db.update(challengeCycles)
      .set({
        status: 'completed',
        winner_user_id,
        runner_up_user_id,
        participants_count: leaderboard?.length || 0
      })
      .where(eq(challengeCycles.id, cycle.id));

    // Create next cycle for recurring challenges
    if (challenge.challenge_type?.includes('recurring')) {
      const cycleLength = challenge.challenge_type === 'weekly_recurring' ? 7 : 30;
      const nextStart = new Date();
      const nextEnd = new Date();
      nextEnd.setDate(nextEnd.getDate() + cycleLength);

      await db.insert(challengeCycles).values({
        parent_challenge_id: challenge.id,
        cycle_start: nextStart,
        cycle_end: nextEnd,
        status: 'active'
      });

      // Reset leaderboard for new cycle
      await db.update(walkingLeaderboards)
        .set({
          total_steps: 0,
          daily_steps: {},
          last_updated: new Date()
        })
        .where(eq(walkingLeaderboards.challenge_id, challenge.id));
    }

    console.log(`Cycle ${cycle.id} completed successfully`);

  } catch (error) {
    console.error('Error completing cycle:', error);
  }
}

async function awardPoints(leaderboard: any[], challenge: any) {
  console.log('Awarding points to participants...');

  for (let i = 0; i < leaderboard.length; i++) {
    const participant = leaderboard[i];
    let points = 0;
    let description = '';

    if (i === 0) {
      // Winner
      points = challenge.winner_reward_points;
      description = `Winner of ${challenge.title}`;
    } else if (i === 1) {
      // Runner-up
      points = challenge.runner_up_reward_points;
      description = `Runner-up in ${challenge.title}`;
    } else {
      // Participation
      points = challenge.participation_reward_points;
      description = `Participation in ${challenge.title}`;
    }

    if (points > 0) {
      // Insert loyalty transaction
      await db.insert(loyaltyTransactions).values({
        user_id: participant.user_id,
        type: 'earned',
        points,
        description,
        reference_type: 'walking_challenge',
        reference_id: challenge.id
      });

      console.log(`Awarded ${points} points to user ${participant.user_id}`);
    }
  }
}

async function processCompletedCycles() {
  // Get recently completed cycles for logging
  const completedCycles = await db.select()
    .from(challengeCycles)
    .where(and(
      eq(challengeCycles.status, 'completed'),
      gte(challengeCycles.cycle_end, new Date(Date.now() - 24 * 60 * 60 * 1000))
    ));

  console.log(`Found ${completedCycles?.length || 0} recently completed cycles`);
}
