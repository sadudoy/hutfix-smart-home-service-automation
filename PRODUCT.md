# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dhaka homeowners and renters, aged 25–45. Mobile-first users who are price-aware but place the highest value on technician trust, punctuality, and verified skill.

## Product Purpose

HutFix is an on-demand home services automation platform in Dhaka. It connects residents with vetted specialists across eight essential categories: appliance repair, plumbing, electrical, cleaning & pest control, home maintenance, moving & shifting, car care, and personal grooming. Success means booking a dependable technician in under two minutes with complete price certainty and zero booking collisions.

## Core Job

Request a home service → receive instant algorithmic match to a verified local specialist → select a confirmed calendar slot → track dispatch and execution in real time → receive an automated itemized invoice and submit a verified review.

## Positioning & Differentiators

Unlike unstructured classified listings or manual dispatch boards, HutFix provides:
- Real-time status progression tracking from dispatch to fulfillment.
- Concurrency-safe slot scheduling backed by database advisory locks (guaranteeing zero double-bookings).
- Verified specialist profiles with authentic customer star ratings and review counts.
- Instant, automated financial invoicing with transparent platform rates.

## Operating Context

Urban Dhaka apartments, family residences, and rental properties. Requests are initiated on mobile screens (down to 320px) during busy workdays or urgent home breakdowns. The interface is viewed in diverse ambient lighting environments, requiring equal operational clarity in light and dark settings.

## Capabilities and Constraints

- Architecture: Vanilla JavaScript, HTML5, semantic CSS, Bootstrap 5 layout grid, Express.js backend, local PostgreSQL database.
- Responsive floor: Flawless layout and interaction from 320px mobile viewport to widescreen desktop.
- Dual-theme requirement: Light and dark themes must maintain complete visual parity, meeting strict WCAG AA/AAA contrast ratios without color loss.
- Invariant DOM hooks: All existing element `id` attributes and JavaScript data contracts must remain strictly preserved.

## Brand Commitments & Voice

- Tone: Competent, warm, direct. Not corporate. Not cute.
- Copy standards: Plain, honest, descriptive language. Banned terms include: elevate, seamless, empower, effortless, revolutionize, cutting-edge, next-generation, unleash, supercharge, game-changer, best-in-class, transform.
- No manufactured metrics, fake testimonials, or artificial social proof.

## Anti-Goals

- No gradients used as decorative fills or gradient typography.
- No glassmorphism, blur effects, or translucent frosted panels.
- No nested cards or repetitive icon-plus-heading card stacks.
- No AI-signature visual clichés: zero purple/violet glow halos, zero neon accents on dark canvas.

## Product Principles

1. **Direct Utility Over Decorative Flourish**: Interface elements exist to show status, schedule times, and confirm prices—not to impress with ornamental effects.
2. **Predictable & Honest Operations**: Every rate is stated upfront; every booking is locked in transaction; every invoice is transparently itemized.
3. **Respect for Physical Context**: High contrast, thumb-friendly tap targets, and crisp typography designed for handheld use in Dhaka homes.
4. **First-Class Dark Environment**: Dark theme is crafted with dedicated surfaces and contrast-tested typography, not a naive inversion.
