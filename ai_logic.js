const aiPanel = document.getElementById('aiPanel');
const btnOpenAI = document.getElementById('btnOpenAI');
const btnCloseAI = document.getElementById('btnCloseAI');
const aiCustomPrompt = document.getElementById('aiCustomPrompt');
const btnSubmitAI = document.getElementById('btnSubmitAI');
const aiLoader = document.getElementById('aiLoader');
const aiResponseArea = document.getElementById('aiResponseArea');
const aiResponseText = document.getElementById('aiResponseText');
const btnAiReplace = document.getElementById('btnAiReplace');
const btnAiAppend = document.getElementById('btnAiAppend');
const btnAiCopy = document.getElementById('btnAiCopy');

let currentAiResponse = '';

// Toggle AI Panel
btnOpenAI.addEventListener('click', () => {
    aiPanel.classList.add('open');
    if(window.innerWidth <= 800) document.getElementById('sidebar').classList.remove('mobile-open');
});
btnCloseAI.addEventListener('click', () => {
    aiPanel.classList.remove('open');
});

// Prompts map
const prompts = {
    'summarize': 'Provide a 3-5 bullet point summary of the following note.',
    'polish': 'Improve the grammar, clarity, and flow of the following note without changing its core meaning.',
    'action-items': 'Extract up to 5 actionable follow-up tasks based on this note.',
    'continue': 'Continue writing the following note from where it left off, maintaining the same tone.',
    'tags': 'Suggest 3 relevant, single-word tags or categories for this note. Return ONLY the tags separated by commas.',
    'rephrase': 'Rephrase the following note to make it sound more professional and formal.'
};

document.querySelectorAll('.ai-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        const instruction = prompts[action];
        callClaude(instruction);
    });
});

btnSubmitAI.addEventListener('click', () => {
    const customPrompt = aiCustomPrompt.value.trim();
    if(customPrompt) callClaude(customPrompt);
});
aiCustomPrompt.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') btnSubmitAI.click();
});

async function callClaude(instruction) {
    if(!currentNoteId) { showToast('Please open a note first.', 'error'); return; }
    const content = noteTitle.value + '\\n\\n' + noteBody.value.trim();
    if(!content && instruction !== prompts['continue'] && !aiCustomPrompt.value) {
        showToast('Note is empty.', 'error'); return;
    }

    const apiKey = localStorage.getItem('notara_apikey');
    if(!apiKey) {
        showToast('Anthropic API Key missing. Please add in Edit Profile.', 'error');
        showModal('profileModal');
        return;
    }

    aiResponseArea.style.display = 'none';
    aiLoader.style.display = 'flex';
    document.querySelectorAll('.ai-action-btn, #btnSubmitAI').forEach(b => b.disabled = true);

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerously-allow-browser': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: [{
                    role: 'user',
                    content: `Instruction: ${instruction}\\n\\nNote Content:\\n${content}`
                }]
            })
        });

        const data = await response.json();
        
        if(!response.ok) {
            throw new Error(data.error?.message || 'Failed to fetch AI response');
        }

        currentAiResponse = data.content?.[0]?.text || '';
        aiResponseText.textContent = currentAiResponse;
        
        aiLoader.style.display = 'none';
        aiResponseArea.style.display = 'flex';
        aiCustomPrompt.value = '';

    } catch(err) {
        aiLoader.style.display = 'none';
        showToast(err.message, 'error');
    } finally {
        document.querySelectorAll('.ai-action-btn, #btnSubmitAI').forEach(b => b.disabled = false);
    }
}

btnAiReplace.addEventListener('click', () => {
    if(currentAiResponse) {
        noteBody.value = currentAiResponse;
        triggerAutoSave();
        showToast('Content replaced', 'success');
    }
});
btnAiAppend.addEventListener('click', () => {
    if(currentAiResponse) {
        noteBody.value += (noteBody.value ? '\\n\\n' : '') + currentAiResponse;
        triggerAutoSave();
        showToast('Content appended', 'success');
    }
});
btnAiCopy.addEventListener('click', () => {
    if(currentAiResponse) {
        navigator.clipboard.writeText(currentAiResponse);
        showToast('Copied to clipboard', 'success');
    }
});
