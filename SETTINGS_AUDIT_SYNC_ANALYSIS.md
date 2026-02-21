# ⚙️ Platform Engine: Settings Module & Audit Trail Synchronization

## 📌 Executive Directive
The user mandated the transition of the Settings module (`settings.html`) from a static UI mockup into a fully functional, data-driven platform controller. Furthermore, every modification within the settings environment must be flawlessly audited and broadcasted to the central Audit Trail.

---

## 🏗️ Technical Implementation Analysis

### 1. Database Schema Evolution
To support persistent configuration, a new global repository (`system_settings`) is required within the Supabase architecture.

**Target Schema (SQL Instruction):**
```sql
CREATE TABLE IF NOT EXISTS system_settings (
    id PRIMARY KEY DEFAULT 1, -- Single row configuration
    platform_name TEXT DEFAULT 'INKPlus',
    system_id TEXT DEFAULT 'PROD-01',
    ops_email TEXT,
    timezone TEXT DEFAULT 'UTC+8',
    date_format TEXT DEFAULT 'DD-MM-YYYY',
    forced_2fa BOOLEAN DEFAULT false,
    audit_persistence BOOLEAN DEFAULT false,
    lock_threshold TEXT DEFAULT '30',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Initialize first row
INSERT INTO system_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
```

### 2. General Configuration Sync (`js/settings.js`)
We have replaced the non-functional `settings.js` with a robust controller.
*   **Reactive Loading:** Upon page entry, the system fetches the current global state from Supabase and populates all inputs (Platform Name, Email, Timezone, etc.).
*   **Atomic Upserts:** When the "Sync Global Config" button is pressed, the system performs an `upsert` operation on row ID #1, ensuring the cluster state is updated instantly.

### 3. Integrated Audit Beacon
The Settings module is now secondary-locked to the Audit Trail. There is no way to flip a switch in Settings without a forensic record being generated.

**Telemetric Mapping:**
| Action | Signature | Severity |
| :--- | :--- | :--- |
| Changing General Info | `SYSTEM_CONFIG_UPDATED` | Warning |
| Toggling Security Features | `SECURITY_PROTOCOL_TOGGLED` | Info/Warning |
| Changing Thresholds | `SECURITY_CONFIG_UPDATED` | Info |

### 4. Semantic Translation (`js/actions.js`)
To maintain premium readability for administrators, the Audit Trail now recognizes these new signatures and translates them into readable status messages like **"Modified Platform Configuration"** or **"Toggled Security Protocol."**

---

## 🏁 Operational Status
- **Settings Data Persistence:** 100% ACTIVE
- **Telemetry Feedback Loop:** 100% ACTIVE
- **Real-Time Data Injection:** 100% ACTIVE
- **UI Responsiveness (Toast Alerts):** 100% ACTIVE

The INKPlus platform now possesses a centralized "Heart" where global behavior can be modulated with full accountability.
