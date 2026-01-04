// ==================== FIREBASE CONFIGURATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyA3SFtA_Jovccfp6zsA0yOaM9H9zefu5oc",
    authDomain: "promptcraftai-c69af.firebaseapp.com",
    projectId: "promptcraftai-c69af",
    storageBucket: "promptcraftai-c69af.firebasestorage.app",
    messagingSenderId: "613804833006",
    appId: "1:613804833006:web:e32652d1a2a41e05455bff",
    measurementId: "G-L3V72BD4G0"
};

let db = null;
let auth = null;
let firebaseInitialized = false;
let currentUser = null;

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    firebaseInitialized = true;
    console.log('✅ Firebase initialized');
    
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            console.log('✅ User logged in:', user.email);
            updateAdminUI(true, user.email);
        } else {
            updateAdminUI(false);
        }
    });
} catch (error) {
    console.error('❌ Firebase error:', error);
    firebaseInitialized = false;
}

// ==================== PAGE NAVIGATION ====================
function showPage(page) {
    const pages = ['landing', 'gallery', 'generator', 'privacy', 'terms'];
    pages.forEach(p => {
        const el = document.getElementById(p + 'Page');
        if (el) el.classList.add('hidden');
    });
    
    const targetPage = document.getElementById(page + 'Page');
    if (targetPage) targetPage.classList.remove('hidden');
    
    window.scrollTo(0, 0);
    
    if (page === 'gallery') loadGallery();
    
    // Update URL hash
    if (page !== 'landing') {
        history.pushState(null, '', '#' + page);
    } else {
        history.pushState(null, '', window.location.pathname);
    }
}

// Handle browser back/forward
window.addEventListener('popstate', () => {
    const hash = window.location.hash.replace('#', '');
    if (['gallery', 'generator', 'privacy', 'terms'].includes(hash)) {
        showPage(hash);
    } else {
        showPage('landing');
    }
});

// ==================== COOKIE CONSENT ====================
const COOKIE_CONSENT_KEY = 'promptcraft_cookie_consent';

function checkCookieConsent() {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
        setTimeout(() => {
            const banner = document.getElementById('cookieConsentBanner');
            if (banner) banner.classList.remove('hidden');
        }, 1000);
    }
}

function acceptAllCookies() {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ all: true, timestamp: Date.now() }));
    const banner = document.getElementById('cookieConsentBanner');
    if (banner) banner.classList.add('hidden');
    showToast('Cookie preferences saved!');
    if (typeof grantAnalyticsConsent === 'function') grantAnalyticsConsent();
}

function acceptEssentialCookies() {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ essential: true, timestamp: Date.now() }));
    const banner = document.getElementById('cookieConsentBanner');
    if (banner) banner.classList.add('hidden');
    showToast('Only essential cookies enabled');
}

function openCookieSettings() {
    const modal = document.getElementById('cookieSettingsModal');
    if (modal) modal.classList.remove('hidden');
}

function closeCookieSettings() {
    const modal = document.getElementById('cookieSettingsModal');
    if (modal) modal.classList.add('hidden');
}

function saveCustomCookiePreferences() {
    const analytics = document.getElementById('analyticsCookies')?.checked || false;
    const marketing = document.getElementById('marketingCookies')?.checked || false;
    
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
        essential: true,
        analytics: analytics,
        marketing: marketing,
        timestamp: Date.now()
    }));
    
    closeCookieSettings();
    const banner = document.getElementById('cookieConsentBanner');
    if (banner) banner.classList.add('hidden');
    showToast('Cookie preferences saved!');
    
    if (analytics && typeof grantAnalyticsConsent === 'function') {
        grantAnalyticsConsent();
    }
}

// ==================== ADMIN PANEL ====================
function updateAdminUI(isLoggedIn, email = '') {
    const adminLogin = document.getElementById('adminLogin');
    const adminDashboard = document.getElementById('adminDashboard');
    const adminUserEmail = document.getElementById('adminUserEmail');
    
    if (isLoggedIn) {
        if (adminLogin) adminLogin.classList.add('hidden');
        if (adminDashboard) adminDashboard.classList.remove('hidden');
        if (adminUserEmail) adminUserEmail.textContent = email;
        loadAdminCards();
    } else {
        if (adminLogin) adminLogin.classList.remove('hidden');
        if (adminDashboard) adminDashboard.classList.add('hidden');
    }
}

function toggleAdminPanel() {
    const modal = document.getElementById('adminModal');
    if (modal) modal.classList.remove('hidden');
}

function closeAdminPanel() {
    const modal = document.getElementById('adminModal');
    if (modal) modal.classList.add('hidden');
    resetForm();
}

async function loginAdmin() {
    const email = document.getElementById('adminEmail')?.value.trim();
    const password = document.getElementById('adminPassword')?.value;
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    
    if (!email || !password) {
        if (loginError) {
            loginError.textContent = 'Please enter email and password.';
            loginError.classList.remove('hidden');
        }
        return;
    }
    
    if (!auth) {
        if (loginError) {
            loginError.textContent = 'Firebase Auth not configured.';
            loginError.classList.remove('hidden');
        }
        return;
    }
    
    if (loginBtn) {
        loginBtn.innerHTML = '⏳ Signing in...';
        loginBtn.disabled = true;
    }
    if (loginError) loginError.classList.add('hidden');
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Welcome back, Admin!');
        document.getElementById('adminEmail').value = '';
        document.getElementById('adminPassword').value = '';
    } catch (error) {
        let errorMessage = 'Login failed. Please try again.';
        switch (error.code) {
            case 'auth/user-not-found': errorMessage = 'No account found with this email.'; break;
            case 'auth/wrong-password': errorMessage = 'Incorrect password.'; break;
            case 'auth/invalid-email': errorMessage = 'Invalid email address.'; break;
            case 'auth/too-many-requests': errorMessage = 'Too many attempts. Try later.'; break;
            case 'auth/invalid-credential': errorMessage = 'Invalid credentials.'; break;
        }
        if (loginError) {
            loginError.textContent = errorMessage;
            loginError.classList.remove('hidden');
        }
    }
    
    if (loginBtn) {
        loginBtn.innerHTML = '<span>🔓</span> Sign In';
        loginBtn.disabled = false;
    }
}

async function logoutAdmin() {
    if (auth) {
        await auth.signOut();
        showToast('Logged out successfully');
    }
}

// ==================== GALLERY DATA ====================
let galleryData = [];
let currentFilter = 'all';

async function loadGallery() {
    const storageType = document.getElementById('storageType');
    
    if (db && firebaseInitialized) {
        try {
            const snapshot = await db.collection('prompts').orderBy('createdAt', 'desc').get();
            galleryData = [];
            snapshot.forEach(doc => galleryData.push({ id: doc.id, ...doc.data() }));
            if (storageType) {
                storageType.textContent = '☁️ Firebase Connected';
                storageType.className = 'text-green-400';
            }
        } catch (error) {
            console.error('Firebase error:', error);
            if (storageType) {
                storageType.textContent = '⚠️ Firebase Error';
                storageType.className = 'text-red-400';
            }
        }
    } else {
        if (storageType) {
            storageType.textContent = '💾 Local Storage';
            storageType.className = 'text-yellow-400';
        }
    }
    
    renderGallery();
}

function getAiToolBadge(aiTool) {
    if (!aiTool) return '';
    const badges = {
        'Midjourney': '<span class="ai-badge ai-badge-midjourney">🎨 Midjourney</span>',
        'DALL-E': '<span class="ai-badge ai-badge-dalle">🤖 DALL-E</span>',
        'Stable Diffusion': '<span class="ai-badge ai-badge-stable">🎭 Stable Diffusion</span>',
        'Leonardo AI': '<span class="ai-badge ai-badge-leonardo">🦁 Leonardo AI</span>',
        'Adobe Firefly': '<span class="ai-badge ai-badge-firefly">🔥 Firefly</span>',
        'Google ImageFX': '<span class="ai-badge ai-badge-imagefx">✨ ImageFX</span>',
    };
    return badges[aiTool] || '<span class="ai-badge ai-badge-other">🎯 ' + aiTool + '</span>';
}

function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    const emptyState = document.getElementById('emptyGallery');
    
    const filtered = currentFilter === 'all' 
        ? galleryData 
        : galleryData.filter(item => item.category === currentFilter);
    
    if (filtered.length === 0) {
        if (grid) grid.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');
    
    if (grid) {
        grid.innerHTML = filtered.map(item => `
            <article class="gallery-card card-gradient rounded-xl overflow-hidden border border-white/10 cursor-pointer" onclick="viewPrompt('${item.id}')">
                <div class="relative">
                    <img src="${item.image}" alt="${item.title}" class="w-full h-48 object-cover" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300?text=Image+Not+Found'">
                    <div class="absolute top-3 right-3">
                        <span class="bg-purple-600/80 text-white text-xs px-3 py-1 rounded-full capitalize">${item.category}</span>
                    </div>
                    ${item.aiTool ? `<div class="absolute bottom-3 left-3">${getAiToolBadge(item.aiTool)}</div>` : ''}
                </div>
                <div class="p-4">
                    <h3 class="font-semibold text-lg mb-2">${item.title}</h3>
                    ${item.creatorName ? `
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-gray-500 text-xs">by</span>
                        ${item.creatorUrl 
                            ? `<a href="${item.creatorUrl}" target="_blank" onclick="event.stopPropagation()" class="text-purple-400 hover:text-purple-300 text-sm font-medium creator-link">${item.creatorName}${item.creatorHandle ? ` <span class="text-gray-500">${item.creatorHandle}</span>` : ''}</a>` 
                            : `<span class="text-gray-400 text-sm">${item.creatorName}</span>`}
                    </div>` : ''}
                    <p class="text-gray-400 text-sm prompt-text mb-3">${item.prompt}</p>
                    <div class="flex flex-wrap gap-1 mb-3">
                        ${(item.tags || []).slice(0, 3).map(tag => `<span class="bg-white/10 text-gray-300 text-xs px-2 py-1 rounded">${tag}</span>`).join('')}
                    </div>
                    <button onclick="event.stopPropagation(); copyPromptById('${item.id}')" class="w-full bg-purple-600/50 hover:bg-purple-600/70 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2">
                        <span>📋</span> Copy Prompt
                    </button>
                </div>
            </article>
        `).join('');
    }
}

function filterGallery(category) {
    currentFilter = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const isActive = btn.dataset.filter === category;
        btn.classList.toggle('bg-purple-600/50', isActive);
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('text-gray-300', !isActive);
    });
    renderGallery();
}

function viewPrompt(id) {
    const item = galleryData.find(d => d.id === id);
    if (!item) return;
    
    document.getElementById('viewModalImage').src = item.image;
    document.getElementById('viewModalTitle').textContent = item.title;
    document.getElementById('viewModalPrompt').textContent = item.prompt;
    document.getElementById('viewModalTags').innerHTML = (item.tags || []).map(tag => 
        `<span class="bg-purple-600/30 text-purple-300 text-sm px-3 py-1 rounded-full">${tag}</span>`
    ).join('');
    
    // AI Tool Badge
    const aiBadgeEl = document.getElementById('viewModalAiBadge');
    if (aiBadgeEl) aiBadgeEl.innerHTML = item.aiTool ? getAiToolBadge(item.aiTool) : '';
    
    // Creator Info
    const creatorSection = document.getElementById('viewModalCreator');
    if (creatorSection) {
        if (item.creatorName) {
            creatorSection.classList.remove('hidden');
            document.getElementById('viewModalCreatorName').textContent = item.creatorName;
            document.getElementById('viewModalCreatorHandle').textContent = item.creatorHandle || '';
            const creatorLink = document.getElementById('viewModalCreatorLink');
            if (creatorLink) creatorLink.href = item.creatorUrl || '#';
        } else {
            creatorSection.classList.add('hidden');
        }
    }
    
    document.getElementById('viewPromptModal').classList.remove('hidden');
    document.getElementById('viewPromptModal').dataset.promptId = id;
}

function closeViewModal() {
    const modal = document.getElementById('viewPromptModal');
    if (modal) modal.classList.add('hidden');
}

function copyGalleryPrompt() {
    const id = document.getElementById('viewPromptModal')?.dataset.promptId;
    if (id) copyPromptById(id);
}

function copyPromptById(id) {
    const item = galleryData.find(d => d.id === id);
    if (item) {
        navigator.clipboard.writeText(item.prompt).then(() => showToast('Prompt copied to clipboard!'));
    }
}

// ==================== SUBMIT MODAL ====================
function openSubmitModal() {
    const modal = document.getElementById('submitModal');
    if (modal) modal.classList.remove('hidden');
}

function closeSubmitModal() {
    const modal = document.getElementById('submitModal');
    if (modal) modal.classList.add('hidden');
    const form = document.getElementById('submitForm');
    if (form) form.reset();
    const preview = document.getElementById('submitImagePreview');
    if (preview) preview.classList.add('hidden');
}

function previewSubmitImage(event) {
    const url = event.target.value;
    if (url) {
        const previewImg = document.getElementById('submitPreviewImg');
        const previewContainer = document.getElementById('submitImagePreview');
        if (previewImg) previewImg.src = url;
        if (previewContainer) previewContainer.classList.remove('hidden');
    }
}

async function submitCreation(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Submitting...';
    btn.disabled = true;
    
    const submission = {
        title: document.getElementById('submitTitle').value,
        prompt: document.getElementById('submitPrompt').value,
        image: document.getElementById('submitImageUrl').value,
        category: document.getElementById('submitCategory').value,
        aiTool: document.getElementById('submitAiTool').value,
        creatorName: document.getElementById('submitCreatorName').value || null,
        creatorHandle: document.getElementById('submitCreatorHandle').value || null,
        creatorUrl: document.getElementById('submitCreatorUrl').value || null,
        tags: document.getElementById('submitTags').value.split(',').map(t => t.trim()).filter(t => t),
        status: 'pending',
        createdAt: Date.now()
    };
    
    try {
        if (db && firebaseInitialized) {
            await db.collection('submissions').add(submission);
        }
        showToast('🎉 Submission received! It will be reviewed shortly.');
        closeSubmitModal();
    } catch (error) {
        console.error('Submit error:', error);
        showToast('Error submitting. Please try again.', true);
    }
    
    btn.innerHTML = originalText;
    btn.disabled = false;
}

// ==================== ADMIN CARD MANAGEMENT ====================
async function loadAdminCards() {
    if (db && firebaseInitialized) {
        try {
            const snapshot = await db.collection('prompts').orderBy('createdAt', 'desc').get();
            galleryData = [];
            snapshot.forEach(doc => galleryData.push({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Load admin cards error:', error);
        }
    }
    
    const list = document.getElementById('adminCardsList');
    if (!list) return;
    
    if (galleryData.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-center py-4">No prompts yet. Add your first one above!</p>';
        return;
    }
    
    list.innerHTML = galleryData.map(item => `
        <div class="flex items-center gap-4 bg-black/30 rounded-lg p-3">
            <img src="${item.image}" alt="${item.title}" class="w-16 h-16 object-cover rounded" onerror="this.src='https://via.placeholder.com/64'">
            <div class="flex-1 min-w-0">
                <h4 class="font-medium truncate">${item.title}</h4>
                <p class="text-gray-400 text-sm capitalize">${item.category}${item.aiTool ? ' • ' + item.aiTool : ''}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="editCard('${item.id}')" class="bg-blue-600/50 hover:bg-blue-600/70 px-3 py-2 rounded text-sm">✏️</button>
                <button onclick="deleteCard('${item.id}')" class="bg-red-600/50 hover:bg-red-600/70 px-3 py-2 rounded text-sm">🗑️</button>
            </div>
        </div>
    `).join('');
}

function previewImageUrl(event) {
    const url = event.target.value;
    const preview = document.getElementById('imagePreview');
    const container = document.getElementById('imagePreviewContainer');
    if (url && preview && container) {
        preview.src = url;
        container.classList.remove('hidden');
    } else if (container) {
        container.classList.add('hidden');
    }
}

async function savePromptCard(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Saving...';
    btn.disabled = true;
    
    const editingId = document.getElementById('editingId').value;
    const cardData = {
        title: document.getElementById('cardTitle').value,
        category: document.getElementById('cardCategory').value,
        prompt: document.getElementById('cardPrompt').value,
        image: document.getElementById('cardImageUrl').value,
        aiTool: document.getElementById('cardAiTool')?.value || null,
        creatorName: document.getElementById('cardCreatorName')?.value || null,
        creatorHandle: document.getElementById('cardCreatorHandle')?.value || null,
        creatorUrl: document.getElementById('cardCreatorUrl')?.value || null,
        tags: document.getElementById('cardTags').value.split(',').map(t => t.trim()).filter(t => t),
        updatedAt: Date.now()
    };
    
    if (!editingId) cardData.createdAt = Date.now();
    
    // Remove null values
    Object.keys(cardData).forEach(key => cardData[key] === null && delete cardData[key]);
    
    try {
        if (db && firebaseInitialized) {
            if (editingId) {
                await db.collection('prompts').doc(editingId).update(cardData);
            } else {
                await db.collection('prompts').add(cardData);
            }
        }
        await loadAdminCards();
        await loadGallery();
        resetForm();
        showToast(editingId ? 'Prompt updated!' : 'Prompt added!');
    } catch (error) {
        console.error('Save error:', error);
        showToast('Error saving. Please try again.', true);
    }
    
    btn.innerHTML = originalText;
    btn.disabled = false;
}

function editCard(id) {
    const item = galleryData.find(d => d.id === id);
    if (!item) return;
    
    document.getElementById('editingId').value = id;
    document.getElementById('cardTitle').value = item.title;
    document.getElementById('cardCategory').value = item.category;
    document.getElementById('cardPrompt').value = item.prompt;
    document.getElementById('cardImageUrl').value = item.image;
    document.getElementById('cardTags').value = (item.tags || []).join(', ');
    
    if (document.getElementById('cardAiTool')) {
        document.getElementById('cardAiTool').value = item.aiTool || '';
    }
    if (document.getElementById('cardCreatorName')) {
        document.getElementById('cardCreatorName').value = item.creatorName || '';
    }
    if (document.getElementById('cardCreatorHandle')) {
        document.getElementById('cardCreatorHandle').value = item.creatorHandle || '';
    }
    if (document.getElementById('cardCreatorUrl')) {
        document.getElementById('cardCreatorUrl').value = item.creatorUrl || '';
    }
    
    const preview = document.getElementById('imagePreview');
    const container = document.getElementById('imagePreviewContainer');
    if (preview) preview.src = item.image;
    if (container) container.classList.remove('hidden');
    
    document.getElementById('formTitle').textContent = '✏️ Edit Prompt';
    document.getElementById('promptForm').scrollIntoView({ behavior: 'smooth' });
}

async function deleteCard(id) {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    
    try {
        if (db && firebaseInitialized) {
            await db.collection('prompts').doc(id).delete();
        }
        await loadAdminCards();
        await loadGallery();
        showToast('Prompt deleted!');
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Error deleting.', true);
    }
}

function resetForm() {
    const form = document.getElementById('promptForm');
    if (form) form.reset();
    document.getElementById('editingId').value = '';
    const container = document.getElementById('imagePreviewContainer');
    if (container) container.classList.add('hidden');
    const title = document.getElementById('formTitle');
    if (title) title.textContent = '➕ Add New Prompt';
}

// ==================== GENERATOR ====================
const selections = {
    subject: '',
    imageType: [], shotType: [], cameraAngle: [], view: [],
    subjectPosition: [], composition: [], lighting: [], rimLighting: [],
    mood: [], style: [], artStylePresets: [], emotion: [],
    womenHair: [], menHair: [], hairColor: [],
    outfit: [], background: [], timeOfDay: [], weather: [],
    camera: [], dof: [], colorGrading: [], quality: [], aspectRatio: [],
    negativePrompts: [],
    referenceType: [], facePreservation: [], styleTransfer: [], compositionRef: []
};

let useReference = false;
let referenceStrength = 75;

function generatePrompt() {
    const parts = [];
    if (selections.subject) parts.push(selections.subject);
    
    const order = ['imageType', 'shotType', 'cameraAngle', 'view', 'emotion', 'outfit',
        'womenHair', 'menHair', 'hairColor', 'subjectPosition', 'composition',
        'background', 'timeOfDay', 'weather', 'lighting', 'rimLighting',
        'mood', 'style', 'artStylePresets', 'camera', 'dof', 'colorGrading',
        'quality', 'aspectRatio'];
    
    order.forEach(category => {
        if (selections[category] && selections[category].length > 0) {
            parts.push(selections[category].join(', '));
        }
    });
    
    let prompt = parts.join(', ');
    
    // Add reference image context if enabled
    if (useReference) {
        const refParts = [];
        
        // Add reference type context
        if (selections.referenceType.includes('Character Reference')) {
            refParts.push('use reference image for face/character');
        }
        if (selections.referenceType.includes('Style Reference')) {
            refParts.push('use reference image for style');
        }
        if (selections.referenceType.includes('Pose Reference')) {
            refParts.push('use reference image for pose');
        }
        if (selections.referenceType.includes('Image Reference')) {
            refParts.push('use reference image as base');
        }
        
        // Add face preservation options
        if (selections.facePreservation.length > 0) {
            refParts.push(selections.facePreservation.join(', '));
        }
        
        // Add style transfer options
        if (selections.styleTransfer.length > 0) {
            refParts.push(selections.styleTransfer.join(', '));
        }
        
        // Add composition options
        if (selections.compositionRef.length > 0) {
            refParts.push(selections.compositionRef.join(', '));
        }
        
        // Add strength indicator
        if (refParts.length > 0) {
            let strengthLabel = 'moderate';
            if (referenceStrength <= 25) strengthLabel = 'subtle';
            else if (referenceStrength <= 50) strengthLabel = 'moderate';
            else if (referenceStrength <= 75) strengthLabel = 'strong';
            else strengthLabel = 'very strong';
            
            prompt += ', ' + refParts.join(', ') + `, ${strengthLabel} reference influence (${referenceStrength}%)`;
        }
    }
    
    // Negative prompts
    let negativePrompt = '';
    const negatives = [...selections.negativePrompts];
    const customNegative = document.getElementById('customNegative');
    if (customNegative && customNegative.value.trim()) {
        negatives.push(...customNegative.value.split(',').map(n => n.trim()).filter(n => n));
    }
    if (negatives.length > 0) {
        negativePrompt = negatives.join(', ');
    }
    
    const outputEl = document.getElementById('promptOutput');
    if (outputEl) {
        if (prompt || negativePrompt) {
            let output = prompt || '';
            if (negativePrompt) {
                output += '\n\n<span class="text-red-400 font-semibold">🚫 Negative Prompt:</span>\n<span class="text-red-300">' + negativePrompt + '</span>';
            }
            outputEl.innerHTML = output;
        } else {
            outputEl.innerHTML = '<span class="text-gray-500 italic">Your prompt will appear here...</span>';
        }
    }
    
    updateSelectedTags();
}

function updateSelectedTags() {
    const container = document.getElementById('selectedTags');
    if (!container) return;
    
    const allTags = [];
    Object.keys(selections).forEach(key => {
        if (key === 'subject' && selections.subject) {
            allTags.push('Subject: ' + selections.subject.substring(0, 20) + '...');
        } else if (Array.isArray(selections[key])) {
            selections[key].forEach(val => allTags.push(val));
        }
    });
    
    if (allTags.length === 0) {
        container.innerHTML = '<span class="text-gray-500 text-sm italic">No elements selected</span>';
    } else {
        container.innerHTML = allTags.map(tag =>
            `<span class="bg-purple-600/30 text-purple-300 px-2 py-1 rounded text-xs">${tag}</span>`
        ).join('');
    }
}

function copyPrompt() {
    const outputEl = document.getElementById('promptOutput');
    if (!outputEl) return;
    
    let text = outputEl.innerText;
    text = text.replace('🚫 Negative Prompt:', '\n\nNegative Prompt:');
    
    if (text && !text.includes('Your prompt will appear here')) {
        navigator.clipboard.writeText(text.trim()).then(() => showToast('Prompt copied!'));
    }
}

function clearAll() {
    const subjectInput = document.getElementById('subject');
    if (subjectInput) subjectInput.value = '';
    selections.subject = '';
    
    const customNegative = document.getElementById('customNegative');
    if (customNegative) customNegative.value = '';
    
    Object.keys(selections).forEach(key => {
        if (Array.isArray(selections[key])) selections[key] = [];
    });
    
    document.querySelectorAll('.option-btn.selected, .ref-option.selected').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    const refCheckbox = document.getElementById('useReferenceImage');
    if (refCheckbox) {
        refCheckbox.checked = false;
        useReference = false;
    }
    const refOptions = document.getElementById('referenceOptions');
    if (refOptions) refOptions.classList.add('hidden');
    
    generatePrompt();
}

function randomizeAll() {
    clearAll();
    
    const subjects = [
        'A beautiful woman with flowing golden hair',
        'A mysterious warrior in ancient armor',
        'A futuristic robot with glowing blue eyes',
        'An enchanted forest with magical creatures'
    ];
    
    const subjectInput = document.getElementById('subject');
    if (subjectInput) {
        subjectInput.value = subjects[Math.floor(Math.random() * subjects.length)];
        selections.subject = subjectInput.value;
    }
    
    ['imageType', 'shotType', 'lighting', 'mood', 'style', 'quality'].forEach(category => {
        const container = document.getElementById(category);
        if (container) {
            const buttons = container.querySelectorAll('.option-btn');
            if (buttons.length > 0) {
                const randomBtn = buttons[Math.floor(Math.random() * buttons.length)];
                randomBtn.click();
            }
        }
    });
    
    generatePrompt();
}

// Reference Image Functions
function toggleReferenceOptions() {
    const checkbox = document.getElementById('useReferenceImage');
    const optionsDiv = document.getElementById('referenceOptions');
    useReference = checkbox?.checked || false;
    
    console.log('Toggle Reference:', useReference); // Debug
    
    if (optionsDiv) {
        if (useReference) {
            optionsDiv.classList.remove('hidden');
        } else {
            optionsDiv.classList.add('hidden');
            selections.referenceType = [];
            selections.facePreservation = [];
            selections.styleTransfer = [];
            selections.compositionRef = [];
            document.querySelectorAll('.ref-option.selected').forEach(btn => btn.classList.remove('selected'));
            // Hide sub-options
            document.getElementById('faceOptions')?.classList.add('hidden');
            document.getElementById('styleRefOptions')?.classList.add('hidden');
            document.getElementById('poseOptions')?.classList.add('hidden');
        }
    }
    generatePrompt();
}

// Update sub-options based on reference type
function updateReferenceSubOptions() {
    const faceOptions = document.getElementById('faceOptions');
    const styleOptions = document.getElementById('styleRefOptions');
    const poseOptions = document.getElementById('poseOptions');
    
    // Hide all first
    faceOptions?.classList.add('hidden');
    styleOptions?.classList.add('hidden');
    poseOptions?.classList.add('hidden');
    
    // Show based on selected reference type
    if (selections.referenceType.includes('Character Reference')) {
        faceOptions?.classList.remove('hidden');
    }
    if (selections.referenceType.includes('Style Reference')) {
        styleOptions?.classList.remove('hidden');
    }
    if (selections.referenceType.includes('Pose Reference') || selections.referenceType.includes('Image Reference')) {
        poseOptions?.classList.remove('hidden');
    }
}

function updateStrength() {
    const slider = document.getElementById('referenceStrength');
    const display = document.getElementById('strengthValue');
    const mjStrength = document.getElementById('mjStrength');
    
    if (slider && display) {
        referenceStrength = parseInt(slider.value);
        display.textContent = referenceStrength + '%';
    }
    if (mjStrength) {
        mjStrength.textContent = referenceStrength;
    }
    generatePrompt();
}

// ==================== AI ENHANCEMENT ====================
async function enhanceWithAI(type) {
    const promptOutput = document.getElementById('promptOutput');
    const currentPrompt = promptOutput?.innerText;
    
    if (!currentPrompt || currentPrompt.includes('Your prompt will appear here')) {
        showToast('Please create a prompt first!', true);
        return;
    }
    
    const aiLoading = document.getElementById('aiLoading');
    if (aiLoading) aiLoading.classList.remove('hidden');
    
    const aiButtons = document.querySelectorAll('[onclick^="enhanceWithAI"]');
    aiButtons.forEach(btn => btn.disabled = true);
    
    try {
        const response = await fetch('https://promptcraftsai.vercel.app/api/enhance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: currentPrompt, type: type })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const titles = {
                'enhance': '<div class="text-purple-300 font-semibold mb-2">✨ Enhanced Prompt:</div>',
                'analyze': '<div class="text-purple-300 font-semibold mb-2">📊 Prompt Analysis:</div>',
                'variations': '<div class="text-green-300 font-semibold mb-2">🎲 Prompt Variations:</div>',
                'negative': '<div class="text-red-300 font-semibold mb-2">🚫 Suggested Negatives:</div>'
            };
            promptOutput.innerHTML = (titles[type] || '') + data.result;
            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} complete!`);
        } else {
            showToast('AI Error: ' + data.error, true);
        }
    } catch (error) {
        showToast('Failed to connect to AI service.', true);
        console.error('AI error:', error);
    }
    
    if (aiLoading) aiLoading.classList.add('hidden');
    aiButtons.forEach(btn => btn.disabled = false);
}

// ==================== SHARE FUNCTIONS ====================
const siteUrl = 'https://promptcraftai.xyz';

function getCurrentGalleryPrompt() {
    const id = document.getElementById('viewPromptModal')?.dataset.promptId;
    return galleryData.find(d => d.id === id) || null;
}

function shareToTwitter() {
    const item = getCurrentGalleryPrompt();
    if (!item) return;
    const text = `Check out this AI prompt! 🎨\n\n"${item.prompt.substring(0, 180)}..."\n\nCreate yours at`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(siteUrl)}`, '_blank');
}

function shareToFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}`, '_blank');
}

function shareToPinterest() {
    const item = getCurrentGalleryPrompt();
    if (!item) return;
    window.open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(siteUrl)}&media=${encodeURIComponent(item.image)}&description=${encodeURIComponent(item.prompt)}`, '_blank');
}

function shareToLinkedIn() {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}`, '_blank');
}

function shareToWhatsApp() {
    const item = getCurrentGalleryPrompt();
    if (!item) return;
    const text = `Check out this AI prompt! 🎨\n\n${item.prompt}\n\n${siteUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function shareToReddit() {
    const item = getCurrentGalleryPrompt();
    if (!item) return;
    window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(siteUrl)}&title=${encodeURIComponent(item.title)}`, '_blank');
}

function copyShareLink() {
    navigator.clipboard.writeText(siteUrl + '/#gallery').then(() => showToast('Link copied!'));
}

function shareGeneratedToTwitter() {
    const prompt = getGeneratedPromptText();
    if (!prompt) { showToast('Create a prompt first!', true); return; }
    const text = `Just created this AI prompt! 🎨\n\n"${prompt.substring(0, 150)}..."\n\nMake yours at`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(siteUrl)}`, '_blank');
}

function shareGeneratedToReddit() {
    const prompt = getGeneratedPromptText();
    if (!prompt) { showToast('Create a prompt first!', true); return; }
    window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(siteUrl)}&title=AI+Prompt+from+PromptCraft&selftext=true&text=${encodeURIComponent(prompt)}`, '_blank');
}

function getGeneratedPromptText() {
    const outputEl = document.getElementById('promptOutput');
    if (!outputEl) return null;
    let text = outputEl.innerText;
    if (text.includes('Your prompt will appear here')) return null;
    return text.replace('🚫 Negative Prompt:', '\n\nNegative Prompt:').trim();
}

function downloadPromptAsText() {
    const prompt = getGeneratedPromptText();
    if (!prompt) { showToast('Create a prompt first!', true); return; }
    
    const content = `AI Image Prompt\nGenerated by PromptCraft AI\n${'='.repeat(50)}\n\n${prompt}\n\n${'='.repeat(50)}\nCreated: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ai-prompt-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Prompt downloaded!');
}

function quickShareToTwitter(id) {
    const item = galleryData.find(d => d.id === id);
    if (!item) return;
    const text = `🎨 AI Prompt:\n\n"${item.prompt.substring(0, 180)}..."\n\nCreate yours at`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(siteUrl)}`, '_blank');
}

function quickShareMenu(id) {
    const item = galleryData.find(d => d.id === id);
    if (!item) return;
    if (navigator.share) {
        navigator.share({ title: item.title, text: item.prompt, url: siteUrl + '/#gallery' });
    } else {
        viewPrompt(id);
    }
}

// ==================== UTILITY ====================
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 ${isError ? 'bg-red-600' : 'bg-green-600'} text-white px-6 py-3 rounded-lg shadow-lg z-[200] fade-in`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ==================== LIVE COUNTER ANIMATION ====================
function animateCounter(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let startTime = null;
    const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        element.textContent = current.toLocaleString();
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    };
    requestAnimationFrame(step);
}

function initLiveCounters() {
    // Animate counters on page load
    animateCounter('promptsToday', 0, 12847 + Math.floor(Math.random() * 500), 2000);
    animateCounter('creatorsOnline', 0, 2341 + Math.floor(Math.random() * 200), 1500);
    animateCounter('totalCopied', 0, 89432 + Math.floor(Math.random() * 1000), 2500);
    
    // Update counters periodically
    setInterval(() => {
        const promptsEl = document.getElementById('promptsToday');
        const creatorsEl = document.getElementById('creatorsOnline');
        if (promptsEl) {
            const current = parseInt(promptsEl.textContent.replace(/,/g, ''));
            promptsEl.textContent = (current + Math.floor(Math.random() * 5) + 1).toLocaleString();
        }
        if (creatorsEl) {
            const current = parseInt(creatorsEl.textContent.replace(/,/g, ''));
            const change = Math.floor(Math.random() * 20) - 10;
            creatorsEl.textContent = Math.max(2000, current + change).toLocaleString();
        }
    }, 5000);
}

// ==================== TYPING ANIMATION ====================
const typingPrompts = [
    [
        { text: 'A beautiful woman with flowing auburn hair', class: 'tag-subject' },
        { text: 'Portrait, Close-up', class: 'tag-type' },
        { text: 'Eye Level, 3/4 View', class: 'tag-angle' },
        { text: 'Golden Hour lighting, Rim Light', class: 'tag-lighting' },
        { text: 'Dreamy mood, Cinematic style', class: 'tag-style' },
        { text: '8K Resolution, Award Winning', class: 'tag-quality' }
    ],
    [
        { text: 'A majestic dragon soaring through clouds', class: 'tag-subject' },
        { text: 'Fantasy, Wide Shot', class: 'tag-type' },
        { text: 'Low Angle, Dynamic', class: 'tag-angle' },
        { text: 'Volumetric lighting, Sun rays', class: 'tag-lighting' },
        { text: 'Epic mood, Digital art style', class: 'tag-style' },
        { text: 'Highly detailed, Masterpiece', class: 'tag-quality' }
    ],
    [
        { text: 'A futuristic cyberpunk cityscape', class: 'tag-subject' },
        { text: 'Landscape, Establishing Shot', class: 'tag-type' },
        { text: 'Bird\'s Eye View', class: 'tag-angle' },
        { text: 'Neon lights, Rain reflections', class: 'tag-lighting' },
        { text: 'Sci-Fi mood, Blade Runner style', class: 'tag-style' },
        { text: 'Ultra HD, Photorealistic', class: 'tag-quality' }
    ],
    [
        { text: 'A peaceful Japanese garden in spring', class: 'tag-subject' },
        { text: 'Landscape, Medium Shot', class: 'tag-type' },
        { text: 'Eye Level, Symmetrical', class: 'tag-angle' },
        { text: 'Soft morning light, Misty', class: 'tag-lighting' },
        { text: 'Serene mood, Studio Ghibli style', class: 'tag-style' },
        { text: 'Detailed, Vibrant colors', class: 'tag-quality' }
    ]
];

let currentPromptIndex = 0;
let currentTagIndex = 0;

function typeNextTag() {
    const typingDemo = document.getElementById('typingDemo');
    if (!typingDemo) return;
    
    const currentPrompt = typingPrompts[currentPromptIndex];
    
    if (currentTagIndex < currentPrompt.length) {
        const tag = currentPrompt[currentTagIndex];
        const separator = currentTagIndex > 0 ? ', ' : '';
        const tagHtml = `${separator}<span class="prompt-tag ${tag.class}">${tag.text}</span>`;
        typingDemo.innerHTML += tagHtml;
        currentTagIndex++;
        setTimeout(typeNextTag, 800 + Math.random() * 400);
    } else {
        // Wait and then start new prompt
        setTimeout(() => {
            currentPromptIndex = (currentPromptIndex + 1) % typingPrompts.length;
            currentTagIndex = 0;
            typingDemo.innerHTML = '';
            typeNextTag();
        }, 3000);
    }
}

function initTypingAnimation() {
    setTimeout(typeNextTag, 1000);
}

// ==================== GALLERY SLIDER ====================
function initGallerySlider() {
    const sliderCards = document.querySelectorAll('.slider-card');
    sliderCards.forEach(card => {
        card.addEventListener('click', () => {
            showPage('gallery');
        });
    });
}

// ==================== QUICK START TEMPLATES ====================
const quickStartTemplates = {
    portrait: {
        subject: 'A beautiful woman with elegant features',
        imageType: ['Portrait'],
        shotType: ['Close-up'],
        lighting: ['Golden Hour', 'Rim Light'],
        mood: ['Dreamy'],
        style: ['Cinematic'],
        emotion: ['peaceful expression, serene'],
        womenHair: ['Long Flowing Hair'],
        hairColor: ['Auburn Hair'],
        dof: ['Shallow DOF f/1.4'],
        quality: ['8K Resolution', 'Sharp Focus']
    },
    landscape: {
        subject: 'Majestic mountain peaks at sunrise',
        imageType: ['Landscape'],
        shotType: ['Wide Shot'],
        lighting: ['Golden Hour', 'Volumetric Lighting'],
        mood: ['Epic'],
        style: ['Photorealistic'],
        timeOfDay: ['Golden Hour'],
        weather: ['Foggy'],
        colorGrading: ['Warm Tones'],
        quality: ['8K Resolution', 'Highly Detailed']
    },
    scifi: {
        subject: 'A futuristic space station orbiting a distant planet',
        imageType: ['Architecture'],
        shotType: ['Wide Shot'],
        lighting: ['Neon Lighting', 'Volumetric Lighting'],
        mood: ['Epic', 'Mysterious'],
        style: ['Sci-Fi'],
        background: ['Space'],
        colorGrading: ['Cool Tones', 'Teal and Orange'],
        quality: ['Ultra HD', 'Highly Detailed']
    },
    fantasy: {
        subject: 'An enchanted forest with magical creatures',
        imageType: ['Landscape'],
        shotType: ['Medium Shot'],
        lighting: ['Volumetric Lighting', 'Backlit'],
        mood: ['Ethereal', 'Mysterious'],
        style: ['Fantasy'],
        artStylePresets: ['Studio Ghibli style'],
        timeOfDay: ['Dusk'],
        quality: ['Masterpiece', 'Highly Detailed']
    },
    product: {
        subject: 'A luxury watch on a marble surface',
        imageType: ['Product Shot'],
        shotType: ['Close-up'],
        lighting: ['Studio Lighting'],
        mood: ['Dreamy'],
        style: ['Photorealistic'],
        background: ['Studio Backdrop'],
        dof: ['Shallow DOF f/1.4'],
        colorGrading: ['Vibrant Colors'],
        quality: ['8K Resolution', 'Sharp Focus']
    }
};

function quickStartTemplate(templateName) {
    const template = quickStartTemplates[templateName];
    if (!template) return;
    
    // Switch to generator page
    showPage('generator');
    
    // Wait for page to render, then apply template
    setTimeout(() => {
        // Clear existing selections
        clearAll();
        
        // Set subject
        const subjectInput = document.getElementById('subject');
        if (subjectInput) {
            subjectInput.value = template.subject;
            selections.subject = template.subject;
        }
        
        // Apply each category
        Object.keys(template).forEach(category => {
            if (category === 'subject') return;
            
            const values = template[category];
            const container = document.getElementById(category);
            
            if (container && values) {
                values.forEach(value => {
                    const btn = container.querySelector(`[data-value="${value}"]`);
                    if (btn) {
                        btn.click();
                    }
                });
            }
        });
        
        generatePrompt();
        showToast(`🚀 ${templateName.charAt(0).toUpperCase() + templateName.slice(1)} template loaded!`);
    }, 300);
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize landing page features
    initLiveCounters();
    initTypingAnimation();
    initGallerySlider();
    
    // Check cookie consent
    checkCookieConsent();
    
    // Subject input
    const subjectInput = document.getElementById('subject');
    if (subjectInput) {
        subjectInput.addEventListener('input', (e) => {
            selections.subject = e.target.value;
            generatePrompt();
        });
    }
    
    // Custom negative input
    const customNegative = document.getElementById('customNegative');
    if (customNegative) {
        customNegative.addEventListener('input', generatePrompt);
    }
    
    // Option buttons
    const categories = Object.keys(selections).filter(k => k !== 'subject');
    categories.forEach(category => {
        const container = document.getElementById(category);
        if (container) {
            container.querySelectorAll('.option-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const value = btn.dataset.value;
                    const index = selections[category].indexOf(value);
                    if (index > -1) {
                        selections[category].splice(index, 1);
                        btn.classList.remove('selected');
                    } else {
                        selections[category].push(value);
                        btn.classList.add('selected');
                    }
                    generatePrompt();
                });
            });
        }
    });
    
    // Load gallery
    loadGallery();
    
    // Reference option buttons
    document.querySelectorAll('.ref-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = btn.parentElement;
            const category = parent.id;
            const value = btn.dataset.value;
            
            if (selections[category]) {
                const index = selections[category].indexOf(value);
                if (index > -1) {
                    selections[category].splice(index, 1);
                    btn.classList.remove('selected');
                } else {
                    selections[category].push(value);
                    btn.classList.add('selected');
                }
            }
            
            // Update sub-options visibility
            if (category === 'referenceType') {
                updateReferenceSubOptions();
            }
            
            generatePrompt();
        });
    });
    
    // URL hash navigation
    const hash = window.location.hash.replace('#', '');
    if (['gallery', 'generator', 'privacy', 'terms'].includes(hash)) {
        showPage(hash);
    }
});

// Escape key closes modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAdminPanel();
        closeViewModal();
        closeSubmitModal();
        closeCookieSettings();
    }
});

// Click outside modal closes it
document.addEventListener('click', (e) => {
    if (e.target.id === 'adminModal') closeAdminPanel();
    if (e.target.id === 'viewPromptModal') closeViewModal();
    if (e.target.id === 'submitModal') closeSubmitModal();
    if (e.target.id === 'cookieSettingsModal') closeCookieSettings();
});