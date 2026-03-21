// Globals
window.currentUser = null;
window.currentNoteId = null;
window.notesList = [];
window.saveTimeout = null;

// UI Helpers
window.showToast = function(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast \${type}`;
    let icon = 'ph-info';
    if(type==='success') icon = 'ph-check-circle';
    if(type==='error') icon = 'ph-warning-circle';
    toast.innerHTML = `<i class="ph \${icon}"></i> <span>\${msg}</span>`;
    document.getElementById('toastContainer').appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

window.showModal = function(id) { document.getElementById(id).classList.add('show'); };
window.hideModal = function(id) { document.getElementById(id).classList.remove('show'); };

document.querySelectorAll('.btn-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) modal.classList.remove('show');
    });
});

window.escapeHTML = function(str) {
    if(!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
};
