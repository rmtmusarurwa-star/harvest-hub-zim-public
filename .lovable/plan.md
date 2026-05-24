# Implementation Plan

This request is large. I'll break it into 3 phases so you can approve and ship incrementally rather than one massive change that risks breaking things.

---

## Phase 1 — Community Likes & Comments (fix first, smallest)

**Goal:** Liking and commenting must work reliably with optimistic UI + realtime.

- Reuse existing `forum_reactions` (likes) and `forum_comments` tables — no schema change needed.
- In `community.tsx`: keep current like toggle, add optimistic count + realtime subscription on `forum_reactions` / `forum_comments` so counts refresh live.
- In `community.$postId.tsx`: fix comment submit (surface real errors), add edit / soft-delete (add `deleted boolean default false` column + RLS update policy already covers author), realtime subscribe to new comments.
- Migration: `ALTER TABLE forum_comments ADD COLUMN deleted boolean NOT NULL DEFAULT false;` + enable realtime on `forum_reactions` and `forum_comments`.

## Phase 2 — Chat upgrades (delete chats, images, voice notes)

- Migration: add `deleted_for_buyer`, `deleted_for_farmer` booleans on `conversations`; extend `message_type` enum with `image` and `voice`; add `media_url`, `media_duration_seconds` on `messages`. Create public storage bucket `chat-media` with RLS so only conversation participants can read/write under `{conversation_id}/...`.
- Chat UI: delete-conversation menu (soft delete per side, filters list), image upload button (uses `chat-media`), voice recorder using `MediaRecorder` API → upload webm → render `<audio>` player with duration.

## Phase 3 — Payment system (largest)

- Migration on `profiles`: add `ecocash_number`, `zipit_account`, `bank_name`, `bank_account_number`, `bank_account_holder`, `bank_branch`.
- Migration on `orders`: ensure `payment_method` enum covers `ecocash|zipit|bank|cod`; add `payment_proof_url` (already have `proof_url` — reuse), `payment_verified_by uuid`, `payment_verified_at timestamptz`, `cash_received_by_seller boolean`, `cash_amount_received numeric`, `rejection_reason text`. Extend `payment_status` with `verified` and `rejected`.
- Profile page: add "Payment Methods" card with the 6 inputs; warn sellers with no method on their listings page.
- Replace current `checkout.tsx` mock flows (EcoCash OTP, fake card, fixed CBZ bank) with the **seller-specific** 4-step flow described: review → method → instructions populated from the listing's farmer profile → proof upload (or skip for COD) → submit.
- Buyer order page: status badges (pending / verified / rejected / completed) with appropriate CTAs.
- Seller order page: "Confirm Cash Received" button for COD; show proof image for online payments.
- Admin panel: new "Pending Payments" section with Verify / Reject (reason dropdown) modals; writes `payment_verified_by/at` or `rejection_reason` and sends notifications via existing `notify_order_status` trigger (extend message text).
- Notifications: rely on existing `notify_order_status` + add a trigger for `payment_status → verified/rejected` if not already covered.

---

## Question before I start

Phase 1 + 2 are roughly 1 batch each; Phase 3 alone is ~10+ files and several migrations. Do you want me to:

**A.** Do all three phases now in one go (long, higher risk of regressions), or
**B.** Ship Phase 1 (community fix) first, you verify it works, then I move to Phase 2, then Phase 3?

I recommend **B** since you've had repeated breakage on community/chat already. Reply "A" or "B" (or tell me a different ordering) and I'll proceed.
