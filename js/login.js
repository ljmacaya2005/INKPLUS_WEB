document.addEventListener('DOMContentLoaded', async () => {
	const splash = document.getElementById('splash');
	const loginCard = document.getElementById('loginCard');
	const uInput = document.getElementById('email');
	const pInput = document.getElementById('password');

	// Clear inputs on load
	if (uInput) uInput.value = '';
	if (pInput) pInput.value = '';

	const waitForSupabase = () => {
		return new Promise(resolve => {
			if (window.sb) return resolve();
			const interval = setInterval(() => {
				if (window.sb) {
					clearInterval(interval);
					resolve();
				}
			}, 100);
		});
	};

	const initializeView = async () => {
		await waitForSupabase();

		// --- IP ALLOWLIST SECURITY GUARD (Real-Time + Fallback) ---
		// The 'GlobalSecurityMonitor' in supabase-config.js handles INSTANT real-time detection.
		// This serves as a secondary sanity check every 5 seconds.


		// Run initial check and then start the persistent guard
		// Run initial check and then start the persistent guard
		const deviceId = window.getPersistentDeviceId();
		const { count: userCount, error: countErr } = await window.sb.from('users').select('*', { count: 'exact', head: true });

		// SYSTEM SETUP BYPASS: If no users exist, allow access to login for initial setup (setup@inkplus.com)
		if (!countErr && userCount > 0) {
			const initialCheck = await window.sb
				.from('ip_allowlist')
				.select('is_active')
				.eq('device_id', deviceId)
				.maybeSingle();

			if (!initialCheck.data || !initialCheck.data.is_active) {
				console.warn("[Security] Terminal not authorized. Redirecting to Security Gate.");
				window.location.replace('index.html');
				return;
			}
		} else if (userCount === 0) {
			console.info("[Security] System is unprovisioned. Bypassing terminal guard for initial setup.");
		}



		let splashEnabled = true;
		let maintenanceMode = false;

		try {
			const { data: config } = await window.sb.from('system_settings').select('*').eq('id', 1).maybeSingle();
			if (config) {
				splashEnabled = config.splash_enabled ?? true;
				maintenanceMode = config.maintenance_mode || false;

				// Global config for login logic
				window.systemConfig = config;
			}
		} catch (e) {
			console.warn("Settings check failed, using defaults.");
		}

		const hideSplash = () => {
			if (splash) splash.classList.add('hidden');
			setTimeout(() => {
				if (loginCard) {
					loginCard.classList.add('show');
					if (uInput) uInput.focus();
				}
			}, 300);
		};

		if (splashEnabled) {
			if (splash) splash.style.display = 'flex'; // Explicitly reveal only if enabled
			const splashDuration = 2200;
			setTimeout(hideSplash, splashDuration);
		} else {
			// If disabled, bypass splash delay and show login card instantly
			if (splash) splash.style.display = 'none';
			if (loginCard) {
				loginCard.classList.add('show');
				if (uInput) uInput.focus();
			}
		}

		// Maintenance Warning
		if (maintenanceMode) {
			Swal.fire({
				toast: true,
				position: 'top',
				icon: 'warning',
				title: 'System Isolation Active',
				text: 'Only Administrative nodes can currently access the platform.',
				showConfirmButton: false,
				timer: 6000
			});
		}
	};

	initializeView();
});

// --- Generic Password Toggle Logic (exposed globally for inline onclicks) ---
window.togglePassword = function (inputId, btn) {
	const input = document.getElementById(inputId);
	if (!input) return;

	const isHidden = input.type === 'password';
	input.type = isHidden ? 'text' : 'password';

	const hiddenIcon = btn.querySelector('.eye-hidden');
	const visibleIcon = btn.querySelector('.eye-visible');

	if (hiddenIcon && visibleIcon) {
		hiddenIcon.style.display = isHidden ? 'none' : 'block';
		visibleIcon.style.display = isHidden ? 'block' : 'none';
	}
};



// Function to show Terms of Service modal using SweetAlert2
function showTermsModal(event) {
	event.preventDefault();
	Swal.fire({
		title: 'Terms of Service',
		html: `<div style="text-align: left; max-height: 400px; overflow-y: auto;">
			<p><strong>1. System Usage:</strong> The INKPlus Scheduling System is designed for managing printing services and printer repair appointments. It is provided "as is" without warranty.</p>
			<p><strong>2. Liability:</strong> INKPlus is not liable for data loss or operational downtime resulting from software errors.</p>
			<p><strong>3. Authorized Access:</strong> Only authorized INKPlus personnel are permitted to access this system. Sharing of credentials is prohibited.</p>
		</div>`,
		icon: 'info',
		confirmButtonText: 'I Understand',
		confirmButtonColor: '#4A90A4'
	});
}

// Function to show Privacy Policy modal using SweetAlert2
function showPrivacyModal(event) {
	event.preventDefault();
	Swal.fire({
		title: 'Privacy Policy',
		html: `<div style="text-align: left; max-height: 400px; overflow-y: auto;">
			<p><strong>1. Data Collection:</strong> We collect operational data such as appointment schedules, customer information, service records, and user login history.</p>
			<p><strong>2. Usage:</strong> Data is used solely for managing printing services, repair appointments, and business operations at INKPlus.</p>
			<p><strong>3. Security:</strong> Data is stored securely and is not shared with third parties. Customer information is kept confidential.</p>
		</div>`,
		icon: 'info',
		confirmButtonText: 'I Understand',
		confirmButtonColor: '#4A90A4'
	});
}

// Function to Open Modal (legacy - kept for compatibility)
function openModal(modalId) {
	document.getElementById(modalId).style.display = "block";
}

// Function to Close Modal (legacy - kept for compatibility)
function closeModal(modalId) {
	document.getElementById(modalId).style.display = "none";
}

// Close Modal if user clicks outside the box (legacy)
window.onclick = function (event) {
	if (event.target.classList.contains('modal')) {
		event.target.style.display = "none";
	}
}

// Fullscreen Toggle Logic
function toggleFullScreen() {
	if (!document.fullscreenElement) {
		document.documentElement.requestFullscreen();
	} else {
		if (document.exitFullscreen) {
			document.exitFullscreen();
		}
	}
}

document.addEventListener('DOMContentLoaded', () => {
	// Refresh Logic for Glass Dock
	const dockRefresh = document.getElementById('fabRefresh');
	if (dockRefresh) {
		dockRefresh.addEventListener('click', (e) => {
			e.preventDefault();
			window.location.reload();
		});
	}

	// Fullscreen Icon update logic
	document.addEventListener('fullscreenchange', () => {
		const btn = document.getElementById('dockFull');
		if (btn) {
			if (document.fullscreenElement) {
				btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';
				btn.title = "Exit Fullscreen";
			} else {
				btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
				btn.title = "Fullscreen";
			}
		}
	});

	// Theme Dock Tooltip logic if needed
});

// Login Handler Function
async function handleLogin(event) {
	event.preventDefault();

	const email = document.getElementById('email').value.trim();
	const password = document.getElementById('password').value; // Read password natively

	// Check for empty fields
	if (!email || !password) {
		Swal.fire({
			title: 'Input Required',
			text: 'Please enter both email and password.',
			icon: 'warning',
			confirmButtonColor: '#7066e0'
		});
		return;
	}

	// Check if Supabase is ready
	if (!window.sb) {
		Swal.fire({
			title: 'System Initializing',
			text: 'Database connection is still establishing. Please wait a moment and try again.',
			icon: 'info',
			timer: 2000,
			showConfirmButton: false
		});
		return;
	}

	// Show Loading State
	const submitBtn = document.querySelector('button[type="submit"]');
	const originalText = submitBtn.innerHTML;
	submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing In...';
	submitBtn.disabled = true;

	try {
		// --- ONE-TIME SYSTEM SETUP BYPASS ---
		const { count, error: countErr } = await window.sb.from('users').select('*', { count: 'exact', head: true });

		if (!countErr && count === 0 && email === 'setup@inkplus.com' && password === 'setup') {
			console.warn("SYSTEM INITIALIZATION OVERRIDE ACTIVATED");

			localStorage.setItem('isLoggedIn', 'true');
			localStorage.setItem('username', 'Setup Administrator');
			localStorage.setItem('sb_token', 'ADMIN_SETUP_OVERRIDE');
			localStorage.setItem('user_id', 'SYSTEM_SETUP_ID');
			localStorage.setItem('session_record_id', 'setup_mode');

			// Trigger Flip Animation instantly
			const flipper = document.getElementById('loginFlipper');
			if (flipper) {
				const successMsgEl = document.getElementById('loginSuccessMessage');
				if (successMsgEl) successMsgEl.textContent = `Welcome, Setup Administrator.`;
				flipper.classList.add('flipped');
			}

			// Show Setup Alert
			Swal.fire({
				title: 'Setup Mode Enabled',
				text: 'Database is empty. Redirecting directly to User Management so you can provision the first global administrator account.',
				icon: 'info',
				timer: 4000,
				showConfirmButton: false,
				didClose: () => {
					window.location.replace('users.html');
				}
			});

			return; // Stop standard login flow
		}
		// --- END SETUP BYPASS ---

		// Attempt Normal Login with Supabase
		const { data, error } = await window.sb.auth.signInWithPassword({
			email: email,
			password: password
		});

		if (error) throw error;

		// --- ACCOUNT STATUS VERIFICATION ---
		// Fetch the user's activation status before allowing entry
		const { data: statusCheck, error: statusErr } = await window.sb
			.from('users')
			.select('is_active')
			.eq('user_id', data.user.id)
			.single();

		if (statusErr || !statusCheck || statusCheck.is_active === false) {
			await window.sb.auth.signOut();
			throw new Error("Your account has been deactivated. Please contact an administrator.");
		}

		// Success Logic
		localStorage.setItem('isLoggedIn', 'true');
		localStorage.setItem('username', email); // Store email as username
		localStorage.setItem('sb_token', data.session.access_token);
		localStorage.setItem('user_id', data.user.id);

		// Update user online status & Session Audit
		try {
			// Fetch current IP for session tracking
			let currentIp = 'Unknown';
			try {
				const ipResponse = await fetch('https://api.ipify.org?format=json');
				const ipData = await ipResponse.json();
				currentIp = ipData.ip;
			} catch (e) { }

			await window.sb.from('users').update({
				is_online: true,
				current_ip: currentIp,
				updated_at: new Date().toISOString()
			}).eq('user_id', data.user.id);

			const { data: sessionData, error: sessErr } = await window.sb.from('login_sessions').insert([{
				user_id: data.user.id
			}]).select('id').single();

			if (sessionData && !sessErr) {
				localStorage.setItem('session_record_id', sessionData.id);
				// Initialize security listeners for the new session
				if (typeof window.initGlobalSecurityMonitor === 'function') {
					window.initGlobalSecurityMonitor();
				}
			}
		} catch (e) {
			console.warn("Failed to update presence status", e);
		}

		// Explicitly Record Login into the Audit Trail (Since logAction isn't loaded here yet)
		try {
			await window.sb.from('audit_logs').insert([{
				user_id: data.user.id,
				signature: 'SESSION_INIT',
				subsystem: 'user.auth',
				payload: { event: 'Secure Login via Credentials' },
				severity: 'info'
			}]);
		} catch (e) {
			// Fail silently over non-critical audittrail block
		}

		// Trigger Flip Animation
		const flipper = document.getElementById('loginFlipper');
		if (flipper) {

			// Fetch user details for the login successful screen
			try {
				const { data: profile } = await window.sb
					.from('profiles')
					.select('first_name, last_name, profile_url')
					.eq('user_id', data.user.id)
					.single();

				if (profile) {
					const firstName = profile.first_name || profile.last_name || 'Administrator';
					const fullNameForAvatar = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin';
					const avatarUrl = profile.profile_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullNameForAvatar)}&background=4A90A4&color=fff&size=100`;

					const successMsgEl = document.getElementById('loginSuccessMessage');
					const successAvatarEl = document.getElementById('loginSuccessAvatar');
					const successSvgEl = document.getElementById('loginSuccessSvg');

					if (successMsgEl) successMsgEl.textContent = `Welcome back, ${firstName}.`;
					if (successAvatarEl && successSvgEl) {
						successSvgEl.classList.add('d-none');
						successAvatarEl.src = avatarUrl;
						successAvatarEl.classList.remove('d-none');
					}
				}
			} catch (err) {
				console.warn("[Login] Could not fetch real profile for success modal", err);
			}

			flipper.classList.add('flipped');
		}

		// Determine Landing Page based on Role
		// We reuse the mapping from dashboard.js logic essentially
		const { data: userRoles } = await window.sb
			.from('users')
			.select('roles(*)')
			.eq('user_id', data.user.id)
			.single();

		let landingPage = 'index.html'; // Fallback

		if (userRoles && userRoles.roles) {
			const perms = Array.isArray(userRoles.roles) ? userRoles.roles[0] : userRoles.roles;
			const rName = perms.role_name;

			// Mapping of Permissions to Pages
			const map = {
				'can_home': 'home.html',
				'can_scheduling': 'scheduling.html',
				'can_jobs': 'jobs.html',
				'can_history': 'history.html',
				'can_sessions': 'sessions.html',
				'can_users': 'users.html',
				'can_actions': 'actions.html',
				'can_settings': 'settings.html'
			};

			// If Admin, go to home.html
			if (rName === 'Administrator' || rName === 'Admin') {
				landingPage = 'home.html';
			} else {
				// Find first allowed page
				// Default to home if allowed, otherwise find first
				landingPage = 'home.html'; // optimistically
				if (!perms['can_home']) {
					// Find the FIRST one they can access
					landingPage = null;
					for (const [perm, page] of Object.entries(map)) {
						if (perms[perm]) {
							landingPage = page;
							break;
						}
					}
					if (!landingPage) landingPage = 'index.html'; // No access at all?
				}
			}
		}

		// Wait for animation + short delay before redirect
		setTimeout(() => {
			window.location.replace(landingPage);
		}, 2000);

	} catch (err) {
		console.error('Login Error:', err);
		// Show Error Alert
		Swal.fire({
			title: 'Login Failed',
			text: err.message || 'Invalid email or password.',
			icon: 'error',
			confirmButtonColor: '#7066e0',
			timer: 3000,
			timerProgressBar: true,
			didClose: () => {
				// Clear password field after error
				const pInput = document.getElementById('password');
				if (pInput) pInput.value = '';
				document.getElementById('email').focus();
			}
		});
	} finally {
		// Reset Button State
		submitBtn.innerHTML = originalText;
		submitBtn.disabled = false;
	}
}


// --- Dynamic Forgot Password Logic ---
function showForgot(event) {
	event.preventDefault();
	const flipper = document.getElementById('loginFlipper');

	// check if forgot face already exists
	let forgotFace = document.querySelector('.login-forgot');

	if (!forgotFace) {
		// Create the element dynamically
		forgotFace = document.createElement('div');
		forgotFace.className = 'login-face login-forgot';
		forgotFace.style.display = 'block'; // Ensure visibility

		// Inner HTML structure
		forgotFace.innerHTML = `
			<div class="login-left">
				<div class="brand mb-4 user-select-none">
					<img src="assets/logo1.png" alt="INKPlus Logo" class="img-fluid user-select-none" style="max-width: 140px;" draggable="false">
				</div>
				<p class="text-center desc mb-4 user-select-none">Reset Password</p>

				<form id="forgotForm" onsubmit="handleForgot(event)">
					<div class="mb-3">
						<label for="resetEmail" class="form-label user-select-none">Email Address</label>
						<input id="resetEmail" type="email" class="form-control" placeholder="Enter your email" required>
					</div>

					<div class="row g-2 mb-3">
						<div class="col-6">
							<label for="resetFName" class="form-label user-select-none small">First Name</label>
							<input id="resetFName" type="text" class="form-control" placeholder="First Name" required>
						</div>
						<div class="col-6">
							<label for="resetLName" class="form-label user-select-none small">Last Name</label>
							<input id="resetLName" type="text" class="form-control" placeholder="Last Name" required>
						</div>
					</div>

					<div class="mb-3">
						<label for="newPass" class="form-label user-select-none">New Password</label>
						<div class="password-wrapper position-relative">
							<input id="newPass" type="password" class="form-control pe-5" placeholder="New Password" required minlength="4">
							<button type="button" class="password-toggle btn p-0 border-0 position-absolute end-0 top-50 translate-middle-y me-3" onclick="window.togglePassword('newPass', this)">
								<svg class="eye-icon eye-hidden" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
								<svg class="eye-icon eye-visible" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
							</button>
						</div>
					</div>

					<div class="mb-3">
						<label for="confirmPass" class="form-label user-select-none">Confirm Password</label>
						<div class="password-wrapper position-relative">
							<input id="confirmPass" type="password" class="form-control pe-5" placeholder="Confirm Password" required>
						</div>
					</div>

					<div class="mb-4">
						<label for="resetReason" class="form-label user-select-none">Reason</label>
						<textarea id="resetReason" class="form-control" rows="1" placeholder="Reason for reset?"></textarea>
					</div>

					<div class="d-grid gap-2">
						<button class="btn btn-primary btn-lg primary" type="submit">Submit Request</button>
						<button class="btn btn-outline-secondary btn-sm mt-1" style="color:var(--login-muted-color); border-color:transparent;" type="button" onclick="showLogin()">Back to Login</button>
					</div>
				</form>
			</div>
		`;

		// Add to DOM
		flipper.appendChild(forgotFace);
	}

	// Hide the 'Success' back face if it exists so it doesn't overlap
	const backFace = document.querySelector('.login-back');
	if (backFace) backFace.style.display = 'none';

	// Show the forgot face
	forgotFace.style.display = 'flex'; // Use flex to center content matching .login-back style

	// Trigger Flip
	// Small timeout to allow DOM insertion if new
	setTimeout(() => {
		flipper.classList.add('flipped');
	}, 10);
}

function showLogin() {
	const flipper = document.getElementById('loginFlipper');
	if (flipper) {
		flipper.classList.remove('flipped');
		flipper.classList.add('flip-back');

		// After transition, can hide or remove the forgot face
		setTimeout(() => {
			flipper.classList.remove('flip-back');
			const forgotFace = document.querySelector('.login-forgot');
			if (forgotFace) forgotFace.style.display = 'none';

			const backFace = document.querySelector('.login-back');
			if (backFace) backFace.style.display = 'flex'; // Restore success face
		}, 850); // Matches animation duration
	}
}

async function handleForgot(event) {
	event.preventDefault();

	const email = document.getElementById('resetEmail').value.trim();
	const fName = document.getElementById('resetFName').value.trim();
	const lName = document.getElementById('resetLName').value.trim();
	const nPass = document.getElementById('newPass').value;
	const cPass = document.getElementById('confirmPass').value;
	const reason = document.getElementById('resetReason').value.trim();

	if (nPass !== cPass) {
		Swal.fire({
			title: 'Mismatch',
			text: 'Passwords do not match.',
			icon: 'warning',
			confirmButtonColor: '#7066e0'
		});
		return;
	}

	// Show Loading State
	const submitBtn = event.target.querySelector('button[type="submit"]');
	const originalText = submitBtn.innerHTML;
	submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verifying...';
	submitBtn.disabled = true;

	try {
		// 1. Verify Identity against 'profiles' table
		if (!window.sb) throw new Error("Database connection not ready.");

		const { data: profile, error: profileError } = await window.sb
			.from('profiles')
			.select('user_id')
			.eq('email', email)
			.ilike('first_name', fName) // Case-insensitive check
			.ilike('last_name', lName)  // Case-insensitive check
			.single();

		if (profileError || !profile) {
			throw new Error("Identity verification failed. No account found matching these details.");
		}


		// 2. Identity Confirmed - Create Recovery Request
		// Security: Encrypt the requested password (AES) so Admin can apply it later.
		// Note: SHA-256 is one-way, but we need to "dehash" (decrypt) it to update the user. using AES here.
		let encryptedPass = null;
		if (typeof CryptoJS !== 'undefined' && window.APP_ENCRYPTION_KEY) {
			encryptedPass = CryptoJS.AES.encrypt(nPass, window.APP_ENCRYPTION_KEY).toString();
		} else {
			console.warn("CryptoJS missing or KEY missing. Password not stored securely.");
			throw new Error("Security libraries not loaded. Please refresh.");
		}

		// Insert into recovery_requests table
		const { error: requestError } = await window.sb
			.from('recovery_requests')
			.insert([{
				user_id: profile.user_id,
				email: email,
				reason: reason || 'Password Reset Request',
				hashed_preferred_pass: encryptedPass, // Storing Encrypted Password
				status: 'pending'
			}]);

		if (requestError) throw requestError;

		Swal.fire({
			title: 'Request Sent',
			text: 'Identity verified. Your password reset request has been forwarded to the Administrator for approval.',
			icon: 'success',
			confirmButtonColor: '#4A90A4'
		}).then((result) => {
			if (result.isConfirmed || result.isDismissed) {
				showLogin();
				const form = document.querySelector('#forgotForm form') || document.getElementById('forgotForm'); // Handle dynamic form selection
				if (form) form.reset();
			}
		});

	} catch (err) {
		console.error('Recovery Error:', err);
		Swal.fire({
			title: 'Verification Failed',
			text: err.message || 'Unable to verify account details.',
			icon: 'error',
			confirmButtonColor: '#7066e0'
		});
	} finally {
		if (submitBtn) { // Check existence
			submitBtn.innerHTML = originalText;
			submitBtn.disabled = false;
		}
	}
}