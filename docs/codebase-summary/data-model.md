# Data Model

> ⚠️ There are **no SQL migrations** in the repo. The tables below are inferred
> from how the code queries them. They exist only in the deployed Supabase
> database. Treat column lists as "what the code uses," not a guaranteed schema.

## Tables & relationships

```
users (auth.users link)
  id            uuid  (== auth.uid)
  hotel_id      uuid  -> hotels.id
  full_name     text
  role          text  ('admin')
  email         text

hotels
  id            uuid
  name          text
  owner         text
  email         text
  wifi_password text        <-- cached to localStorage in guest portal (see issues)
  created_at / updated_at

rooms
  id            uuid
  hotel_id      uuid  -> hotels.id
  room_number   int
  name          text
  status        text  ('available' | 'occupied' | 'cleaning' | ...)
  room_type     text  ('single' | 'double' | 'family')
  notes         text

bookings
  id            uuid
  room_id       uuid  -> rooms.id
  hotel_id      uuid  -> hotels.id
  guest_name    text
  start_time    timestamptz
  end_time      timestamptz
  hours         int
  price         numeric
  status        text  ('active' | 'completed')
  checked_in_at / checked_out_at timestamptz

pricing
  hotel_id        uuid
  duration_hours  int   (1,3,6,12,24)
  price           numeric
  room_type       text  ('single' | 'double' | 'family')
  (unique on hotel_id, duration_hours, room_type)

subscriptions
  id                       uuid
  hotel_id                 uuid -> hotels.id
  room_count               int
  price_per_room           numeric
  monthly_amount           numeric
  yearly_amount            numeric
  currency                 text ('PHP')
  subscription_status      text ('trial' | 'active' | 'past_due' | 'expired')
  trial_start / trial_end  timestamptz
  current_period_start/end timestamptz
  next_billing_date        timestamptz
  cancel_at_period_end     bool
  provider_subscription_id text   (PayMongo checkout session id)
  payment_provider         text
  pending_room_count / pending_monthly_amount / pending_change_effective_date

subscription_changes
  id, hotel_id, subscription_id
  old_room_count / new_room_count
  old_amount / new_amount
  effective_date timestamptz
  status         text ('pending' | 'applied')

payments
  id, hotel_id, subscription_id
  paymongo_session_id text
  amount    numeric
  currency  text
  status    text ('pending' | 'paid' | 'failed')
  payment_method text
  paid_at   timestamptz

messages
  id, room_id, hotel_id
  sender      text ('admin' | 'guest')
  sender_id   uuid
  message     text
  is_read     bool
  read_at     timestamptz

guest_sessions
  id, room_id
  token       text (uuid)
  is_active   bool
  expires_at  timestamptz

menu_images
  id, hotel_id
  image_url   text
  display_order int

activity_logs
  id, hotel_id, user_id
  action_type text ('checkin' | 'checkout' | 'extend' | ...)
  description text
  created_at  timestamptz

revenue_summary
  hotel_id (implied)
  total_revenue, total_checkins, total_active_bookings, occupancy_rate
  -- updated by DB triggers / rpc (add_extension_revenue, reset functions)
```

## Key relationships

- A **user** belongs to one **hotel** (`users.hotel_id`).
- A **hotel** has many **rooms**, **bookings**, **pricing** rows,
  **subscriptions**, **payments**, **messages**, **menu_images**,
  **activity_logs**.
- A **room** has many **bookings** (one active at a time in the UI).
- A **subscription** has many **subscription_changes** and **payments**.
- **guest_sessions** are per-room, short-lived (24h), used to identify the
  guest in chat.

## Computed status (not stored)

Room status (`available`/`occupied`/`expiring`/`expired`/`cleaning`/`booked`)
is computed in `Dashboard.fetchRooms`/`getRoomStatus` from the active booking's
`end_time` vs. now. `expiring`/`expired` are derived, not persisted.
