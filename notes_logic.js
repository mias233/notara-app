// Notes Logic
const notesListEl = document.getElementById('notesList');
const emptyState = document.getElementById('emptyState');
const editorContent = document.getElementById('editorContent');
const noteTitle = document.getElementById('noteTitle');
const noteBody = document.getElementById('noteContent');
const saveDot = document.getElementById('saveDot');
const saveText = document.getElementById('saveText');
const wordCount = document.getElementById('wordCount');

const searchInput = document.getElementById('searchInput');
const tagInput = document.getElementById('tagInput');
const tagsWrap = document.getElementById('tagsWrap');

let currentTags = [];

function parseNotes() {
    if(!currentUser) return [];
    try {
        const data = localStorage.getItem(`notara_${currentUser.uid}`);
        return data ? JSON.parse(data) : [];
    } catch(e) { return []; }
}
function saveMemNotes() {
    if(!currentUser) return;
    localStorage.setItem(`notara_${currentUser.uid}`, JSON.stringify(window.notesList));
}

function loadNotes() {
    window.notesList = parseNotes();
    renderNotesList();
}

function getGroup(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    const yes = new Date(today); yes.setDate(today.getDate()-1);
    const isYesterday = date.getDate() === yes.getDate() && date.getMonth() === yes.getMonth() && date.getFullYear() === yes.getFullYear();
    if(isToday) return 'Today';
    if(isYesterday) return 'Yesterday';
    return 'Earlier';
}

function renderNotesList(query = '') {
    notesListEl.innerHTML = '';
    
    let filtered = window.notesList.filter(n => {
        const q = query.toLowerCase();
        return n.title.toLowerCase().includes(q) || 
               n.content.toLowerCase().includes(q) || 
               n.tags.some(t => t.toLowerCase().includes(q));
    });
    
    filtered.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    const groups = { 'Today': [], 'Yesterday': [], 'Earlier': [] };
    filtered.forEach(n => groups[getGroup(n.updatedAt)].push(n));
    
    ['Today', 'Yesterday', 'Earlier'].forEach(g => {
        if(groups[g].length > 0) {
            const h = document.createElement('div'); h.className = 'group-label'; h.textContent = g;
            notesListEl.appendChild(h);
            groups[g].forEach(n => {
                const item = document.createElement('div');
                item.className = `note-item ${currentNoteId === n.id ? 'active' : ''}`;
                item.onclick = () => openNote(n.id);
                
                const titleStr = n.title || 'Untitled Note';
                const previewStr = n.content.substring(0, 100) || 'No additional text';
                const dateStr = new Date(n.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const tagsHtml = n.tags.slice(0,3).map(t => `<div class="tag-mini">${escapeHTML(t)}</div>`).join('');
                
                item.innerHTML = `
                    <div class="note-title">${escapeHTML(titleStr)}</div>
                    <div class="note-preview">${escapeHTML(previewStr)}</div>
                    <div class="note-meta">
                        <span>${dateStr}</span>
                        <div class="note-tags-mini">${tagsHtml}</div>
                    </div>
                `;
                notesListEl.appendChild(item);
            });
        }
    });
}

function createNewNote() {
    const note = {
        id: 'note_' + Date.now() + Math.random().toString(36).substr(2, 5),
        title: '',
        content: '',
        tags: [],
        updatedAt: new Date().toISOString()
    };
    window.notesList.unshift(note);
    saveMemNotes();
    openNote(note.id);
    renderNotesList();
    noteTitle.focus();
    if(window.innerWidth <= 800) document.getElementById('sidebar').classList.remove('mobile-open');
}

function openNote(id) {
    currentNoteId = id;
    const note = window.notesList.find(n => n.id === id);
    if(!note) return;
    
    emptyState.style.display = 'none';
    editorContent.style.display = 'flex';
    
    noteTitle.value = note.title;
    noteBody.value = note.content;
    currentTags = [...note.tags];
    
    renderTags();
    updateWordCount();
    setSaveState('saved');
    renderNotesList(searchInput.value); // keep search but update active state
    if(window.innerWidth <= 800) document.getElementById('sidebar').classList.remove('mobile-open');
}

document.getElementById('btnNewNote').addEventListener('click', createNewNote);

// Tags
function renderTags() {
    document.querySelectorAll('.tag-chip').forEach(t => t.remove());
    currentTags.forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerHTML = `<span>${escapeHTML(tag)}</span> <button onclick="removeTag('${escapeHTML(tag)}')"><i class="ph ph-x"></i></button>`;
        tagsWrap.insertBefore(chip, tagInput);
    });
}
window.removeTag = function(tag) {
    currentTags = currentTags.filter(t => t !== tag);
    renderTags();
    triggerAutoSave();
};
tagInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const v = tagInput.value.trim().replace(/^,+|,+$/g, '');
        if(v && !currentTags.includes(v) && currentTags.length < 6) {
            currentTags.push(v);
            tagInput.value = '';
            renderTags();
            triggerAutoSave();
        }
    }
});

// Editor
function updateWordCount() {
    const text = noteBody.value.trim();
    const count = text ? text.split(/\\s+/).length : 0;
    wordCount.textContent = `${count} words`;
}

function setSaveState(state) {
    saveDot.className = `save-dot ${state}`;
    if(state === 'saved') saveText.textContent = 'Saved';
    if(state === 'unsaved') saveText.textContent = 'Unsaved changes';
    if(state === 'saving') saveText.textContent = 'Saving...';
}

function triggerAutoSave() {
    setSaveState('unsaved');
    updateWordCount();
    clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(saveNote, 1500);
}

function saveNote() {
    if(!currentNoteId) return;
    const note = window.notesList.find(n => n.id === currentNoteId);
    if(!note) return;
    
    setSaveState('saving');
    
    note.title = noteTitle.value;
    note.content = noteBody.value;
    note.tags = [...currentTags];
    note.updatedAt = new Date().toISOString();
    
    saveMemNotes();
    
    setTimeout(() => {
        setSaveState('saved');
        renderNotesList(searchInput.value);
    }, 500); // UI visual feedback
}

noteTitle.addEventListener('input', triggerAutoSave);
noteBody.addEventListener('input', triggerAutoSave);
document.getElementById('btnManualSave').addEventListener('click', saveNote);
document.addEventListener('keydown', e => {
    if((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveNote();
    }
});

// Search
searchInput.addEventListener('input', e => renderNotesList(e.target.value));

// Delete Note
document.getElementById('btnDeleteNote').addEventListener('click', () => {
    showModal('deleteModal');
});
document.getElementById('btnConfirmDelete').addEventListener('click', () => {
    if(!currentNoteId) return;
    window.notesList = window.notesList.filter(n => n.id !== currentNoteId);
    saveMemNotes();
    hideModal('deleteModal');
    currentNoteId = null;
    editorContent.style.display = 'none';
    emptyState.style.display = 'flex';
    renderNotesList(searchInput.value);
    showToast('Note deleted', 'success');
});

// Mobile menu
document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('mobile-open');
});

// Close sidebar on click outside
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    if(window.innerWidth <= 800) {
        if(!sidebar.contains(e.target) && !e.target.closest('#mobileMenuBtn')) {
            sidebar.classList.remove('mobile-open');
        }
    }
});
