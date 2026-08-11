# QA Checklist — SayTaxi SaaS Pre-Launch

Use this checklist before every production release. Mark each item ✅ when verified.

---

## 1. Automated Tests

- [ ] All unit tests pass (`pnpm test`)
- [ ] No TypeScript errors (`pnpm check`)
- [ ] CI workflow green on the release PR

---

## 2. Responsive Design

Test at the three required breakpoints in Chrome DevTools:

| Breakpoint | Device | Status |
|------------|--------|--------|
| 375 px | iPhone SE / mobile | ☐ |
| 768 px | iPad / tablet | ☐ |
| 1920 px | Desktop full HD | ☐ |

**Checklist per breakpoint:**
- [ ] Navigation menu accessible (hamburger on mobile)
- [ ] Forms and inputs are usable (no horizontal scroll)
- [ ] Tables and cards reflow correctly
- [ ] Images and logos are not cropped

---

## 3. Cross-Browser

| Browser | Version | Smoke-tested |
|---------|---------|-------------|
| Chrome | latest | ☐ |
| Firefox | latest | ☐ |
| Safari | latest | ☐ |
| Edge | latest | ☐ |

**Smoke test per browser:**
- [ ] Login page renders correctly
- [ ] Dashboard loads without JS errors (check console)
- [ ] Trip alert / notification system works
- [ ] Stripe checkout opens

---

## 4. Accessibility — WCAG 2.1 AA

- [ ] **Keyboard navigation**: Tab through entire page without using mouse; no focus traps
- [ ] **Focus visible**: Focus outline visible on all interactive elements
- [ ] **Screen reader**: Test with VoiceOver (macOS) or NVDA (Windows); all images have `alt` text; buttons have labels
- [ ] **Colour contrast**: Text-to-background ratio ≥ 4.5 : 1 (verify with [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/))
- [ ] **Form labels**: Every `<input>` has a visible or `aria-label` label
- [ ] **Error messages**: Validation errors are announced to screen readers

---

## 5. Critical User Flows

### Admin
- [ ] Login with admin credentials
- [ ] Create a new driver account
- [ ] Assign / revoke permissions
- [ ] View dashboard metrics
- [ ] Logout

### Client
- [ ] Register with valid details
- [ ] Login
- [ ] Request a ride (lead) — confirm alert is dispatched
- [ ] View ride status
- [ ] Rate completed ride

### Driver
- [ ] Register with subscription info
- [ ] Login
- [ ] Receive ride alert / lead
- [ ] **Accept ride freely** (no forced assignment)
- [ ] **Reject ride without penalty** ← SaaS model requirement
- [ ] Complete a ride
- [ ] Manage subscription (Stripe portal)

### Fleet Admin
- [ ] View all drivers in fleet
- [ ] Suspend a driver
- [ ] Reactivate a driver
- [ ] View referral stats

---

## 6. SaaS Business Model Compliance

- [ ] The app **does not** charge trip fares between client and driver
- [ ] Stripe only charges the **driver subscription** (monthly fee)
- [ ] Drivers can reject any alert without error messages or score penalties
- [ ] Tariffs are displayed as reference only (set by the driver / taxi company)
- [ ] Terms of Service disclaimer is visible on registration / onboarding

---

## 7. Security Checklist

- [ ] Login rejects invalid credentials with a generic message ("Credenciales incorrectas")
- [ ] JWT/session cookie is `HttpOnly`, `Secure`, `SameSite=None`
- [ ] API endpoints return 401/403 for unauthenticated / unauthorised requests
- [ ] Rate limiting active on auth endpoints
- [ ] Environment secrets are not exposed in client bundles (`VITE_` prefix only for public values)
- [ ] No sensitive data in browser localStorage

---

## 8. Performance Baselines

Measure with Lighthouse (Chrome DevTools → Lighthouse tab):

| Metric | Target | Measured |
|--------|--------|---------|
| Page load (p85) | < 3 s | — |
| API response time | < 200 ms | — |
| `main.js` bundle | < 500 KB | — |
| Lighthouse Performance | ≥ 75 | — |

---

## 9. WhatsApp Notification Flow (if enabled)

- [ ] Ride request triggers WhatsApp alert to driver
- [ ] Alert includes: client name, pickup, destination
- [ ] Driver can reply to accept/reject from WhatsApp

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Dev / QA | | | |
| Product Owner | | | |
