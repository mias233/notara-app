const authWrap = document.getElementById('authWrap');
const appWrap = document.getElementById('appWrap');
const splash = document.getElementById('splash');

let isSignUp = false;

// Tabs mapping
const tabIn = document.getElementById('tabSignIn');
const tabUp = document.getElementById('tabSignUp');
const nameGroup = document.getElementById('nameGroup');
const confirmGroup = document.getElementById('confirmPwdGroup');
const btnSubmit = document.getElementById('authSubmitBtn');
const authError = document.getElementById('authError');
const pwdStrengthWrap = document.getElementById('pwdStrengthWrap');
const pwdStrengthBar = document.getElementById('pwdStrengthBar');

const emailInput = document.getElementById('authEmail');
const pwdInput = document.getElementById('authPassword');
const nameInput = document.getElementById('authName');
const confirmInput = document.getElementById('authConfirm');

function toggleAuthMode(toSignUp) {
    isSignUp = toSignUp;
    authError.style.display = 'none';
    if(isSignUp) {
        tabUp.classList.add('active'); tabIn.classList.remove('active');
        nameGroup.style.display = 'block'; confirmGroup.style.display = 'block';
        pwdStrengthWrap.style.display = 'block';
        btnSubmit.textContent = 'Sign Up';
        nameInput.required = true; confirmInput.required = true;
    } else {
        tabIn.classList.add('active'); tabUp.classList.remove('active');
        nameGroup.style.display = 'none'; confirmGroup.style.display = 'none';
        pwdStrengthWrap.style.display = 'none';
        btnSubmit.textContent = 'Sign In';
        nameInput.required = false; confirmInput.required = false;
    }
}

tabIn.addEventListener('click', () => toggleAuthMode(false));
tabUp.addEventListener('click', () => toggleAuthMode(true));

// Password Toggles
document.querySelectorAll('.pwd-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const input = e.currentTarget.previousElementSibling;
        const icon = e.currentTarget.querySelector('i');
        if(input.type === 'password') {
            input.type = 'text'; icon.classList.replace('ph-eye', 'ph-eye-closed');
        } else {
            input.type = 'password'; icon.classList.replace('ph-eye-closed', 'ph-eye');
        }
    });
});

pwdInput.addEventListener('input', (e) => {
    if(!isSignUp) return;
    const val = e.target.value;
    let strength = 0;
    if(val.length > 5) strength += 30;
    if(val.length > 8) strength += 20;
    if(/[A-Z]/.test(val)) strength += 20;
    if(/[0-9]/.test(val)) strength += 15;
    if(/[^A-Za-z0-9]/.test(val)) strength += 15;
    pwdStrengthBar.style.width = `${strength}%`;
    pwdStrengthBar.style.background = strength > 70 ? 'var(--success)' : strength > 40 ? 'var(--warning)' : 'var(--error)';
});

// Form Sub
document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!window.__fb) return;
    
    authError.style.display = 'none';
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="ph ph-spinner animation-spin"></i> Processing...';
    
    try {
        if(isSignUp) {
            if(pwdInput.value !== confirmInput.value) throw new Error("Passwords do not match");
            const cred = await __fb.createUserWithEmailAndPassword(__fb.auth, emailInput.value, pwdInput.value);
            await __fb.updateProfile(cred.user, { displayName: nameInput.value });
        } else {
            await __fb.signInWithEmailAndPassword(__fb.auth, emailInput.value, pwdInput.value);
        }
    } catch (err) {
        authError.style.display = 'block';
        authError.textContent = err.message.replace('Firebase: ', '');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    }
});

document.getElementById('btnGoogle').addEventListener('click', async () => {
    if(!window.__fb) return;
    try {
        await __fb.signInWithPopup(__fb.auth, __fb.provider);
    } catch(err) {
        showToast(err.message, 'error');
    }
});

// UI Event bindings for user pill
const userPill = document.getElementById('userPill');
const userDropdown = document.getElementById('userDropdown');
userPill.addEventListener('click', (e) => {
    if(e.target.closest('.dropdown')) return;
    userDropdown.classList.toggle('show');
});
document.addEventListener('click', (e) => {
    if(!userPill.contains(e.target)) userDropdown.classList.remove('show');
});

document.getElementById('btnSignOut').addEventListener('click', () => {
    if(window.__fb) __fb.signOut(__fb.auth);
});

// Profile edit
const profileNameInp = document.getElementById('profileName');
const apiKeyInp = document.getElementById('profileApiKey');
document.getElementById('btnEditProfile').addEventListener('click', () => {
    if(!currentUser) return;
    profileNameInp.value = currentUser.displayName || '';
    apiKeyInp.value = localStorage.getItem('notara_apikey') || '';
    showModal('profileModal');
});

document.getElementById('btnSaveProfile').addEventListener('click', async () => {
    if(!currentUser || !window.__fb) return;
    const btn = document.getElementById('btnSaveProfile');
    btn.disabled = true; btn.textContent = 'Saving...';
    try {
        if(profileNameInp.value !== currentUser.displayName) {
            await __fb.updateProfile(currentUser, { displayName: profileNameInp.value });
        }
        localStorage.setItem('notara_apikey', apiKeyInp.value.trim());
        showToast('Profile updated', 'success');
        hideModal('profileModal');
        // Force refresh UI
        __fb.onAuthStateChanged(__fb.auth, (u) => { if(u) window.dispatchEvent(new Event('auth-ui-sync')); });
    } catch(e) { showToast(e.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Save Changes'; }
});
