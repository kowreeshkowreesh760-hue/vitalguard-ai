/**
 * VitalGuard AI - Frontend Telemetry & Dashboard Controller
 * Real-Time Telemetry Simulation, Explainable AI Risk Integration,
 * Live Charts, and Hospital EHR Integration Panel.
 */

// ====================================================================
// STATE MANAGEMENT
// ====================================================================

const AppState = {
    currentUser: null,
    isAuthenticated: false,
    currentPatientId: 'VG-1024',
    patients: {},
    currentPatient: null,
    simMode: 'normal',
    isStreaming: false,
    intervalMs: 2500,
    timerId: null,
    audioEnabled: true,
    currentVitals: {
        heart_rate: 76.0,
        spo2: 98.2,
        temperature: 36.8,
        systolic: 120.0,
        diastolic: 80.0
    },
    previousVitals: {
        heart_rate: 76.0,
        spo2: 98.2,
        temperature: 36.8,
        systolic: 120.0,
        diastolic: 80.0
    },
    vitalsHistory: [],
    alerts: [],
    charts: {},
    audioContext: null,
    lastAnalysis: null
};

let isAppInitialized = false;

// ====================================================================
// INITIALIZATION
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initCharts();
    initEventListeners();
    checkAuthStatus();
});

// ====================================================================
// CLINICIAN AUTHENTICATION & SESSION MANAGEMENT
// ====================================================================

function checkAuthStatus() {
    fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
            if (data && data.authenticated && data.user) {
                AppState.currentUser = data.user;
                AppState.isAuthenticated = true;
                updateClinicianDisplay(data.user);
                showDashboard();
                initAppWithSession();
            } else {
                AppState.currentUser = null;
                AppState.isAuthenticated = false;
                showLoginScreen();
            }
        })
        .catch(err => {
            console.warn('Auth check error, defaulting to login gateway:', err);
            showLoginScreen();
        });
}

function showLoginScreen() {
    const loginScreen = document.getElementById('clinicalLoginScreen');
    const appLayout = document.getElementById('appLayout');
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (appLayout) appLayout.classList.add('hidden');
}

function showDashboard() {
    const loginScreen = document.getElementById('clinicalLoginScreen');
    const appLayout = document.getElementById('appLayout');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (appLayout) appLayout.classList.remove('hidden');
}

function updateClinicianDisplay(user) {
    if (!user) return;
    // Header Clinician Pill
    const hdrAvatar = document.getElementById('headerUserAvatar');
    const hdrName = document.getElementById('headerUserName');
    const hdrRole = document.getElementById('headerUserRole');
    if (hdrAvatar) hdrAvatar.textContent = user.avatar || 'CL';
    if (hdrName) hdrName.textContent = user.name || 'Clinician';
    if (hdrRole) hdrRole.textContent = user.role || 'Hospital Staff';

    // Sidebar User Profile Card
    const sbarAvatar = document.getElementById('sidebarUserAvatar');
    const sbarName = document.getElementById('sidebarUserName');
    const sbarDept = document.getElementById('sidebarUserDept');
    if (sbarAvatar) sbarAvatar.textContent = user.avatar || 'CL';
    if (sbarName) sbarName.textContent = user.name || 'Clinician';
    if (sbarDept) sbarDept.textContent = user.department || user.role || 'Hospital Staff';
}

function initAppWithSession() {
    if (!isAppInitialized) {
        isAppInitialized = true;
        fetchPatients(() => {
            loadPatientData(AppState.currentPatientId);
            loadEhrData(AppState.currentPatientId);
            startSimulation();
        });
    } else {
        if (!AppState.isStreaming) {
            startSimulation();
        }
    }
}

function loginWithPreset(presetKey) {
    const errorEl = document.getElementById('loginErrorMessage');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
    }

    const btns = document.querySelectorAll('.btn-demo-role');
    btns.forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.btn-demo-role[data-preset="${presetKey}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: presetKey })
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'success' && data.user) {
            AppState.currentUser = data.user;
            AppState.isAuthenticated = true;
            updateClinicianDisplay(data.user);
            showDashboard();
            initAppWithSession();
            showToast('Clinician Signed In', `Authenticated as ${data.user.name} (${data.user.role})`, 'NORMAL');
        } else {
            if (errorEl) {
                errorEl.textContent = data.message || 'Authentication failed.';
                errorEl.classList.remove('hidden');
            }
        }
    })
    .catch(err => {
        console.warn('Backend login request failed, falling back to local session:', err);
        const fallbackUsers = {
            'dr_arun': { username: 'dr_arun', name: 'Dr. Arun Kumar, MD', role: 'Cardiology Lead', department: 'Cardiology & Intensive Care', station: 'Cardiac ICU Station 1', avatar: 'AK' },
            'nurse_priya': { username: 'nurse_priya', name: 'Nurse Priya, RN', role: 'ICU Specialist', department: 'Critical Care Unit (CCU)', station: 'Central Monitoring Desk 2', avatar: 'PR' },
            'dr_rajesh': { username: 'dr_rajesh', name: 'Dr. Rajesh V, MD', role: 'Emergency Care', department: 'Trauma & Emergency Care', station: 'ER Trauma Bay 3', avatar: 'RV' }
        };
        const u = fallbackUsers[presetKey] || fallbackUsers['dr_arun'];
        AppState.currentUser = u;
        AppState.isAuthenticated = true;
        updateClinicianDisplay(u);
        showDashboard();
        initAppWithSession();
        showToast('Clinician Signed In', `Authenticated as ${u.name} (Demo Mode)`, 'NORMAL');
    });
}

function handleLoginSubmit(e) {
    if (e) e.preventDefault();
    const errorEl = document.getElementById('loginErrorMessage');
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const submitBtn = document.getElementById('btnLoginSubmit');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!username || !password) {
        if (errorEl) {
            errorEl.textContent = 'Please enter both clinician ID/username and password.';
            errorEl.classList.remove('hidden');
        }
        return;
    }

    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
    }
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>⏳</span><span>Verifying Credentials…</span>';
    }

    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(r => r.json())
    .then(data => {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-login-icon">🔐</span><span>Sign In to Clinical Station</span>';
        }
        if (data.status === 'success' && data.user) {
            AppState.currentUser = data.user;
            AppState.isAuthenticated = true;
            updateClinicianDisplay(data.user);
            showDashboard();
            initAppWithSession();
            showToast('Clinician Signed In', `Authenticated as ${data.user.name}`, 'NORMAL');
            if (passwordInput) passwordInput.value = '';
        } else {
            if (errorEl) {
                errorEl.textContent = data.message || 'Invalid clinician credentials.';
                errorEl.classList.remove('hidden');
            }
        }
    })
    .catch(err => {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-login-icon">🔐</span><span>Sign In to Clinical Station</span>';
        }
        if (errorEl) {
            errorEl.textContent = 'Server connection error during authentication.';
            errorEl.classList.remove('hidden');
        }
    });
}

function handleLogout() {
    pauseSimulation();
    fetch('/api/auth/logout', { method: 'POST' })
        .then(r => r.json())
        .finally(() => {
            AppState.currentUser = null;
            AppState.isAuthenticated = false;
            showLoginScreen();
            showToast('Clinician Signed Out', 'Clinical terminal session safely closed.', 'NORMAL');
        });
}

// ====================================================================
// DIGITAL CLOCK
// ====================================================================

function initClock() {
    const clockEl = document.getElementById('clockTime');
    function update() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    }
    update();
    setInterval(update, 1000);
}

// ====================================================================
// AUDIO ALARM (Web Audio API — zero external files)
// ====================================================================

function playAlertChime(severity) {
    if (!AppState.audioEnabled) return;
    try {
        if (!AppState.audioContext) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) AppState.audioContext = new AudioCtx();
        }
        if (!AppState.audioContext) return;
        if (AppState.audioContext.state === 'suspended') AppState.audioContext.resume();

        const ctx = AppState.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (severity === 'CRITICAL') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.28);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.22);
        }
    } catch (e) { /* silent: browser autoplay policy */ }
}

// ====================================================================
// EVENT LISTENERS & NAVIGATION
// ====================================================================

function initEventListeners() {
    // ---- 1. Sidebar Section Navigation ----
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetId = btn.getAttribute('data-section');
            document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
            const sec = document.getElementById(targetId);
            if (sec) sec.classList.add('active');

            const label = btn.querySelector('.nav-label')?.textContent || 'Dashboard';
            document.getElementById('pageTitle').textContent = label;
            document.getElementById('appSidebar').classList.remove('sidebar-open');

            // Refresh EHR page when navigating to it
            if (targetId === 'section-ehr') {
                loadEhrData(AppState.currentPatientId);
            }
        });
    });

    // Mobile sidebar
    document.getElementById('sidebarToggle').addEventListener('click', () => {
        document.getElementById('appSidebar').classList.toggle('sidebar-open');
    });

    // ---- 2. Quick Patient Switcher ----
    document.getElementById('quickPatientSelect').addEventListener('change', (e) => {
        switchPatient(e.target.value);
    });

    // ---- 3. Audio Toggle ----
    document.getElementById('btnAudioToggle').addEventListener('click', () => {
        AppState.audioEnabled = !AppState.audioEnabled;
        document.getElementById('audioIcon').textContent = AppState.audioEnabled ? '🔊' : '🔇';
    });

    // ---- 4. Simulation Mode Buttons ----
    const btnNormal   = document.getElementById('btnSimNormal');
    const btnWarning  = document.getElementById('btnSimWarning');
    const btnCritical = document.getElementById('btnSimCritical');

    function setActiveSimBtn(active) {
        [btnNormal, btnWarning, btnCritical].forEach(b => b.classList.remove('active'));
        active.classList.add('active');
    }

    btnNormal.addEventListener('click', () => {
        AppState.simMode = 'normal';
        setActiveSimBtn(btnNormal);
        updateSimBadge('🟢 NORMAL', 'badge-normal');
    });
    btnWarning.addEventListener('click', () => {
        AppState.simMode = 'warning';
        setActiveSimBtn(btnWarning);
        updateSimBadge('🟡 WARNING', 'badge-warning');
    });
    btnCritical.addEventListener('click', () => {
        AppState.simMode = 'critical';
        setActiveSimBtn(btnCritical);
        updateSimBadge('🔴 CRITICAL', 'badge-critical');
    });

    // ---- 5. Pause / Resume ----
    document.getElementById('btnPauseResume').addEventListener('click', () => {
        AppState.isStreaming ? pauseSimulation() : startSimulation();
    });

    // ---- 6. Reset ----
    document.getElementById('btnReset').addEventListener('click', resetPatientState);

    // ---- 7. Sim Speed ----
    document.getElementById('simSpeedSelect').addEventListener('change', (e) => {
        AppState.intervalMs = parseInt(e.target.value, 10);
        if (AppState.isStreaming) startSimulation();
    });

    // ---- 8. Toast Close ----
    document.getElementById('toastCloseBtn').addEventListener('click', () => {
        document.getElementById('alertToast').classList.add('hidden');
    });

    // ---- 9. Architecture Modal ----
    const archModal = document.getElementById('architectureModal');
    document.getElementById('btnOpenArchitecture').addEventListener('click', () => archModal.classList.remove('hidden'));
    document.getElementById('btnCloseModal').addEventListener('click', () => archModal.classList.add('hidden'));
    document.getElementById('btnCloseModalBtn').addEventListener('click', () => archModal.classList.add('hidden'));
    archModal.addEventListener('click', e => { if (e.target === archModal) archModal.classList.add('hidden'); });

    // ---- 10. History Table Filters ----
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterHistoryTable(btn.getAttribute('data-filter'));
        });
    });

    // ---- 11. View-All Shortcuts ----
    document.getElementById('btnViewAllAlerts').addEventListener('click', () => document.getElementById('navAlerts').click());
    document.getElementById('btnViewAllHistory').addEventListener('click', () => document.getElementById('navHistory').click());

    // ---- 12. Clear Alerts ----
    document.getElementById('btnClearAlerts').addEventListener('click', () => {
        document.getElementById('alertsFullFeed').innerHTML = '<div class="empty-feed-placeholder"><span>Display cleared. New events will appear here.</span></div>';
    });

    // ---- 13. Export CSV ----
    document.getElementById('btnExportCsv').addEventListener('click', exportHistoryCsv);

    // ---- 14. EHR: Sync button (dashboard card) ----
    const btnSyncEhr = document.getElementById('btnSyncEhr');
    if (btnSyncEhr) {
        btnSyncEhr.addEventListener('click', () => syncToEhr());
    }
    // Full-section EHR Sync button
    const btnSyncEhrFull = document.getElementById('btnSyncEhrFull');
    if (btnSyncEhrFull) {
        btnSyncEhrFull.addEventListener('click', () => syncToEhr());
    }

    // ---- 15. EHR: View Records buttons (open modal) ----
    const btnViewEhr = document.getElementById('btnViewEhrRecords');
    if (btnViewEhr) btnViewEhr.addEventListener('click', openEhrModal);

    const btnViewEhrFull = document.getElementById('btnViewEhrRecordsFull');
    if (btnViewEhrFull) btnViewEhrFull.addEventListener('click', openEhrModal);

    // ---- 16. EHR Records Modal Close ----
    const ehrModal = document.getElementById('ehrRecordsModal');
    if (ehrModal) {
        const closeEhrModal = () => ehrModal.classList.add('hidden');
        const btnClose1 = document.getElementById('btnCloseEhrModal');
        const btnClose2 = document.getElementById('btnCloseEhrModalFooter');
        if (btnClose1) btnClose1.addEventListener('click', closeEhrModal);
        if (btnClose2) btnClose2.addEventListener('click', closeEhrModal);
        ehrModal.addEventListener('click', e => { if (e.target === ehrModal) closeEhrModal(); });
    }

    // ---- 17. EHR Modal Tabs ----
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.getAttribute('data-tab');
            document.querySelectorAll('.modal-tab-panel').forEach(p => p.classList.remove('active'));
            const panel = document.getElementById(target);
            if (panel) panel.classList.add('active');
        });
    });

    // ---- 18. Copy FHIR JSON ----
    const copyFhirBtn = document.getElementById('btnCopyFhirJson');
    if (copyFhirBtn) {
        copyFhirBtn.addEventListener('click', () => {
            const code = document.getElementById('ehrFhirJsonDisplay')?.textContent || '';
            navigator.clipboard.writeText(code).then(() => {
                copyFhirBtn.textContent = '✅ Copied!';
                setTimeout(() => { copyFhirBtn.textContent = '📋 Copy FHIR JSON'; }, 2000);
            }).catch(() => {});
        });
    }

    // ---- 19. Add Patient Modal Controls ----
    const addPatientModal = document.getElementById('addPatientModal');
    const openAddPatient = () => {
        if (addPatientModal) {
            const errBox = document.getElementById('addPatientError');
            if (errBox) errBox.classList.add('hidden');
            addPatientModal.classList.remove('hidden');
            const nameInput = document.getElementById('newPatientName');
            if (nameInput) setTimeout(() => nameInput.focus(), 80);
        }
    };
    const closeAddPatient = () => {
        if (addPatientModal) addPatientModal.classList.add('hidden');
    };

    const btnHeaderAdd = document.getElementById('btnHeaderAddPatient');
    if (btnHeaderAdd) btnHeaderAdd.addEventListener('click', openAddPatient);

    const btnRosterAdd = document.getElementById('btnOpenAddPatientModal');
    if (btnRosterAdd) btnRosterAdd.addEventListener('click', openAddPatient);

    const btnCloseAdd = document.getElementById('btnCloseAddPatientModal');
    if (btnCloseAdd) btnCloseAdd.addEventListener('click', closeAddPatient);

    const btnCancelAdd = document.getElementById('btnCancelAddPatient');
    if (btnCancelAdd) btnCancelAdd.addEventListener('click', closeAddPatient);

    if (addPatientModal) {
        addPatientModal.addEventListener('click', e => {
            if (e.target === addPatientModal) closeAddPatient();
        });
    }

    // Baseline Presets Handler
    const presets = {
        normal: { hrMin: 65, hrMax: 85, spo2Min: 96, spo2Max: 99, tempMin: 36.5, tempMax: 37.2, sysMin: 115, sysMax: 125, diaMin: 75, diaMax: 82 },
        athlete: { hrMin: 48, hrMax: 65, spo2Min: 97, spo2Max: 100, tempMin: 36.4, tempMax: 37.0, sysMin: 105, sysMax: 118, diaMin: 65, diaMax: 75 },
        hypertensive: { hrMin: 75, hrMax: 95, spo2Min: 94, spo2Max: 98, tempMin: 36.6, tempMax: 37.4, sysMin: 135, sysMax: 155, diaMin: 88, diaMax: 98 },
        pediatric: { hrMin: 85, hrMax: 115, spo2Min: 97, spo2Max: 100, tempMin: 36.6, tempMax: 37.4, sysMin: 95, sysMax: 110, diaMin: 60, diaMax: 72 }
    };

    document.querySelectorAll('.preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const key = chip.getAttribute('data-preset');
            const p = presets[key];
            if (p) {
                document.getElementById('baseHrMin').value = p.hrMin;
                document.getElementById('baseHrMax').value = p.hrMax;
                document.getElementById('baseSpo2Min').value = p.spo2Min;
                document.getElementById('baseSpo2Max').value = p.spo2Max;
                document.getElementById('baseTempMin').value = p.tempMin;
                document.getElementById('baseTempMax').value = p.tempMax;
                document.getElementById('baseSysMin').value = p.sysMin;
                document.getElementById('baseSysMax').value = p.sysMax;
                document.getElementById('baseDiaMin').value = p.diaMin;
                document.getElementById('baseDiaMax').value = p.diaMax;
            }
        });
    });

    // Add Patient Form Submit
    const formAdd = document.getElementById('addPatientForm');
    if (formAdd) {
        formAdd.addEventListener('submit', handleAddPatientSubmit);
    }

    // ---- 20. Edit & Delete Patient Controls ----
    const btnBannerEdit = document.getElementById('btnEditActivePatient');
    if (btnBannerEdit) {
        btnBannerEdit.addEventListener('click', () => openEditPatientModal(AppState.currentPatientId));
    }
    const btnBannerDelete = document.getElementById('btnDeleteActivePatient');
    if (btnBannerDelete) {
        btnBannerDelete.addEventListener('click', () => openDeleteConfirmModal(AppState.currentPatientId));
    }

    // Edit modal close
    const editModal = document.getElementById('editPatientModal');
    const closeEditModal = () => { if (editModal) editModal.classList.add('hidden'); };
    const btnCloseEdit = document.getElementById('btnCloseEditPatientModal');
    if (btnCloseEdit) btnCloseEdit.addEventListener('click', closeEditModal);
    const btnCancelEdit = document.getElementById('btnCancelEditPatient');
    if (btnCancelEdit) btnCancelEdit.addEventListener('click', closeEditModal);
    if (editModal) {
        editModal.addEventListener('click', e => { if (e.target === editModal) closeEditModal(); });
    }

    // Edit form preset chips
    document.querySelectorAll('.edit-preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.edit-preset-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const key = chip.getAttribute('data-preset');
            const p = presets[key];
            if (p) {
                document.getElementById('editBaseHrMin').value = p.hrMin;
                document.getElementById('editBaseHrMax').value = p.hrMax;
                document.getElementById('editBaseSpo2Min').value = p.spo2Min;
                document.getElementById('editBaseSpo2Max').value = p.spo2Max;
                document.getElementById('editBaseTempMin').value = p.tempMin;
                document.getElementById('editBaseTempMax').value = p.tempMax;
                document.getElementById('editBaseSysMin').value = p.sysMin;
                document.getElementById('editBaseSysMax').value = p.sysMax;
                document.getElementById('editBaseDiaMin').value = p.diaMin;
                document.getElementById('editBaseDiaMax').value = p.diaMax;
            }
        });
    });

    // Edit form submission
    const formEdit = document.getElementById('editPatientForm');
    if (formEdit) {
        formEdit.addEventListener('submit', handleEditPatientSubmit);
    }

    // Delete modal close & confirm
    const deleteModal = document.getElementById('deleteConfirmModal');
    const closeDeleteModal = () => { if (deleteModal) deleteModal.classList.add('hidden'); };
    const btnCloseDel = document.getElementById('btnCloseDeleteModal');
    if (btnCloseDel) btnCloseDel.addEventListener('click', closeDeleteModal);
    const btnCancelDel = document.getElementById('btnCancelDeletePatient');
    if (btnCancelDel) btnCancelDel.addEventListener('click', closeDeleteModal);
    if (deleteModal) {
        deleteModal.addEventListener('click', e => { if (e.target === deleteModal) closeDeleteModal(); });
    }

    const btnConfirmDel = document.getElementById('btnConfirmDeletePatient');
    if (btnConfirmDel) {
        btnConfirmDel.addEventListener('click', handleConfirmDeletePatient);
    }

    // ---- 21. Clinician Authentication & Demo Roles ----
    // 1-Click Fast Hackathon Demo Login Presets
    document.querySelectorAll('.btn-demo-role').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.getAttribute('data-preset');
            if (preset) loginWithPreset(preset);
        });
    });

    // Custom Credentials Form Submit
    const loginForm = document.getElementById('clinicalLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    // Toggle Password Visibility in Login Form
    const btnToggleLoginPwd = document.getElementById('btnToggleLoginPwd');
    if (btnToggleLoginPwd) {
        btnToggleLoginPwd.addEventListener('click', () => {
            const pwdInput = document.getElementById('loginPassword');
            if (!pwdInput) return;
            if (pwdInput.type === 'password') {
                pwdInput.type = 'text';
                btnToggleLoginPwd.textContent = '🙈';
            } else {
                pwdInput.type = 'password';
                btnToggleLoginPwd.textContent = '👁️';
            }
        });
    }

    // Logout Buttons (Header Pill & Sidebar Card)
    const btnLogoutHeader = document.getElementById('btnLogoutHeader');
    if (btnLogoutHeader) {
        btnLogoutHeader.addEventListener('click', handleLogout);
    }
    const btnLogoutSidebar = document.getElementById('btnLogoutSidebar');
    if (btnLogoutSidebar) {
        btnLogoutSidebar.addEventListener('click', handleLogout);
    }
}

function handleAddPatientSubmit(e) {
    e.preventDefault();
    const errBox = document.getElementById('addPatientError');
    if (errBox) { errBox.classList.add('hidden'); errBox.textContent = ''; }

    const name = (document.getElementById('newPatientName')?.value || '').trim();
    const age = parseInt(document.getElementById('newPatientAge')?.value, 10);
    const gender = document.getElementById('newPatientGender')?.value || 'Female';
    const notes = (document.getElementById('newPatientNotes')?.value || '').trim();

    const hrMin = parseFloat(document.getElementById('baseHrMin')?.value);
    const hrMax = parseFloat(document.getElementById('baseHrMax')?.value);
    const spo2Min = parseFloat(document.getElementById('baseSpo2Min')?.value);
    const spo2Max = parseFloat(document.getElementById('baseSpo2Max')?.value);
    const tempMin = parseFloat(document.getElementById('baseTempMin')?.value);
    const tempMax = parseFloat(document.getElementById('baseTempMax')?.value);
    const sysMin = parseFloat(document.getElementById('baseSysMin')?.value);
    const sysMax = parseFloat(document.getElementById('baseSysMax')?.value);
    const diaMin = parseFloat(document.getElementById('baseDiaMin')?.value);
    const diaMax = parseFloat(document.getElementById('baseDiaMax')?.value);

    if (!name) {
        showAddPatientError('Please provide the patient\'s full name.');
        return;
    }
    if (isNaN(age) || age <= 0 || age > 130) {
        showAddPatientError('Please provide a valid age between 1 and 130.');
        return;
    }
    if (isNaN(hrMin) || isNaN(hrMax) || hrMin >= hrMax || hrMin < 30 || hrMax > 220) {
        showAddPatientError('Invalid Heart Rate bounds (Min must be < Max, between 30 and 220 BPM).');
        return;
    }
    if (isNaN(spo2Min) || isNaN(spo2Max) || spo2Min >= spo2Max || spo2Min < 70 || spo2Max > 100) {
        showAddPatientError('Invalid SpO2 bounds (Min must be < Max, between 70% and 100%).');
        return;
    }
    if (isNaN(tempMin) || isNaN(tempMax) || tempMin >= tempMax || tempMin < 34.0 || tempMax > 43.0) {
        showAddPatientError('Invalid Temperature bounds (Min must be < Max, between 34°C and 43°C).');
        return;
    }
    if (isNaN(sysMin) || isNaN(sysMax) || sysMin >= sysMax || sysMin < 60 || sysMax > 240) {
        showAddPatientError('Invalid Systolic BP bounds (Min must be < Max, between 60 and 240 mmHg).');
        return;
    }
    if (isNaN(diaMin) || isNaN(diaMax) || diaMin >= diaMax || diaMin < 40 || diaMax > 160) {
        showAddPatientError('Invalid Diastolic BP bounds (Min must be < Max, between 40 and 160 mmHg).');
        return;
    }

    const payload = {
        name, age, gender, notes,
        baseline_hr_min: hrMin, baseline_hr_max: hrMax,
        baseline_spo2_min: spo2Min, baseline_spo2_max: spo2Max,
        baseline_temp_min: tempMin, baseline_temp_max: tempMax,
        baseline_sys_min: sysMin, baseline_sys_max: sysMax,
        baseline_dia_min: diaMin, baseline_dia_max: diaMax
    };

    const submitBtn = document.getElementById('btnSubmitAddPatient');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>⏳</span> Registering...';
    }

    fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(({ status, body }) => {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>🚀</span> Register &amp; Start Monitoring';
        }

        if (status !== 201 || body.status !== 'success') {
            showAddPatientError(body.message || 'Failed to register patient.');
            return;
        }

        const newPatient = body.patient;
        AppState.patients[newPatient.patient_id] = newPatient;

        // Update UI
        updatePatientDropdown(newPatient.patient_id);
        renderPatientsRoster(Object.values(AppState.patients));
        updatePatientCountBadge();

        // Switch to the newly created patient
        switchPatient(newPatient.patient_id);

        // Reset and close modal
        const modal = document.getElementById('addPatientModal');
        if (modal) modal.classList.add('hidden');
        const form = document.getElementById('addPatientForm');
        if (form) form.reset();

        // Reset to normal preset highlight
        document.querySelectorAll('.preset-chip').forEach(c => {
            c.classList.toggle('active', c.getAttribute('data-preset') === 'normal');
        });

        // Show success alert toast
        showToast('Patient Registered', `✅ ${newPatient.name} (${newPatient.patient_id}) added! Live telemetry active.`, 'NORMAL');

        // Automatically switch view to Dashboard
        const navDash = document.getElementById('navDashboard');
        if (navDash) navDash.click();
    })
    .catch(err => {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>🚀</span> Register &amp; Start Monitoring';
        }
        showAddPatientError('Connection error: ' + err.message);
    });
}

function showAddPatientError(msg) {
    const errBox = document.getElementById('addPatientError');
    if (errBox) {
        errBox.textContent = '⚠️ ' + msg;
        errBox.classList.remove('hidden');
    }
}

// ====================================================================
// EDIT & DELETE PATIENT LOGIC
// ====================================================================

function openEditPatientModal(patientId) {
    const p = AppState.patients[patientId];
    if (!p) return;

    document.getElementById('editPatientId').value = p.patient_id;
    document.getElementById('editPatientName').value = p.name;
    document.getElementById('editPatientAge').value = p.age;
    document.getElementById('editPatientGender').value = p.gender || 'Female';
    document.getElementById('editPatientNotes').value = p.notes || '';

    document.getElementById('editBaseHrMin').value = p.baseline_hr_min;
    document.getElementById('editBaseHrMax').value = p.baseline_hr_max;
    document.getElementById('editBaseSpo2Min').value = p.baseline_spo2_min;
    document.getElementById('editBaseSpo2Max').value = p.baseline_spo2_max;
    document.getElementById('editBaseTempMin').value = p.baseline_temp_min;
    document.getElementById('editBaseTempMax').value = p.baseline_temp_max;
    document.getElementById('editBaseSysMin').value = p.baseline_sys_min;
    document.getElementById('editBaseSysMax').value = p.baseline_sys_max;
    document.getElementById('editBaseDiaMin').value = p.baseline_dia_min;
    document.getElementById('editBaseDiaMax').value = p.baseline_dia_max;

    const errBox = document.getElementById('editPatientError');
    if (errBox) errBox.classList.add('hidden');

    // Reset edit preset chips
    document.querySelectorAll('.edit-preset-chip').forEach(c => c.classList.remove('active'));

    const modal = document.getElementById('editPatientModal');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => document.getElementById('editPatientName')?.focus(), 80);
    }
}

function handleEditPatientSubmit(e) {
    e.preventDefault();
    const patientId = document.getElementById('editPatientId')?.value;
    if (!patientId) return;

    const name = (document.getElementById('editPatientName')?.value || '').trim();
    const age = parseInt(document.getElementById('editPatientAge')?.value, 10);
    const gender = document.getElementById('editPatientGender')?.value || 'Female';
    const notes = (document.getElementById('editPatientNotes')?.value || '').trim();

    const hrMin = parseFloat(document.getElementById('editBaseHrMin')?.value);
    const hrMax = parseFloat(document.getElementById('editBaseHrMax')?.value);
    const spo2Min = parseFloat(document.getElementById('editBaseSpo2Min')?.value);
    const spo2Max = parseFloat(document.getElementById('editBaseSpo2Max')?.value);
    const tempMin = parseFloat(document.getElementById('editBaseTempMin')?.value);
    const tempMax = parseFloat(document.getElementById('editBaseTempMax')?.value);
    const sysMin = parseFloat(document.getElementById('editBaseSysMin')?.value);
    const sysMax = parseFloat(document.getElementById('editBaseSysMax')?.value);
    const diaMin = parseFloat(document.getElementById('editBaseDiaMin')?.value);
    const diaMax = parseFloat(document.getElementById('editBaseDiaMax')?.value);

    const errBox = document.getElementById('editPatientError');
    const showErr = (msg) => {
        if (errBox) { errBox.textContent = '⚠️ ' + msg; errBox.classList.remove('hidden'); }
    };

    if (!name) return showErr('Patient name cannot be empty.');
    if (isNaN(age) || age <= 0 || age > 130) return showErr('Please provide a valid age between 1 and 130.');
    if (isNaN(hrMin) || isNaN(hrMax) || hrMin >= hrMax || hrMin < 30 || hrMax > 220) return showErr('Invalid Heart Rate bounds.');
    if (isNaN(spo2Min) || isNaN(spo2Max) || spo2Min >= spo2Max || spo2Min < 70 || spo2Max > 100) return showErr('Invalid SpO2 bounds.');
    if (isNaN(tempMin) || isNaN(tempMax) || tempMin >= tempMax || tempMin < 34.0 || tempMax > 43.0) return showErr('Invalid Temperature bounds.');
    if (isNaN(sysMin) || isNaN(sysMax) || sysMin >= sysMax || sysMin < 60 || sysMax > 240) return showErr('Invalid Systolic BP bounds.');
    if (isNaN(diaMin) || isNaN(diaMax) || diaMin >= diaMax || diaMin < 40 || diaMax > 160) return showErr('Invalid Diastolic BP bounds.');

    const payload = {
        name, age, gender, notes,
        baseline_hr_min: hrMin, baseline_hr_max: hrMax,
        baseline_spo2_min: spo2Min, baseline_spo2_max: spo2Max,
        baseline_temp_min: tempMin, baseline_temp_max: tempMax,
        baseline_sys_min: sysMin, baseline_sys_max: sysMax,
        baseline_dia_min: diaMin, baseline_dia_max: diaMax
    };

    const submitBtn = document.getElementById('btnSubmitEditPatient');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span>⏳</span> Saving...'; }

    fetch(`/api/patient/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(({ status, body }) => {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span>💾</span> Save Changes'; }
        if (status !== 200 || body.status !== 'success') {
            showErr(body.message || 'Failed to update patient.');
            return;
        }

        const updated = body.patient;
        AppState.patients[updated.patient_id] = updated;

        // Update UI
        updatePatientDropdown(updated.patient_id);
        renderPatientsRoster(Object.values(AppState.patients));

        // If updated patient is active, reload active view
        if (AppState.currentPatientId === updated.patient_id) {
            loadPatientData(updated.patient_id);
        }

        // Close modal
        document.getElementById('editPatientModal').classList.add('hidden');
        showToast('Profile Updated', `✅ ${updated.name} (${updated.patient_id}) baselines updated!`, 'NORMAL');
    })
    .catch(err => {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span>💾</span> Save Changes'; }
        showErr('Network error: ' + err.message);
    });
}

let patientIdToDelete = null;

function openDeleteConfirmModal(patientId) {
    if (Object.keys(AppState.patients).length <= 1) {
        showToast('Action Disallowed', '⚠️ Cannot delete the only remaining patient in the system.', 'WARNING');
        return;
    }

    const p = AppState.patients[patientId];
    if (!p) return;

    patientIdToDelete = patientId;
    document.getElementById('deletePatientNameDisplay').textContent = p.name;
    document.getElementById('deletePatientIdDisplay').textContent = p.patient_id;
    const errBox = document.getElementById('deletePatientError');
    if (errBox) errBox.classList.add('hidden');

    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.classList.remove('hidden');
}

function handleConfirmDeletePatient() {
    if (!patientIdToDelete) return;
    const patientId = patientIdToDelete;
    const btn = document.getElementById('btnConfirmDeletePatient');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span>⏳</span> Deleting...'; }

    fetch(`/api/patient/${patientId}`, { method: 'DELETE' })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(({ status, body }) => {
        if (btn) { btn.disabled = false; btn.innerHTML = '<span>🗑️</span> Yes, Delete Patient'; }

        if (status !== 200 || body.status !== 'success') {
            const errBox = document.getElementById('deletePatientError');
            if (errBox) {
                errBox.textContent = '⚠️ ' + (body.message || 'Failed to delete patient.');
                errBox.classList.remove('hidden');
            }
            return;
        }

        // Close modal
        document.getElementById('deleteConfirmModal').classList.add('hidden');
        const deletedName = AppState.patients[patientId]?.name || patientId;
        delete AppState.patients[patientId];

        updatePatientCountBadge();

        // Switch to next patient if current patient was deleted
        const remainingIds = Object.keys(AppState.patients);
        const nextId = body.next_patient_id || remainingIds[0];

        updatePatientDropdown(nextId);
        renderPatientsRoster(Object.values(AppState.patients));

        if (AppState.currentPatientId === patientId && nextId) {
            switchPatient(nextId);
        }

        showToast('Patient Deleted', `🗑️ Patient ${deletedName} (${patientId}) removed.`, 'NORMAL');
        patientIdToDelete = null;
    })
    .catch(err => {
        if (btn) { btn.disabled = false; btn.innerHTML = '<span>🗑️</span> Yes, Delete Patient'; }
        const errBox = document.getElementById('deletePatientError');
        if (errBox) { errBox.textContent = '⚠️ Connection error: ' + err.message; errBox.classList.remove('hidden'); }
    });
}

function updatePatientDropdown(selectedId) {
    const sel = document.getElementById('quickPatientSelect');
    if (!sel) return;
    const currentVal = selectedId || sel.value || AppState.currentPatientId;
    sel.innerHTML = '';
    Object.values(AppState.patients).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.patient_id;
        opt.textContent = `${p.name} (${p.patient_id})`;
        if (p.patient_id === currentVal) opt.selected = true;
        sel.appendChild(opt);
    });
}

function updatePatientCountBadge() {
    const badge = document.getElementById('patientCountBadge');
    if (badge) {
        badge.textContent = Object.keys(AppState.patients).length;
    }
}

function updateSimBadge(text, className) {
    const badge = document.getElementById('currentSimBadge');
    badge.textContent = text;
    badge.className = `mode-badge ${className}`;
}

// ====================================================================
// DATA FETCHING & PATIENT SWITCHING
// ====================================================================

function fetchPatients(callback) {
    fetch('/api/patients')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                data.patients.forEach(p => { AppState.patients[p.patient_id] = p; });
                updatePatientDropdown();
                updatePatientCountBadge();
                renderPatientsRoster(data.patients);
                if (callback) callback();
            }
        })
        .catch(err => {
            console.warn('Backend unavailable, using offline fallback.', err);
            showOfflineBanner(true);
            AppState.patients = {
                'VG-1024': {
                    patient_id: 'VG-1024', name: 'John Anderson', age: 45, gender: 'Male',
                    baseline_hr_min: 70, baseline_hr_max: 85,
                    baseline_spo2_min: 96, baseline_spo2_max: 99,
                    baseline_temp_min: 36.5, baseline_temp_max: 37.2,
                    baseline_sys_min: 115, baseline_sys_max: 125,
                    baseline_dia_min: 75, baseline_dia_max: 82
                },
                'VG-1025': {
                    patient_id: 'VG-1025', name: 'Sarah Williams', age: 39, gender: 'Female',
                    baseline_hr_min: 65, baseline_hr_max: 80,
                    baseline_spo2_min: 97, baseline_spo2_max: 99,
                    baseline_temp_min: 36.4, baseline_temp_max: 37.1,
                    baseline_sys_min: 110, baseline_sys_max: 120,
                    baseline_dia_min: 70, baseline_dia_max: 78
                },
                'VG-1026': {
                    patient_id: 'VG-1026', name: 'David Kumar', age: 51, gender: 'Male',
                    baseline_hr_min: 60, baseline_hr_max: 75,
                    baseline_spo2_min: 95, baseline_spo2_max: 98,
                    baseline_temp_min: 36.6, baseline_temp_max: 37.3,
                    baseline_sys_min: 120, baseline_sys_max: 135,
                    baseline_dia_min: 80, baseline_dia_max: 88
                }
            };
            updatePatientDropdown();
            updatePatientCountBadge();
            renderPatientsRoster(Object.values(AppState.patients));
            if (callback) callback();
        });
}

function showOfflineBanner(show) {
    const el = document.getElementById('offlineNotice');
    if (el) el.classList.toggle('hidden', !show);
}

function switchPatient(patientId) {
    AppState.currentPatientId = patientId;
    document.getElementById('quickPatientSelect').value = patientId;
    loadPatientData(patientId);
    loadEhrData(patientId);
}

function loadPatientData(patientId) {
    const p = AppState.patients[patientId];
    if (!p) return;
    AppState.currentPatient = p;

    // Demographics
    document.getElementById('patientNameDisplay').textContent = p.name;
    document.getElementById('patientIdDisplay').textContent = p.patient_id;
    document.getElementById('patientAgeDisplay').textContent = `${p.age} yrs`;
    document.getElementById('patientGenderDisplay').textContent = p.gender;
    document.getElementById('patientAvatar').textContent = p.name.split(' ').map(n => n[0]).join('');

    // Baseline chips
    document.getElementById('chipHr').textContent    = `HR: ${p.baseline_hr_min}–${p.baseline_hr_max} BPM`;
    document.getElementById('chipSpo2').textContent  = `SpO2: ${p.baseline_spo2_min}–${p.baseline_spo2_max}%`;
    document.getElementById('chipTemp').textContent  = `Temp: ${p.baseline_temp_min}–${p.baseline_temp_max}°C`;
    document.getElementById('chipBp').textContent    = `BP: ${p.baseline_sys_min}–${p.baseline_sys_max}/${p.baseline_dia_min}–${p.baseline_dia_max}`;

    // Card baselines
    document.getElementById('baseHr').textContent    = `${p.baseline_hr_min}–${p.baseline_hr_max}`;
    document.getElementById('baseSpo2').textContent  = `${p.baseline_spo2_min}–${p.baseline_spo2_max}%`;
    document.getElementById('baseTemp').textContent  = `${p.baseline_temp_min}–${p.baseline_temp_max}°C`;
    document.getElementById('baseBp').textContent    = `${p.baseline_sys_min}–${p.baseline_sys_max}/${p.baseline_dia_min}–${p.baseline_dia_max}`;

    // Chart labels
    document.getElementById('chartHrRange').textContent   = `Safe: ${p.baseline_hr_min}–${p.baseline_hr_max} BPM`;
    document.getElementById('chartSpo2Range').textContent = `Safe: ${p.baseline_spo2_min}–${p.baseline_spo2_max}%`;
    document.getElementById('chartTempRange').textContent = `Safe: ${p.baseline_temp_min}–${p.baseline_temp_max}°C`;

    // Monitoring focus baselines
    safeSet('monMetaHr',   `Baseline ${p.baseline_hr_min}–${p.baseline_hr_max} BPM`);
    safeSet('monMetaSpo2', `Baseline ${p.baseline_spo2_min}–${p.baseline_spo2_max}%`);
    safeSet('monMetaTemp', `Baseline ${p.baseline_temp_min}–${p.baseline_temp_max}°C`);
    safeSet('monMetaBp',   `Baseline ${p.baseline_sys_min}–${p.baseline_sys_max}/${p.baseline_dia_min}–${p.baseline_dia_max}`);

    // Reset vitals to midpoint
    AppState.currentVitals = {
        heart_rate:  midpoint(p.baseline_hr_min,  p.baseline_hr_max),
        spo2:        midpoint(p.baseline_spo2_min, p.baseline_spo2_max),
        temperature: midpoint(p.baseline_temp_min, p.baseline_temp_max),
        systolic:    midpoint(p.baseline_sys_min,  p.baseline_sys_max),
        diastolic:   midpoint(p.baseline_dia_min,  p.baseline_dia_max)
    };
    AppState.previousVitals = { ...AppState.currentVitals };

    // Fetch vitals history
    fetch(`/api/vitals/${patientId}?limit=25`)
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success' && data.vitals.length > 0) {
                AppState.vitalsHistory = data.vitals;
                renderHistoryTables(data.vitals);
                populateCharts(data.vitals);
                const last = data.vitals[data.vitals.length - 1];
                AppState.currentVitals = {
                    heart_rate: last.heart_rate, spo2: last.spo2,
                    temperature: last.temperature, systolic: last.systolic,
                    diastolic: last.diastolic
                };
            }
        })
        .catch(() => {});

    // Fetch alerts
    fetch(`/api/alerts/${patientId}?limit=15`)
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success') {
                AppState.alerts = data.alerts;
                renderAlerts(data.alerts);
                document.getElementById('alertCountBadge').textContent = data.alerts.length;
            }
        })
        .catch(() => {});
}

function midpoint(a, b) { return (a + b) / 2; }

function safeSet(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// ====================================================================
// REALISTIC PHYSIOLOGICAL TELEMETRY SIMULATOR (Brownian Drift)
// ====================================================================

function stepPhysiology() {
    const p = AppState.currentPatient;
    if (!p) return;

    AppState.previousVitals = { ...AppState.currentVitals };
    const cur = AppState.currentVitals;
    const jitter = (range) => (Math.random() - 0.5) * range;

    if (AppState.simMode === 'normal') {
        const tHr  = midpoint(p.baseline_hr_min, p.baseline_hr_max);
        const tSp  = 98.2;
        const tTmp = midpoint(p.baseline_temp_min, p.baseline_temp_max);
        const tSys = midpoint(p.baseline_sys_min, p.baseline_sys_max);
        const tDia = midpoint(p.baseline_dia_min, p.baseline_dia_max);

        cur.heart_rate   += (tHr  - cur.heart_rate)   * 0.18 + jitter(1.5);
        cur.spo2         += (tSp  - cur.spo2)         * 0.15 + jitter(0.2);
        cur.temperature  += (tTmp - cur.temperature)  * 0.12 + jitter(0.04);
        cur.systolic     += (tSys - cur.systolic)     * 0.14 + jitter(1.8);
        cur.diastolic    += (tDia - cur.diastolic)    * 0.14 + jitter(1.2);

    } else if (AppState.simMode === 'warning') {
        cur.heart_rate   += (p.baseline_hr_max + 12  - cur.heart_rate)  * 0.16 + jitter(1.6);
        cur.spo2         += (p.baseline_spo2_min - 1.5 - cur.spo2)      * 0.16 + jitter(0.2);
        cur.temperature  += (p.baseline_temp_max + 0.6 - cur.temperature) * 0.14 + jitter(0.05);
        cur.systolic     += (p.baseline_sys_max + 14 - cur.systolic)     * 0.15 + jitter(2.0);
        cur.diastolic    += (p.baseline_dia_max + 8  - cur.diastolic)    * 0.15 + jitter(1.5);

    } else if (AppState.simMode === 'critical') {
        cur.heart_rate   += (p.baseline_hr_max + 34  - cur.heart_rate)  * 0.22 + jitter(2.0);
        cur.spo2         += (88.5                    - cur.spo2)         * 0.20 + jitter(0.3);
        cur.temperature  += (p.baseline_temp_max + 1.8 - cur.temperature) * 0.16 + jitter(0.06);
        cur.systolic     += (p.baseline_sys_max + 32 - cur.systolic)     * 0.20 + jitter(2.5);
        cur.diastolic    += (p.baseline_dia_max + 18 - cur.diastolic)    * 0.20 + jitter(1.8);
    }

    // Clamp to physiological bounds
    cur.heart_rate   = Math.max(35,   Math.min(220,  Math.round(cur.heart_rate)));
    cur.spo2         = Math.max(65.0, Math.min(100.0, Math.round(cur.spo2 * 10) / 10));
    cur.temperature  = Math.max(33.0, Math.min(42.0,  Math.round(cur.temperature * 10) / 10));
    cur.systolic     = Math.max(60,   Math.min(230,  Math.round(cur.systolic)));
    cur.diastolic    = Math.max(40,   Math.min(140,  Math.round(cur.diastolic)));

    dispatchVitalReading(cur);
}

function dispatchVitalReading(vitals) {
    const payload = {
        patient_id:  AppState.currentPatientId,
        heart_rate:  vitals.heart_rate,
        spo2:        vitals.spo2,
        temperature: vitals.temperature,
        systolic:    vitals.systolic,
        diastolic:   vitals.diastolic
    };

    fetch('/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'success') {
            showOfflineBanner(false);
            handleAnalysisResult(data.vital, data.analysis, data.new_alert);
        }
    })
    .catch(() => {
        showOfflineBanner(true);
        fallbackLocalAnalysis(vitals);
    });
}

function startSimulation() {
    if (AppState.timerId) clearInterval(AppState.timerId);
    AppState.isStreaming = true;
    AppState.timerId = setInterval(stepPhysiology, AppState.intervalMs);
    document.getElementById('pauseIcon').textContent = '⏸';
    document.getElementById('pauseText').textContent = 'Pause';
    const mstEl = document.getElementById('monitoringStateText');
    if (mstEl) { mstEl.textContent = 'STREAMING LIVE'; mstEl.style.color = 'var(--color-normal)'; }
}

function pauseSimulation() {
    if (AppState.timerId) { clearInterval(AppState.timerId); AppState.timerId = null; }
    AppState.isStreaming = false;
    document.getElementById('pauseIcon').textContent = '▶';
    document.getElementById('pauseText').textContent = 'Resume';
    const mstEl = document.getElementById('monitoringStateText');
    if (mstEl) { mstEl.textContent = 'PAUSED'; mstEl.style.color = 'var(--color-warning)'; }
}

function resetPatientState() {
    fetch(`/api/reset/${AppState.currentPatientId}`, { method: 'POST' })
        .then(r => r.json())
        .then(() => {
            document.getElementById('btnSimNormal').click();
            loadPatientData(AppState.currentPatientId);
            showToast('System Reset', 'Patient baseline vitals restored to nominal.', 'NORMAL');
        })
        .catch(() => {
            document.getElementById('btnSimNormal').click();
            loadPatientData(AppState.currentPatientId);
        });
}

// ====================================================================
// ANALYSIS RESULT RENDERING
// ====================================================================

function handleAnalysisResult(vital, analysis, newAlert) {
    AppState.lastAnalysis = analysis;
    updateVitalCards(vital, analysis.vital_statuses);
    updateRiskGauge(analysis.risk_score, analysis.status);
    updateAiExplanation(analysis);
    appendChartData(vital.timestamp, vital.heart_rate, vital.spo2, vital.temperature);
    addTableRow(vital);

    if (newAlert) {
        addAlertToFeed(newAlert);
        showToast(
            newAlert.status === 'CRITICAL' ? '🚨 Critical Alert' : '⚠️ Warning',
            newAlert.message,
            newAlert.status
        );
        playAlertChime(newAlert.status);
    }
}

function updateVitalCards(vital, statuses) {
    safeSet('valHeartRate', Math.round(vital.heart_rate));
    applyBadgeClass('statusHr', statuses?.heart_rate?.status || 'Normal');
    updateTrendIndicator('trendHr', vital.heart_rate, AppState.previousVitals.heart_rate);

    safeSet('valSpo2', vital.spo2.toFixed(1));
    applyBadgeClass('statusSpo2', statuses?.spo2?.status || 'Normal');
    updateTrendIndicator('trendSpo2', vital.spo2, AppState.previousVitals.spo2);

    safeSet('valTemp', vital.temperature.toFixed(1));
    applyBadgeClass('statusTemp', statuses?.temperature?.status || 'Normal');
    updateTrendIndicator('trendTemp', vital.temperature, AppState.previousVitals.temperature);

    const bpStr = `${Math.round(vital.systolic)}/${Math.round(vital.diastolic)}`;
    safeSet('valBp', bpStr);
    applyBadgeClass('statusBp', statuses?.blood_pressure?.status || 'Normal');
    updateTrendIndicator('trendBp', vital.systolic, AppState.previousVitals.systolic);

    // Monitoring focus
    safeSet('monValHr',   Math.round(vital.heart_rate));
    safeSet('monValSpo2', vital.spo2.toFixed(1));
    safeSet('monValTemp', vital.temperature.toFixed(1));
    safeSet('monValBp',   bpStr);
}

function applyBadgeClass(id, status) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = status;
    el.className = 'vital-status-pill';
    const s = status.toLowerCase();
    if (s.includes('critical')) el.classList.add('badge-critical');
    else if (s.includes('warning') || s.includes('borderline')) el.classList.add('badge-warning');
    else el.classList.add('badge-normal');
}

function updateTrendIndicator(id, current, prev) {
    const el = document.getElementById(id);
    if (!el) return;
    const diff = current - prev;
    if (Math.abs(diff) < 0.1) {
        el.textContent = '▬ Stable'; el.className = 'vital-trend-badge trend-stable';
    } else if (diff > 0) {
        el.textContent = '▲ Rising'; el.className = 'vital-trend-badge trend-up';
    } else {
        el.textContent = '▼ Falling'; el.className = 'vital-trend-badge trend-down';
    }
}

// ====================================================================
// RISK GAUGE & AI EXPLANATION
// ====================================================================

function updateRiskGauge(score, status) {
    safeSet('riskScoreNumber', score);
    safeSet('riskStatusText', status);

    const ring = document.getElementById('gaugeProgressRing');
    const pill = document.getElementById('riskStatusPill');
    const icon = document.getElementById('verdictIcon');
    const panel = document.getElementById('riskPanel');

    const circumference = 427.26; // 2π × 68
    ring.style.strokeDashoffset = circumference - (score / 100) * circumference;

    panel.classList.remove('state-critical', 'state-warning');
    if (pill) pill.className = 'verdict-pill';

    if (status === 'CRITICAL') {
        ring.style.stroke = 'var(--color-critical)';
        if (pill) pill.classList.add('status-critical');
        if (icon) icon.textContent = '🔴';
        panel.classList.add('state-critical');
    } else if (status === 'WARNING') {
        ring.style.stroke = 'var(--color-warning)';
        if (pill) pill.classList.add('status-warning');
        if (icon) icon.textContent = '🟡';
        panel.classList.add('state-warning');
    } else {
        ring.style.stroke = 'var(--color-normal)';
        if (pill) pill.classList.add('status-normal');
        if (icon) icon.textContent = '🟢';
    }

    // Update scale active indicator
    document.querySelectorAll('.scale-item').forEach(si => si.classList.remove('active'));
    if (score < 25) document.querySelector('.scale-green')?.classList.add('active');
    else if (score < 60) document.querySelector('.scale-yellow')?.classList.add('active');
    else document.querySelector('.scale-red')?.classList.add('active');
}

function updateAiExplanation(analysis) {
    const banner = document.getElementById('correlationBanner');
    const bannerText = document.getElementById('correlationBannerText');
    const badge = document.getElementById('correlationStatusBadge');

    if (analysis.correlation_detected) {
        banner?.classList.remove('hidden');
        if (bannerText) bannerText.textContent = analysis.correlation_summary || 'Multiple vitals deviating simultaneously.';
        if (badge) { badge.textContent = '⚡ Multi-Vital Correlation Active'; badge.className = 'correlation-status-badge badge-critical'; }
    } else {
        banner?.classList.add('hidden');
        if (badge) { badge.textContent = 'Single Parameter Stable'; badge.className = 'correlation-status-badge badge-normal'; }
    }

    const list = document.getElementById('aiReasonsList');
    if (list) {
        list.innerHTML = '';
        (analysis.reasons || []).forEach(r => {
            const li = document.createElement('li');
            let icon = '🟢';
            if (r.includes('critically') || r.includes('severely') || r.includes('🔎')) icon = '🔴';
            else if (r.includes('elevated') || r.includes('moderately') || r.includes('📈') || r.includes('📉') || r.includes('⚠️')) icon = '⚠️';
            li.innerHTML = `<span class="reason-dot">${icon}</span> <span>${escapeHtml(r)}</span>`;
            list.appendChild(li);
        });
    }
}

function fallbackLocalAnalysis(vitals) {
    const p = AppState.currentPatient;
    if (!p) return;
    const isCritical = vitals.heart_rate > p.baseline_hr_max + 20 || vitals.spo2 < 90;
    const isWarning  = vitals.heart_rate > p.baseline_hr_max || vitals.spo2 < p.baseline_spo2_min;
    const status = isCritical ? 'CRITICAL' : (isWarning ? 'WARNING' : 'NORMAL');
    const score  = isCritical ? 78 : (isWarning ? 42 : 12);

    handleAnalysisResult(
        { ...vitals, timestamp: new Date().toISOString() },
        {
            risk_score: score, status,
            reasons: [`Local fallback: HR ${vitals.heart_rate} BPM, SpO2 ${vitals.spo2}%`],
            correlation_detected: isCritical,
            correlation_summary: isCritical ? 'Multi-vital distress (offline mode).' : ''
        },
        isCritical ? {
            id: Date.now(), patient_id: p.patient_id, status: 'CRITICAL',
            risk_score: score, message: 'Critical deviation (offline mode)',
            timestamp: new Date().toISOString()
        } : null
    );
}

// ====================================================================
// TOAST NOTIFICATIONS
// ====================================================================

function showToast(title, message, severity) {
    const toast = document.getElementById('alertToast');
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastMessage').textContent = message;
    document.getElementById('toastIcon').textContent = severity === 'CRITICAL' ? '🚨' : (severity === 'NORMAL' ? 'ℹ️' : '⚠️');
    toast.className = severity === 'CRITICAL' ? 'alert-toast' : 'alert-toast warning-toast';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 6000);
}

// ====================================================================
// ALERTS FEED
// ====================================================================

function addAlertToFeed(alert) {
    const badge = document.getElementById('alertCountBadge');
    badge.textContent = parseInt(badge.textContent || '0', 10) + 1;

    const dashFeed = document.getElementById('dashboardAlertsFeed');
    dashFeed.querySelector('.empty-feed-placeholder')?.remove();

    [dashFeed, document.getElementById('alertsFullFeed')].forEach(feed => {
        if (!feed) return;
        feed.querySelector('.empty-feed-placeholder')?.remove();
        const item = document.createElement('div');
        item.className = `alert-feed-item ${alert.status.toLowerCase()}`;
        item.innerHTML = `
            <div class="alert-feed-left">
                <span>${alert.status === 'CRITICAL' ? '🔴' : '🟡'}</span>
                <span class="alert-feed-msg">${escapeHtml(alert.message)}</span>
            </div>
            <span class="alert-feed-time">${formatTime(alert.timestamp)}</span>
        `;
        feed.insertBefore(item, feed.firstChild);
    });
}

function renderAlerts(alerts) {
    const dashFeed = document.getElementById('dashboardAlertsFeed');
    const fullFeed = document.getElementById('alertsFullFeed');
    if (dashFeed) dashFeed.innerHTML = '';
    if (fullFeed) fullFeed.innerHTML = '';

    if (!alerts || alerts.length === 0) {
        if (dashFeed) dashFeed.innerHTML = '<div class="empty-feed-placeholder"><span>✅ No active alerts. Parameters nominal.</span></div>';
        if (fullFeed) fullFeed.innerHTML = '<div class="empty-feed-placeholder"><span>No alert history recorded for this patient.</span></div>';
        return;
    }

    alerts.forEach(a => {
        const item = document.createElement('div');
        item.className = `alert-feed-item ${a.status.toLowerCase()}`;
        item.innerHTML = `
            <div class="alert-feed-left">
                <span>${a.status === 'CRITICAL' ? '🔴' : '🟡'}</span>
                <span class="alert-feed-msg">${escapeHtml(a.message)}</span>
            </div>
            <span class="alert-feed-time">${formatTime(a.timestamp)}</span>
        `;
        if (dashFeed) dashFeed.appendChild(item);
        if (fullFeed) fullFeed.appendChild(item.cloneNode(true));
    });
}

// ====================================================================
// HISTORY TABLES
// ====================================================================

function renderHistoryTables(vitals) {
    const miniBody = document.getElementById('miniTableBody');
    const fullBody = document.getElementById('fullHistoryTableBody');
    if (miniBody) miniBody.innerHTML = '';
    if (fullBody) fullBody.innerHTML = '';
    const rev = [...vitals].reverse();
    rev.forEach(v => {
        if (miniBody) appendTableRow(miniBody, v, false);
        if (fullBody) appendTableRow(fullBody, v, true);
    });
}

function addTableRow(vital) {
    const mini = document.getElementById('miniTableBody');
    const full = document.getElementById('fullHistoryTableBody');
    if (mini) appendTableRow(mini, vital, false, true);
    if (full) appendTableRow(full, vital, true, true);
}

function appendTableRow(tbody, v, isFull, prepend = false) {
    const tr = document.createElement('tr');
    tr.setAttribute('data-status', v.status || 'NORMAL');
    const badge = `<span class="vital-status-pill badge-${(v.status || 'NORMAL').toLowerCase()}">${v.status || 'NORMAL'}</span>`;
    const bp = `${Math.round(v.systolic)}/${Math.round(v.diastolic)}`;

    if (isFull) {
        tr.innerHTML = `<td>${formatTime(v.timestamp)}</td><td>${v.patient_id}</td><td>${Math.round(v.heart_rate)}</td><td>${parseFloat(v.spo2).toFixed(1)}%</td><td>${parseFloat(v.temperature).toFixed(1)}°C</td><td>${bp}</td><td><strong>${v.risk_score || 0}</strong></td><td>${badge}</td>`;
    } else {
        tr.innerHTML = `<td>${formatTime(v.timestamp)}</td><td>${Math.round(v.heart_rate)}</td><td>${parseFloat(v.spo2).toFixed(1)}%</td><td>${parseFloat(v.temperature).toFixed(1)}°</td><td>${bp}</td><td>${v.risk_score || 0}</td><td>${badge}</td>`;
    }

    if (prepend && tbody.firstChild) {
        tbody.insertBefore(tr, tbody.firstChild);
        if (tbody.children.length > 30) tbody.removeChild(tbody.lastChild);
    } else {
        tbody.appendChild(tr);
    }
}

function filterHistoryTable(filter) {
    document.querySelectorAll('#fullHistoryTableBody tr').forEach(r => {
        r.style.display = (filter === 'ALL' || r.getAttribute('data-status') === filter) ? '' : 'none';
    });
}

function exportHistoryCsv() {
    const rows = Array.from(document.querySelectorAll('#fullHistoryTable tr'));
    const csv = rows.map(r => Array.from(r.querySelectorAll('th,td')).map(c => `"${c.textContent.trim()}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = `VitalGuard_${AppState.currentPatientId}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ====================================================================
// PATIENTS ROSTER DIRECTORY
// ====================================================================

function renderPatientsRoster(patients) {
    const container = document.getElementById('patientsRosterGrid');
    if (!container) return;
    container.innerHTML = '';

    patients.forEach(p => {
        const card = document.createElement('div');
        card.className = 'patient-roster-card';
        card.innerHTML = `
            <div class="patient-roster-top">
                <div class="roster-info">
                    <h4>${escapeHtml(p.name)}</h4>
                    <div class="roster-meta">${p.patient_id} • ${p.age} yrs • ${p.gender}</div>
                </div>
                <span class="id-pill">Active Telemetry</span>
            </div>
            <div class="roster-baseline-list">
                <span>HR: ${p.baseline_hr_min}–${p.baseline_hr_max} BPM</span>
                <span>SpO2: ${p.baseline_spo2_min}–${p.baseline_spo2_max}%</span>
                <span>Temp: ${p.baseline_temp_min}–${p.baseline_temp_max}°C</span>
                <span>BP: ${p.baseline_sys_min}–${p.baseline_sys_max}/${p.baseline_dia_min}–${p.baseline_dia_max}</span>
            </div>
            <div class="roster-card-actions">
                <button class="btn-select-patient" data-id="${p.patient_id}">
                    <span>📡</span> Monitor
                </button>
                <button class="btn-roster-action btn-roster-edit" data-id="${p.patient_id}" title="Edit Patient &amp; Baselines">
                    <span>✏️</span> Edit
                </button>
                <button class="btn-roster-action btn-roster-delete" data-id="${p.patient_id}" title="Delete Patient">
                    <span>🗑️</span>
                </button>
            </div>
        `;
        card.querySelector('.btn-select-patient').addEventListener('click', () => {
            switchPatient(p.patient_id);
            document.getElementById('navDashboard').click();
        });
        card.querySelector('.btn-roster-edit').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditPatientModal(p.patient_id);
        });
        card.querySelector('.btn-roster-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            openDeleteConfirmModal(p.patient_id);
        });
        container.appendChild(card);
    });
}

// ====================================================================
// LIVE CHARTS (Chart.js)
// ====================================================================

function initCharts() {
    if (typeof Chart === 'undefined') { console.warn('Chart.js not found.'); return; }

    const opts = (yMin, yMax) => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15,23,42,0.95)',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                titleColor: '#38bdf8',
                bodyColor: '#f8fafc',
                bodyFont: { family: 'JetBrains Mono' }
            }
        },
        scales: {
            x: { display: false, grid: { display: false } },
            y: {
                min: yMin, max: yMax,
                grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                ticks: { color: '#64748b', font: { size: 10, family: 'JetBrains Mono' } }
            }
        }
    });

    const makeChart = (canvasId, color, min, max) => {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return null;
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{ data: [], borderColor: color, backgroundColor: color.replace(')', ', 0.08)').replace('rgb', 'rgba'), borderWidth: 2.2, tension: 0.35, fill: true, pointRadius: 2, pointHoverRadius: 5 }]
            },
            options: opts(min, max)
        });
    };

    AppState.charts.hr   = makeChart('chartHeartRate', '#f43f5e', 40, 140);
    AppState.charts.spo2 = makeChart('chartSpo2',      '#06b6d4', 80, 100);
    AppState.charts.temp = makeChart('chartTemp',      '#f59e0b', 35, 40.5);
}

function populateCharts(vitals) {
    if (!AppState.charts.hr) return;
    const labels  = vitals.map(v => formatTime(v.timestamp));
    const hrData  = vitals.map(v => v.heart_rate);
    const spo2Data = vitals.map(v => v.spo2);
    const tempData = vitals.map(v => v.temperature);

    [[AppState.charts.hr, hrData], [AppState.charts.spo2, spo2Data], [AppState.charts.temp, tempData]].forEach(([chart, data]) => {
        if (!chart) return;
        chart.data.labels = [...labels];
        chart.data.datasets[0].data = [...data];
        chart.update();
    });
}

function appendChartData(timestamp, hr, spo2, temp) {
    if (!AppState.charts.hr) return;
    const MAX = 20;
    const label = formatTime(timestamp);

    [[AppState.charts.hr, hr], [AppState.charts.spo2, spo2], [AppState.charts.temp, temp]].forEach(([chart, val]) => {
        if (!chart) return;
        chart.data.labels.push(label);
        chart.data.datasets[0].data.push(val);
        if (chart.data.labels.length > MAX) { chart.data.labels.shift(); chart.data.datasets[0].data.shift(); }
        chart.update();
    });
}

// ====================================================================
// EHR INTEGRATION
// ====================================================================

function loadEhrData(patientId) {
    fetch(`/api/ehr/patient/${patientId}`)
        .then(r => r.json())
        .then(data => {
            if (data.status !== 'success') return;
            const r = data.last_record;

            // Update EHR card fields
            safeSet('ehrHospitalName', data.hospital || 'VitalCare Hospital – Demo EHR');
            safeSet('ehrPatientNameDisplay', data.patient?.name || '');
            safeSet('ehrPatientIdDisplay', patientId);
            safeSet('ehrLastSyncDisplay', data.last_sync || '—');

            // Full section equivalents
            safeSet('ehrFullPatientName', data.patient?.name || '');
            safeSet('ehrFullPatientId', patientId);
            safeSet('ehrFullLastSync', data.last_sync || '—');

            if (r) {
                safeSet('ehrLastHr',   Math.round(r.heart_rate));
                safeSet('ehrLastSpo2', parseFloat(r.spo2).toFixed(1));
                safeSet('ehrLastTemp', parseFloat(r.temperature).toFixed(1));
                safeSet('ehrLastBp',   r.blood_pressure || '—');
                safeSet('ehrLastRisk', `${r.risk_score} – ${r.status}`);

                safeSet('ehrFullLastHr',   Math.round(r.heart_rate));
                safeSet('ehrFullLastSpo2', parseFloat(r.spo2).toFixed(1));
                safeSet('ehrFullLastTemp', parseFloat(r.temperature).toFixed(1));
                safeSet('ehrFullLastBp',   r.blood_pressure || '—');
                safeSet('ehrFullLastRisk', `${r.risk_score} – ${r.status}`);
            }
        })
        .catch(() => {});
}

function syncToEhr() {
    const vitals = AppState.currentVitals;
    const analysis = AppState.lastAnalysis;

    const payload = {
        patient_id:  AppState.currentPatientId,
        heart_rate:  vitals.heart_rate,
        spo2:        vitals.spo2,
        temperature: vitals.temperature,
        systolic:    vitals.systolic,
        diastolic:   vitals.diastolic,
        blood_pressure: `${Math.round(vitals.systolic)}/${Math.round(vitals.diastolic)}`,
        risk_score:  analysis ? analysis.risk_score : 10,
        status:      analysis ? analysis.status : 'NORMAL'
    };

    // Button feedback
    const syncBtn  = document.getElementById('btnSyncEhr');
    const syncIcon = document.getElementById('ehrSyncIcon');
    const syncText = document.getElementById('ehrSyncText');
    if (syncIcon) syncIcon.textContent = '⏳';
    if (syncText) syncText.textContent = 'Syncing…';

    fetch('/api/ehr/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
        if (syncIcon) syncIcon.textContent = '✅';
        if (syncText) syncText.textContent = 'Synced!';

        const feedback = document.getElementById('ehrSyncFeedback');
        if (feedback) {
            feedback.classList.remove('hidden');
            setTimeout(() => feedback.classList.add('hidden'), 3500);
        }

        showToast('EHR Sync Complete', `Vitals committed to ${data.hospital || 'Demo EHR'} at ${data.last_sync || '—'}.`, 'NORMAL');

        // Update displayed last-sync data
        safeSet('ehrLastSyncDisplay', data.last_sync || '—');
        safeSet('ehrFullLastSync',    data.last_sync || '—');
        safeSet('ehrLastHr',   Math.round(payload.heart_rate));
        safeSet('ehrLastSpo2', parseFloat(payload.spo2).toFixed(1));
        safeSet('ehrLastTemp', parseFloat(payload.temperature).toFixed(1));
        safeSet('ehrLastBp',   payload.blood_pressure);
        safeSet('ehrLastRisk', `${payload.risk_score} – ${payload.status}`);

        setTimeout(() => {
            if (syncIcon) syncIcon.textContent = '🔄';
            if (syncText) syncText.textContent = 'Sync to EHR';
        }, 2500);
    })
    .catch(() => {
        if (syncIcon) syncIcon.textContent = '⚠️';
        if (syncText) syncText.textContent = 'Sync Failed';
        showToast('EHR Sync Failed', 'Backend unavailable. Please ensure the server is running.', 'WARNING');
        setTimeout(() => {
            if (syncIcon) syncIcon.textContent = '🔄';
            if (syncText) syncText.textContent = 'Sync to EHR';
        }, 3000);
    });
}

function openEhrModal() {
    const modal = document.getElementById('ehrRecordsModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    // Load records
    fetch(`/api/ehr/records/${AppState.currentPatientId}?limit=20`)
        .then(r => r.json())
        .then(data => {
            const tbody = document.getElementById('ehrRecordsTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';
            if (!data.records || data.records.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted)">No EHR records yet. Click "Sync to EHR" first.</td></tr>';
                return;
            }
            data.records.forEach(rec => {
                const tr = document.createElement('tr');
                const badge = `<span class="vital-status-pill badge-${rec.status.toLowerCase()}">${rec.status}</span>`;
                tr.innerHTML = `
                    <td>${formatTime(rec.timestamp)}</td>
                    <td>${escapeHtml(rec.patient_id)}</td>
                    <td>${Math.round(rec.heart_rate)} BPM</td>
                    <td>${parseFloat(rec.spo2).toFixed(1)}%</td>
                    <td>${parseFloat(rec.temperature).toFixed(1)}°C</td>
                    <td>${rec.blood_pressure}</td>
                    <td><strong>${rec.risk_score}</strong></td>
                    <td>${badge}</td>
                    <td>${escapeHtml(rec.synced_by || '—')}</td>
                `;
                tbody.appendChild(tr);
            });

            // Load FHIR JSON from latest record
            const latest = data.records[0];
            const fhirEl = document.getElementById('ehrFhirJsonDisplay');
            if (fhirEl && latest) {
                try {
                    const parsed = latest.fhir_parsed || JSON.parse(latest.fhir_bundle || '{}');
                    fhirEl.innerHTML = `<code>${escapeHtml(JSON.stringify(parsed, null, 2))}</code>`;
                } catch (e) {
                    fhirEl.innerHTML = '<code>No FHIR bundle available.</code>';
                }
            }
        })
        .catch(() => {
            const tbody = document.getElementById('ehrRecordsTableBody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted)">Failed to load EHR records.</td></tr>';
        });

    // Load audit logs
    fetch('/api/ehr/audit?limit=20')
        .then(r => r.json())
        .then(data => {
            const terminal = document.getElementById('ehrAuditTerminal');
            if (!terminal) return;
            terminal.innerHTML = '';
            if (!data.audit_logs || data.audit_logs.length === 0) {
                terminal.innerHTML = '<div class="audit-empty">No audit log entries yet.</div>';
                return;
            }
            data.audit_logs.forEach(log => {
                const line = document.createElement('div');
                line.className = `audit-line ${log.status === 'SUCCESS' ? 'audit-ok' : 'audit-fail'}`;
                line.innerHTML = `<span class="audit-ts">${log.timestamp}</span> <span class="audit-pid">${log.patient_id}</span> <span class="audit-action">${log.action}</span> <span class="audit-status">[${log.status}]</span> <span class="audit-detail">${escapeHtml(log.details || '')}</span>`;
                terminal.appendChild(line);
            });
        })
        .catch(() => {});
}

// ====================================================================
// UTILITIES
// ====================================================================

function formatTime(timestampStr) {
    if (!timestampStr) return '';
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) return (timestampStr.split(' ')[1] || timestampStr).substring(0, 8);
    return d.toLocaleTimeString('en-US', { hour12: false });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
