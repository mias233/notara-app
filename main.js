console.log("Notara loading...");

window.addEventListener('firebase-ready', () => {
    console.log("Firebase initialized.");
    
    // Setup UI hooks for auth state
    window.addEventListener('auth-ui-sync', syncUI);
    
    __fb.onAuthStateChanged(__fb.auth, (user) => {
        window.currentUser = user;
        syncUI();
    });

    function syncUI() {
        const user = window.currentUser;
        if(user) {
            // Logged in
            splash.style.opacity = '0'; setTimeout(()=>splash.style.display = 'none', 400);
            authWrap.style.display = 'none';
            appWrap.style.display = 'grid';
            
            document.getElementById('userName').textContent = user.displayName || 'User';
            document.getElementById('dropName').textContent = user.displayName || 'User';
            document.getElementById('dropEmail').textContent = user.email || '';
            
            const initials = (user.displayName || 'U').charAt(0).toUpperCase();
            document.getElementById('userAvatarChar').textContent = initials;
            
            if(user.photoURL) {
                document.getElementById('userAvatarImg').src = user.photoURL;
                document.getElementById('userAvatarImg').style.display = 'block';
                document.getElementById('userAvatarChar').style.display = 'none';
            } else {
                document.getElementById('userAvatarImg').style.display = 'none';
                document.getElementById('userAvatarChar').style.display = 'flex';
            }
            
            // Google badge
            const isGoogle = user.providerData && user.providerData.some(p => p.providerId === 'google.com');
            document.getElementById('googleBadge').style.display = isGoogle ? 'block' : 'none';

            // Load Notes
            loadNotes();
        } else {
            // Logged out
            splash.style.opacity = '0'; setTimeout(()=>splash.style.display = 'none', 400);
            authWrap.style.display = 'flex';
            appWrap.style.display = 'none';
            
            // Clean state
            window.notesList = [];
            window.currentNoteId = null;
            notesListEl.innerHTML = '';
            editorContent.style.display = 'none';
            emptyState.style.display = 'flex';
            aiPanel.classList.remove('open');
        }
    }
});
