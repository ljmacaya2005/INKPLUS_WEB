/* Fully Functional Profile JS integrated with Supabase */

// 1. Tab Slider Logic (Global for onclick access)
window.updateSlider = function (element) {
    const slider = document.getElementById('tabSlider');
    const container = element ? element.closest('.nav-pills-slider') : null;
    if (!slider || !element || !container) return;

    const allTabs = container.querySelectorAll('.nav-link');
    allTabs.forEach(t => t.classList.remove('active'));
    element.classList.add('active');

    // Bulletproof offset traversal for consistent cross-browser dimensions
    let leftPos = 0;
    let topPos = 0;
    let node = element;

    while (node && node !== container && container.contains(node)) {
        leftPos += node.offsetLeft;
        topPos += node.offsetTop;
        node = node.offsetParent;
    }

    // High Precision Positioning
    slider.style.width = element.offsetWidth + 'px';
    slider.style.height = element.offsetHeight + 'px';
    slider.style.transform = `translate(${leftPos}px, ${topPos}px)`;
};

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Slider
    const activeTab = document.querySelector('.nav-pills-slider .nav-link.active') || document.querySelector('.nav-pills-slider .nav-link');
    if (activeTab) {
        setTimeout(() => window.updateSlider(activeTab), 150);
        window.addEventListener('resize', () => {
            const currentActive = document.querySelector('.nav-pills-slider .nav-link.active');
            if (currentActive) window.updateSlider(currentActive);
        });
    }

    // --- Supabase Integration ---

    // UI Elements
    const els = {
        nameDisplay: document.getElementById('userNameDisplay'),
        roleDisplay: document.getElementById('userRoleDisplay'),
        avatar: document.getElementById('userAvatar'),
        emailDisplay: document.getElementById('userEmailDisplay'),
        phoneDisplay: document.getElementById('userPhoneDisplay'),
        tasks: document.getElementById('statTasks'),
        sessions: document.getElementById('statSessions'),
        fName: document.getElementById('profileFirstName'),
        lName: document.getElementById('profileLastName'),
        emailInput: document.getElementById('profileEmail'),
        phoneInput: document.getElementById('profilePhone'),
        bio: document.getElementById('profileBio'),
        headerName: document.getElementById('headerUserName'),
        headerAvatar: document.getElementById('headerUserAvatar')
    };

    // Helper: Wait for Supabase to be ready
    const waitForSupabase = () => {
        return new Promise(resolve => {
            if (window.sb) return resolve(window.sb);
            const interval = setInterval(() => {
                if (window.sb) {
                    clearInterval(interval);
                    resolve(window.sb);
                }
            }, 100);
        });
    };

    try {
        await waitForSupabase();

        // 1. Get User Session
        const { data: { session }, error: sessionError } = await window.sb.auth.getSession();

        if (sessionError || !session) {
            // Check LocalStorage fallback or Redirect
            if (!localStorage.getItem('isLoggedIn')) {
                window.location.replace('index.html');
                return;
            }
        }

        const userId = session?.user?.id || localStorage.getItem('user_id');
        if (!userId) {
            console.error("No user ID found.");
            // Handle edge case where local storage might be missing
            window.location.replace('index.html');
            return;
        }

        // 2. Fetch Profile Data
        const { data: profile, error: profileError } = await window.sb
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile:', profileError);
            Swal.fire('Error', 'Failed to load profile data', 'error');
        }

        // Fill UI with Profile Data
        if (profile) {
            const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User';

            if (els.nameDisplay) els.nameDisplay.textContent = fullName;
            if (els.emailDisplay) els.emailDisplay.textContent = profile.email || session.user.email;
            if (els.phoneDisplay) els.phoneDisplay.textContent = profile.contact_num || '--';

            if (els.fName) els.fName.value = profile.first_name || '';
            if (els.lName) els.lName.value = profile.last_name || '';
            if (els.emailInput) els.emailInput.value = profile.email || session.user.email;
            if (els.phoneInput) els.phoneInput.value = profile.contact_num || '';
            if (els.bio) els.bio.value = profile.bio || '';

            // Avatar Logic
            let avatarUrl;
            if (els.avatar || els.headerAvatar) {
                avatarUrl = profile.profile_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4A90A4&color=fff&size=200`;
                if (els.avatar) els.avatar.src = avatarUrl;
            }

            if (els.headerName) els.headerName.textContent = fullName;
            if (els.headerAvatar) els.headerAvatar.src = avatarUrl;
        } else {
            // If no profile exists yet, use Auth User Meta if available or defaults
            const email = session?.user?.email;
            if (els.emailInput) els.emailInput.value = email;
            if (els.emailDisplay) els.emailDisplay.textContent = email;
        }

        // 3. Fetch Stats (Parallel)
        const loadStats = async () => {
            // Count Jobs (Tasks)
            const { count: jobCount } = await window.sb
                .from('jobs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (els.tasks) els.tasks.textContent = jobCount || '0';

            // Count Sessions
            const { count: sessionCount } = await window.sb
                .from('login_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (els.sessions) els.sessions.textContent = sessionCount || '0';
        };
        loadStats();


        // --- Event Listeners ---

        // Edit Profile Toggle
        const btnEditProfile = document.getElementById('btnEditProfile');
        const btnCancelEdit = document.getElementById('btnCancelEdit');
        const btnSaveProfile = document.getElementById('btnSaveProfile');

        let originalProfileData = {};

        const toggleEditMode = (isEditing) => {
            els.fName.readOnly = !isEditing;
            els.lName.readOnly = !isEditing;
            els.phoneInput.readOnly = !isEditing;
            els.bio.readOnly = !isEditing;

            // Visual feedback for edit mode
            const inputs = [els.fName, els.lName, els.phoneInput, els.bio];
            inputs.forEach(input => {
                if (isEditing) {
                    input.classList.add('bg-body-secondary', 'bg-opacity-10');
                } else {
                    input.classList.remove('bg-body-secondary', 'bg-opacity-10');
                }
            });

            if (isEditing) {
                btnEditProfile.classList.add('d-none');
                btnCancelEdit.classList.remove('d-none');
                btnSaveProfile.classList.remove('d-none');

                // Store original values
                originalProfileData = {
                    fName: els.fName.value,
                    lName: els.lName.value,
                    phoneInput: els.phoneInput.value,
                    bio: els.bio.value
                };

                els.fName.focus(); // Focus first input
            } else {
                btnEditProfile.classList.remove('d-none');
                btnCancelEdit.classList.add('d-none');
                btnSaveProfile.classList.add('d-none');
            }
        };

        if (btnEditProfile && btnCancelEdit) {
            btnEditProfile.addEventListener('click', () => toggleEditMode(true));

            btnCancelEdit.addEventListener('click', () => {
                // Restore original values
                els.fName.value = originalProfileData.fName || '';
                els.lName.value = originalProfileData.lName || '';
                els.phoneInput.value = originalProfileData.phoneInput || '';
                els.bio.value = originalProfileData.bio || '';

                toggleEditMode(false);
            });
        }

        // Save Changes
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const fName = els.fName.value.trim();
                const lName = els.lName.value.trim();
                const phone = els.phoneInput.value.trim();
                const bio = els.bio.value.trim();
                const email = els.emailInput.value.trim(); // Usually readonly but just in case

                // Show Saving State
                const submitBtn = document.getElementById('btnSaveProfile');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
                submitBtn.disabled = true;

                try {
                    // Update or Insert Profile
                    const updates = {
                        user_id: userId,
                        first_name: fName,
                        last_name: lName,
                        email: email, // Ensure email stays synced
                        contact_num: phone,
                        bio: bio,
                        updated_at: new Date()
                    };

                    const { error } = await window.sb
                        .from('profiles')
                        .upsert(updates);

                    if (error) throw error;

                    // Update UI immediately
                    const fullName = `${fName} ${lName}`.trim();
                    if (els.nameDisplay) els.nameDisplay.textContent = fullName;
                    if (els.phoneDisplay) els.phoneDisplay.textContent = phone || '--';
                    if (els.avatar || els.headerAvatar) {
                        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4A90A4&color=fff&size=200`;
                        if (els.avatar) els.avatar.src = avatarUrl;
                        if (els.headerAvatar) els.headerAvatar.src = avatarUrl;
                    }
                    if (els.headerName) els.headerName.textContent = fullName;

                    Swal.fire('Saved', 'Profile information updated successfully.', 'success');
                    toggleEditMode(false); // Switch back to Read Only Mode on success!

                } catch (err) {
                    console.error('Update error:', err);
                    Swal.fire('Error', 'Failed to update profile.', 'error');
                } finally {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        }

        // Change Email Logic (Admin Force Update)
        const changeEmailBtn = document.getElementById('changeEmailBtn');
        if (changeEmailBtn) {
            changeEmailBtn.addEventListener('click', async () => {
                // 1. Get New Email
                const { value: newEmail } = await Swal.fire({
                    title: 'Update Email',
                    text: 'Enter the new email address. This will be updated directly.',
                    input: 'email',
                    inputPlaceholder: 'new.email@example.com',
                    showCancelButton: true,
                    confirmButtonText: 'Next',
                    confirmButtonColor: '#4A90A4',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    inputValidator: (val) => !val && 'Email is required!'
                });

                if (!newEmail) return;

                // 2. Service Key Authorization
                if (!window.SUPABASE_SERVICE_KEY) {
                    const { value: key } = await Swal.fire({
                        title: 'Admin Authorization',
                        text: 'Enter Supabase Service Role Key to bypass verification limits.',
                        input: 'password',
                        showCancelButton: true,
                        confirmButtonText: 'Authorize Update',
                        confirmButtonColor: '#4A90A4',
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)',
                        inputValidator: (val) => !val && 'Service Key is required!'
                    });

                    if (key) window.SUPABASE_SERVICE_KEY = key;
                    else return;
                }

                try {
                    Swal.fire({
                        title: 'Updating...',
                        html: 'Changing email address directly...',
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading(),
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)'
                    });

                    // Initialize Admin Client
                    let adminClient;
                    if (typeof supabase !== 'undefined' && supabase.createClient) {
                        adminClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_SERVICE_KEY);
                    } else if (window.supabase && window.supabase.createClient) {
                        adminClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_SERVICE_KEY);
                    } else {
                        throw new Error("Supabase SDK not loaded.");
                    }

                    // 3. Update Auth User (Direct)
                    const { data: authData, error: authError } = await adminClient.auth.admin.updateUserById(
                        userId,
                        { email: newEmail, email_confirm: true } // Auto-confirm
                    );

                    if (authError) throw authError;

                    // 4. Update Profiles Table
                    const { error: profileUpdateError } = await window.sb
                        .from('profiles')
                        .update({ email: newEmail })
                        .eq('user_id', userId);

                    if (profileUpdateError) console.warn("Profile sync warning:", profileUpdateError);

                    // 5. Success
                    if (els.emailDisplay) els.emailDisplay.textContent = newEmail;
                    if (els.emailInput) els.emailInput.value = newEmail;

                    Swal.fire({
                        title: 'Email Updated',
                        text: `Your email has been changed to ${newEmail}.`,
                        icon: 'success',
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)'
                    });

                } catch (err) {
                    console.error(err);
                    Swal.fire({
                        title: 'Update Failed',
                        text: err.message,
                        icon: 'error',
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)'
                    });
                    if (err.message.includes('401') || err.message.includes('authorized')) {
                        window.SUPABASE_SERVICE_KEY = null;
                    }
                }
            });
        }

        // Change Password Logic (with Current Password Verification)
        const changePassBtn = document.getElementById('changePassBtn');

        // Define Toggle Function Globally for Swal Content
        window.togglePass = function (inputId, btn) {
            const input = document.getElementById(inputId);
            const icon = btn.querySelector('svg');
            if (input.type === "password") {
                input.type = "text";
                // Eye Off Icon
                icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
                btn.classList.add('text-primary');
                btn.classList.remove('text-muted');
            } else {
                input.type = "password";
                // Eye Icon
                icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
                btn.classList.remove('text-primary');
                btn.classList.add('text-muted');
            }
        };

        if (changePassBtn) {
            changePassBtn.addEventListener('click', () => {
                Swal.fire({
                    title: 'Change Password',
                    html: `
                        <div class="text-start mt-2">
                            <!-- Current Password -->
                            <div class="mb-3">
                                <label class="form-label text-secondary small fw-bold">Current Password</label>
                                <div class="input-group">
                                    <input type="password" id="currentPass" class="form-control" placeholder="••••••">
                                    <button class="btn btn-outline-secondary bg-transparent" type="button" tabindex="-1" onclick="window.togglePass('currentPass', this)">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- New Password -->
                            <div class="mb-3">
                                <label class="form-label text-secondary small fw-bold">New Password</label>
                                <div class="input-group">
                                    <input type="password" id="newPass" class="form-control" placeholder="Minimum 6 characters">
                                    <button class="btn btn-outline-secondary bg-transparent" type="button" tabindex="-1" onclick="window.togglePass('newPass', this)">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    </button>
                                </div>
                            </div>

                            <!-- Confirm Password -->
                            <div class="mb-2">
                                <label class="form-label text-secondary small fw-bold">Confirm Password</label>
                                <div class="input-group">
                                    <input type="password" id="confirmPass" class="form-control" placeholder="Re-type new password">
                                    <button class="btn btn-outline-secondary bg-transparent" type="button" tabindex="-1" onclick="window.togglePass('confirmPass', this)">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `,
                    confirmButtonText: 'Save Changes',
                    confirmButtonColor: '#4A90A4',
                    showCancelButton: true,
                    cancelButtonText: 'Cancel',
                    padding: '2rem',
                    customClass: {
                        popup: 'rounded-4 shadow-lg border-0',
                        confirmButton: 'rounded-3 px-4',
                        cancelButton: 'rounded-3 px-4'
                    },
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    preConfirm: async () => {
                        const currentPass = Swal.getPopup().querySelector('#currentPass').value;
                        const newPass = Swal.getPopup().querySelector('#newPass').value;
                        const confirmPass = Swal.getPopup().querySelector('#confirmPass').value;

                        if (!currentPass || !newPass || !confirmPass) {
                            Swal.showValidationMessage('All fields are required');
                            return;
                        }
                        if (newPass !== confirmPass) {
                            Swal.showValidationMessage('New passwords do not match');
                            return;
                        }
                        if (newPass.length < 6) {
                            Swal.showValidationMessage('Password must be at least 6 characters');
                            return;
                        }

                        // Authenticate Old Password First
                        const email = els.emailInput?.value;
                        if (!email) {
                            Swal.showValidationMessage('Error: Could not verify identity (email missing).');
                            return;
                        }

                        try {
                            const { error: signInError } = await window.sb.auth.signInWithPassword({
                                email: email,
                                password: currentPass
                            });

                            if (signInError) {
                                Swal.showValidationMessage('Current password is incorrect.');
                                return;
                            }

                            return { newPass };
                        } catch (err) {
                            Swal.showValidationMessage(`Error: ${err.message}`);
                        }
                    }
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            const { error } = await window.sb.auth.updateUser({
                                password: result.value.newPass
                            });

                            if (error) throw error;

                            Swal.fire({
                                title: 'Success',
                                text: 'Password updated successfully.',
                                icon: 'success',
                                background: 'var(--card-bg)',
                                color: 'var(--text-main)'
                            });
                        } catch (err) {
                            Swal.fire({
                                title: 'Error',
                                text: err.message,
                                icon: 'error',
                                background: 'var(--card-bg)',
                                color: 'var(--text-main)'
                            });
                        }
                    }
                });
            });
        }

        // Sign Out Logic
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', async (e) => {
                e.preventDefault();

                const result = await Swal.fire({
                    title: 'Sign Out?',
                    text: "You will be returned to the login screen.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#dc3545',
                    confirmButtonText: 'Yes, Sign Out'
                });

                if (result.isConfirmed) {
                    try {
                        const userId = localStorage.getItem('user_id');
                        const sessionId = localStorage.getItem('session_record_id');

                        // Mark as offline in users
                        if (userId) {
                            await window.sb.from('users').update({ is_online: false }).eq('user_id', userId);
                        }

                        // Close session record
                        if (sessionId) {
                            await window.sb.from('login_sessions').update({ ended_at: new Date().toISOString() }).eq('id', sessionId);
                        }

                        await window.sb.auth.signOut();
                    } catch (e) {
                        console.warn("Error during sign out DB update", e);
                    }

                    localStorage.clear();
                    window.location.replace('index.html');
                }
            });
        }

    } catch (err) {
        console.error("Initialization Error:", err);
    }
});
