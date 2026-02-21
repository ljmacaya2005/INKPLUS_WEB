# 🦅 Platform Sovereign: Global Environment & Policy Integration

## 📌 Executive Security Directive
The user mandated a comprehensive, functional, and persistent integration of core system behaviors. This includes visual synchronizations (Splash Screen), operational states (Maintenance Mode), chronometric standards (Date/Time/Timezone), and security compliance (Auto-Lock & Audit Control).

---

## 🏗️ Technical Architecture Analysis

### 1. Global State Configuration (`system_settings`)
We have expanded the cluster registry to support high-fidelity system modulation.

**Schema Extension:**
*   `splash_enabled`: Toggles the synchronized entry sequence.
*   `maintenance_mode`: Triggers a platform-wide lockdown.
*   `time_format`: Standardizes between 12-hour and 24-hour cycles.
*   `audit_limit`: Defines the depth of forensic telemetry retrieval.

### 2. Chronometric Engine (`dashboard.js` -> `formatDateTime`)
Implemented a centralized date-time engine that dynamically calculates timestamps based on:
1.  **User-Defined Timezone:** Corrects server ISO strings to regional contexts (e.g., UTC+8).
2.  **Date Format Strings:** Dynamically maps between standard formats (YYYY-MM-DD, etc.).
3.  **Preferred hour cycle:** Toggles AM/PM vs Military time globally across Jobs, History, and Audit modules.

### 3. Deep Lockdown Protocol (Maintenance Mode)
Injected a real-time policy enforcer in `dashboard.js`.
*   **Node Isolation:** If maintenance is engaged, all non-administrative traffic is intercepted at the `DOMContentLoaded` phase.
*   **Visual Interference:** The platform replaces the workspace with a high-security lockdown interface, preventing any interaction with system resources.

### 4. Entrance Sequence (Splash Screen)
Implemented a premium, non-obtrusive entry animation.
*   **State Persistence:** Restricted to once-per-session using `sessionStorage` to maintain developer experience while providing a high-end platform feel.
*   **Clustered Synchronization:** The splash screen serves as a visual proxy while the background scripts synchronize permissions and settings.

### 5. Security Inactivity Compliance (Auto-Lock)
A global inactivity listener tracks `mousedown`, `keypress`, and `touchstart` events.
*   **Adaptive Threshold:** Automatically scales based on the `lock_threshold` setting (in minutes).
*   **Immediate Eviction:** Upon timeout, the session is cleared, and the technician is redirected to the authentication node.

### 6. Forensic Depth Control (Audit Limit)
The Audit Trail (`actions.js`) is now reactive to the `audit_limit`. This prevents browser lag in high-traffic environments by only fetching the "Latest Portion" defined by the administrator.

---

## 🏁 Operational Status
- **Splash Screen Logic:** 100% ACTIVE
- **Maintenance Lockdown:** 100% ACTIVE
- **Global Date/Time Engine:** 100% ACTIVE
- **Auto-Lock compliance:** 100% ACTIVE (Threshold Responsive)
- **Notification Toggles:** 100% PERSISTENT

The INKPlus platform has evolved from a series of pages into a **Sovereign System**—a unified environment where every global setting propagates instantly to all technician nodes.
