# PrintDecore Billing Plans

> Pricing structure for print shop managers onboarding their business onto PrintDecore.
> All prices in **Ghana Cedis (GHS)**. Plans are billed **monthly**.

---

## Plan Overview

| Feature | Starter (Free) | Growth (GHS 150/mo) | Enterprise (GHS 450/mo) | Pay-As-You-Go |
|---|---|---|---|---|
| **Monthly Fee** | GHS 0 | GHS 150 | GHS 450 | GHS 0 |
| **Commission per order** | 8% | 5% | 0% | 8% |
| **Branches** | 1 | Up to 3 | Unlimited | 1 |
| **Clerks per branch** | 2 | 5 | Unlimited | 2 |
| **Orders / month** | 100 | Unlimited | Unlimited | Unlimited |
| **Dashboard & Analytics** | Basic stats only | Full analytics | Full analytics + export | Basic stats only |
| **Services Configuration** | Up to 10 services | Up to 50 services | Unlimited | Up to 10 services |
| **WhatsApp Messaging** | - | 1 connected number | Unlimited numbers | - |
| **Roles & Permissions** | - | Up to 3 custom roles | Unlimited roles | - |
| **User Management** | Invite only | Full user management | Full + bulk operations | Invite only |
| **Activity Log** | - | 30-day retention | Unlimited retention | - |
| **Branch Cover Image** | Default only | Custom upload | Custom upload | Default only |
| **Paystack Sub-accounts** | - | Included | Included + multi-account | - |
| **Support** | Community | Email (48hr response) | Priority (4hr response) | Community |
| **Custom Branding** | - | - | White-label options | - |

---

## 1. Starter Plan (Free)

**Target:** New print shop owners testing the platform.

**What's included:**
- 1 branch with basic setup
- 2 clerk accounts
- Up to 100 orders per month
- Basic dashboard (order counts, pipeline view)
- Up to 10 active services
- Standard order management (view, update status)
- Profile and settings access

**Limitations:**
- 8% commission on every completed order
- No WhatsApp messaging integration
- No custom roles or granular permissions (clerks get default access)
- No activity log
- No analytics/reports (category performance, revenue charts, weekly trends)
- No Paystack sub-account (manual payment collection only)
- Cannot export data

**Upgrade triggers:**
- Exceeding 100 orders/month
- Needing a second branch
- Wanting WhatsApp integration for customer communication
- Needing more than 2 clerks

---

## 2. Growth Plan - GHS 150/month

**Target:** Established print shops scaling operations across locations.

**What's included:**
- Everything in Starter, plus:
- Up to 3 branches
- Up to 5 clerks per branch (15 total)
- Unlimited orders
- **5% commission** (reduced from 8%)
- Full dashboard analytics (revenue overview, category performance, weekly activity trends)
- Up to 50 active services across all branches
- WhatsApp messaging (1 connected number)
- Up to 3 custom roles with granular permission assignment
- Full user management (invite, activate/deactivate, role assignment)
- Activity log with 30-day retention
- Custom branch cover images
- Paystack sub-account integration for automated payouts
- Email support with 48-hour response time

**Limitations:**
- 3 branch maximum
- 5 clerks per branch maximum
- 3 custom roles maximum
- 1 WhatsApp number
- No report export
- No white-label/custom branding
- 30-day activity log retention (older entries purged)

**Upgrade triggers:**
- Needing more than 3 branches
- Wanting to eliminate commission entirely
- Needing unlimited clerks or roles
- Wanting priority support
- Needing data export capabilities

---

## 3. Enterprise Plan - GHS 450/month

**Target:** Large print businesses and chains with multiple locations.

**What's included:**
- Everything in Growth, plus:
- Unlimited branches
- Unlimited clerks per branch
- **0% commission** (no transaction fees)
- Unlimited active services
- Unlimited WhatsApp connected numbers (one per branch)
- Unlimited custom roles and permissions
- Full user management with bulk operations (bulk role changes, bulk deactivation)
- Unlimited activity log retention
- Full analytics with data export (CSV/PDF reports)
- Multiple Paystack sub-accounts (one per branch)
- Priority support with 4-hour response time
- White-label options (custom branding on customer-facing interfaces)
- Access to API for custom integrations

---

## 4. Pay-As-You-Go (Commission Only)

**Target:** Seasonal businesses, pop-up print shops, or managers who want zero upfront cost.

**How it works:**
- No monthly subscription fee
- **8% commission** deducted from every completed order
- Commission is automatically deducted before payout via Paystack split
- Feature set matches the **Starter plan**

**What's included:**
- 1 branch, 2 clerks
- Unlimited orders (no monthly cap, unlike Starter)
- Basic dashboard stats
- Up to 10 active services
- Standard order management

**Limitations:**
- Same feature restrictions as Starter (no analytics, no WhatsApp, no roles, no activity log)
- Highest commission rate (8% on every order)
- No volume discounts

**Best for:**
- Managers who process fewer than ~20 orders/month (where GHS 150/mo subscription wouldn't be cost-effective)
- Businesses that want to try the platform without commitment
- Seasonal operations

**Break-even analysis vs Growth plan:**
- At 8% commission, the Growth plan (GHS 150/mo at 5% commission) becomes cheaper when monthly order revenue exceeds **GHS 5,000**
- Example: GHS 5,000 revenue = GHS 400 commission (PAYG) vs GHS 150 + GHS 250 commission (Growth) = GHS 400
- Above GHS 5,000/mo revenue, Growth plan saves money AND unlocks more features

---

## Commission Structure

| Plan | Commission Rate | When Charged | Deduction Method |
|---|---|---|---|
| Starter | 8% | On completed orders | Paystack split before payout |
| Growth | 5% | On completed orders | Paystack split before payout |
| Enterprise | 0% | N/A | No commission |
| Pay-As-You-Go | 8% | On completed orders | Paystack split before payout |

**Commission calculation:**
```
commission = order.totalPrice * commissionRate
managerPayout = order.totalPrice - commission
```

**Example (GHS 200 order):**
- Starter/PAYG: GHS 16 commission, GHS 184 payout
- Growth: GHS 10 commission, GHS 190 payout
- Enterprise: GHS 0 commission, GHS 200 payout

---

## Permission Mapping by Plan

Shows which frontend features are unlocked per plan tier.

| Permission Key | Starter / PAYG | Growth | Enterprise |
|---|---|---|---|
| `dashboard.view` | Basic only | Full | Full |
| `dashboard.analytics` | - | Yes | Yes |
| `orders.view` | Yes | Yes | Yes |
| `orders.update` | Yes | Yes | Yes |
| `orders.create` | Yes | Yes | Yes |
| `orders.delete` | - | Yes | Yes |
| `services.view` | Yes (10 max) | Yes (50 max) | Yes (unlimited) |
| `services.manage` | Yes (10 max) | Yes (50 max) | Yes (unlimited) |
| `users.view` | Yes | Yes | Yes |
| `users.invite` | Yes (2 max) | Yes (5/branch) | Yes (unlimited) |
| `users.manage` | - | Yes | Yes |
| `users.permissions` | - | Yes (3 roles) | Yes (unlimited) |
| `branch.view` | Yes | Yes | Yes |
| `branch.manage` | Yes (1 only) | Yes (up to 3) | Yes (unlimited) |
| `branch.create` | - | Yes (up to 3) | Yes (unlimited) |
| `branch.delete` | - | Yes | Yes |
| `messages.view` | - | Yes | Yes |
| `messages.send` | - | Yes | Yes |
| `reports.view` | - | Yes | Yes |
| `reports.export` | - | - | Yes |
| `settings.view` | Yes | Yes | Yes |
| `settings.manage` | Yes | Yes | Yes |
| `activity.view` | - | Yes (30 days) | Yes (unlimited) |

---

## Implementation Notes

### Backend Requirements
1. **Manager subscription model** - Store plan type (`starter`, `growth`, `enterprise`, `payg`) on the manager record
2. **Limit enforcement middleware** - Check branch count, clerk count, service count, order count against plan limits before allowing creation
3. **Paystack split payments** - Configure commission splits based on plan tier when processing order payments
4. **Feature flags** - Gate API endpoints based on plan (e.g., WhatsApp routes return 403 for Starter/PAYG)
5. **Usage tracking** - Track monthly order count for Starter plan cap enforcement
6. **Activity log cleanup** - Cron job to purge activity logs older than 30 days for Growth plan managers

### Frontend Requirements
1. **Plan-aware UI** - Show upgrade prompts when limits are approached (e.g., "2/3 branches used")
2. **Feature gating** - Hide or disable UI elements not available on current plan (similar to permission gating)
3. **Billing page** - New settings tab showing current plan, usage, and upgrade options
4. **Upgrade flow** - In-app upgrade with Paystack subscription checkout

### Paystack Integration
- Use Paystack **Subscriptions API** for Growth and Enterprise plans
- Use Paystack **Transaction Split** for commission deduction on Starter and PAYG
- Create sub-accounts per branch for Enterprise multi-account support
