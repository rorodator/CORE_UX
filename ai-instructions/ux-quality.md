# UX quality — CORE_UX

This document defines generic composition and accessibility expectations for every app consuming CORE_UX. Product hierarchy and domain wording remain in the consuming app.

## Prefer semantic component APIs

- Use a form control's `label`, `hint`, `error`, `required`, and related attributes instead of rebuilding labels around it.
- Use documented attribute values only. If a layout value is broadly reusable, add it to CORE_UX with styles, documentation, and a live demo instead of creating an app-only substitute.
- Use `<form>` and submit semantics for forms. Button-only click handling is not a replacement for keyboard submission.
- Keep user/API values out of author markup and inject them with safe DOM APIs.

## Compose one shared application shell

A consuming app should normally own these once, above routed page content:

- primary header/navigation;
- authentication or other global overlays;
- notification host;
- skip link and main-content target.

Pages own their content and page-specific actions. They should not each duplicate global chrome or feedback hosts.

## State completeness

Every data-backed surface must deliberately cover:

- loading, with an accessible status;
- success/content;
- empty, with a useful next action when appropriate;
- recoverable error, with a retry action;
- unauthorized/not-found where relevant;
- busy/disabled mutation feedback.

Use the smallest CORE_UX primitives that express those states consistently.

## Accessibility baseline

- Use landmarks and one page-level heading.
- Give controls accessible names through their native component API.
- Keep all actions keyboard reachable and preserve visible focus.
- Do not rely on color alone for status.
- Design mobile-first and test narrow layouts.
- Respect `prefers-reduced-motion`; motion must not be required to understand state.

## Icon-only actions in dense lists

Icon-only buttons fit **repeated, conventional local actions** in compact collections
(edit, delete, narrate a row) when the symbol is widely understood.

Requirements:

- mandatory accessible `label` on `<core-button icon-only>` (`aria-label`);
- tooltip via `<core-tooltip>` wrapper (label is not replaced by tooltip text);
- comfortable hit target (`core-btn--icon-only`);
- visible focus ring;
- delete uses trash semantics — reserve `close` / X for dismiss/cancel flows.

Prefer **visible text** for important, structural, or ambiguous actions (primary CTAs,
create flows, save/cancel). Do not default the whole app to icon-only controls.

## Product truth

Reusable components remain neutral. Consuming apps must not use polished mock UI or copy to imply unavailable capabilities. A UI may describe future work only when it is explicitly marked as such by the product.
