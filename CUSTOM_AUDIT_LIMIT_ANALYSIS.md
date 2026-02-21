# 🦅 Platform Sovereign: Custom Forensic Thresholds

## 📌 Executive Security Directive
The user mandated the transition from a fixed Audit Display Limit into a **Custom Field**. Administrators must have the autonomy to define exactly how many telemetry records are retrieved from the cloud for forensic analysis.

---

## 🏗️ Technical Architecture Analysis

### 1. Dynamic Retrieval Engine
We have replaced the legacy `<select>` dropdown with a high-precision `number` input.
*   **Infinite Flexibility:** Admins can now specify any value (e.g., 15, 75, 450) instead of being restricted to hardcoded intervals.
*   **Performance Guard:** Added a `max="1000"` constraint to prevent excessive memory consumption and database overhead during high-traffic audits.

### 2. Payload Integration
The retrieval logic in `actions.js` remains seamlessly bound to the `system_settings` table. 
*   **Logic:** `limit(window.systemConfig.audit_limit)`
*   **Result:** The moment an admin saves a custom limit in Settings, the Audit Trail adapts its fetch operations globally across all nodes.

### 3. Visual Feedback
Included a contextual `form-text` helper that clarifies the boundaries of the custom threshold (Min: 1, Max: 1000).

---

## 🏁 Operational Status
- **Audit Limit Input:** CUSTOM (Persistent)
- **Constraint Enforcement:** ACTIVE
- **Global Propagation:** ACTIVE

The INKPlus platform now treats forensic depth as a modulateable variable, giving administrators maximum control over their data visibility.
