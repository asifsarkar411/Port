const getBaseUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname) {
        if (window.location.port === '5000') {
            return '';
        }
        return 'http://localhost:5000';
    }
    return '';
};
const BASE_URL = getBaseUrl();
const API_URL = `${BASE_URL}/api`;
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');

let token = localStorage.getItem('adminToken');
if (token) showDashboard();

async function authFetch(url, options = {}) {
    if (!options.headers) {
        options.headers = {};
    }
    options.headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, options);
    if (res.status === 401 || res.status === 400) {
        showLogin();
        throw new Error('Unauthorized session terminated.');
    }
    return res;
}

function showDashboard() {
    loginContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    setupNavigationRouting();
    
    // Core Engine Refresher System Initialization
    loadProjects();
    loadProjectTypes();
    loadAdminExperience();
    loadAdminSkills();
    loadAdminEducation();
    loadAdminCV();
    loadProfileState();
    loadAdminMessages();
}

function showLogin() {
    loginContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
    localStorage.removeItem('adminToken');
    token = null;
}

// PREMIUM SPA MULTI-VIEW NAVIGATION TAB ROUTER
function setupNavigationRouting() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.view-section');
    const titleHeader = document.getElementById('workspace-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active-view'));

            item.classList.add('active');
            const target = item.getAttribute('data-target');
            document.getElementById(target).classList.add('active-view');
            titleHeader.innerText = item.innerText;
        });
    });

    // REDIRECT ENVELOPE CLICK TO DASHBOARD SECTION
    const bellIcon = document.getElementById('top-notification-bell');
    bellIcon.addEventListener('click', () => {
        navItems.forEach(i => i.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active-view'));
        
        const dashMenuItem = document.querySelector('.nav-menu-dashboard');
        if(dashMenuItem) dashMenuItem.classList.add('active');
        
        document.getElementById('section-dashboard').classList.add('active-view');
        titleHeader.innerText = "Dashboard Overview";
    });
}

// SECURE Gateway User Auth Entry Execution
// SECURE Gateway User Auth Entry Execution
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: document.getElementById('admin-username').value,
                password: document.getElementById('admin-password').value
            })
        });
        const data = await res.json();
        if (!res.ok) {
            // ❌ login failed → show message, clear token, stay on login page
            alert(data.message || 'Authentication failed');
            localStorage.removeItem('adminToken');
            token = null;
            return;
        }
        // ✅ login succeeded → store token and go to dashboard
        localStorage.setItem('adminToken', data.token);
        token = data.token;
        showDashboard(); // only called on success
    } catch (e) {
        console.error('Login error:', e);
        alert('Authentication failed: Server error during authentication.');
    }
});

logoutBtn.addEventListener('click', showLogin);

// PROFILE AVATAR LIVE STORAGE MANAGER PIPELINE
async function loadProfileState() {
    const res = await fetch(`${API_URL}/profile`);
    const data = await res.json();
    const avatar = document.getElementById('profile-avatar');
    if (avatar && data.avatarUrl) {
        avatar.onerror = () => { avatar.src = 'https://placehold.co/100'; };
        avatar.src = (data.avatarUrl.startsWith('http') || data.avatarUrl.startsWith('data:')) ? data.avatarUrl : `${BASE_URL}${data.avatarUrl}`;
    }
}

document.getElementById('hidden-avatar-input').addEventListener('change', async (e) => {
    if(!e.target.files[0]) return;
    const fd = new FormData();
    fd.append('profileImage', e.target.files[0]);
    
    const res = await authFetch(`${API_URL}/profile`, { 
        method: 'POST', 
        body: fd 
    });
    if (res.ok) {
        const data = await res.json();
        const avatar = document.getElementById('profile-avatar');
        if (avatar) avatar.onerror = () => { avatar.src = 'https://placehold.co/100'; };
        avatar.src = (data.avatarUrl.startsWith('http') || data.avatarUrl.startsWith('data:')) ? data.avatarUrl : `${BASE_URL}${data.avatarUrl}`;
    }
});

// WORK EXPERIENCE CONTROLLER PIPELINE
// Local memory cache for edit references
let adminExperiences = [];
let adminSkills = [];
let adminProjects = [];
let adminEducations = [];

async function loadAdminExperience() {
    const res = await fetch(`${API_URL}/experience`);
    const experiences = await res.json();
    adminExperiences = experiences || [];
    document.getElementById('metric-total-experience').innerText = adminExperiences.length;
    
    const container = document.getElementById('admin-experience-container');
    if (!adminExperiences || adminExperiences.length === 0) {
        container.innerHTML = '<p style="opacity:0.5; font-size:13px;">Experience list empty.</p>';
        return;
    }
    
    container.innerHTML = adminExperiences.map(exp => `
        <div class="node-row">
            <div>
                <strong style="color:var(--accent-aqua); font-size:14px;">${exp.jobTitle}</strong> at <b>${exp.companyName}</b>
                <div style="font-size:12px; opacity:0.6; margin-top:2px;">${exp.period} | ${exp.location}</div>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn-action-toggle" style="background:#fca311; color:#000; padding:6px 10px;" onclick="editExperience('${exp._id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-action-danger" onclick="deleteExperience('${exp._id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `).join('');
}

document.getElementById('add-exp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('exp-id').value;
    const payload = {
        jobTitle: document.getElementById('exp-title').value.trim(),
        companyName: document.getElementById('exp-company').value.trim(),
        location: document.getElementById('exp-location').value.trim(),
        period: document.getElementById('exp-period').value.trim(),
        responsibilities: document.getElementById('exp-responsibilities').value.trim(),
        order: parseInt(document.getElementById('exp-order').value) || 0
    };

    let res;
    if (id) {
        res = await authFetch(`${API_URL}/admin/experience/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } else {
        res = await authFetch(`${API_URL}/admin/experience`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }

    if (res.ok) {
        resetExperienceForm();
        loadAdminExperience();
    }
});

window.editExperience = (id) => {
    const exp = adminExperiences.find(e => e._id === id);
    if (!exp) return;
    document.getElementById('exp-id').value = exp._id;
    document.getElementById('exp-title').value = exp.jobTitle;
    document.getElementById('exp-company').value = exp.companyName;
    document.getElementById('exp-location').value = exp.location;
    document.getElementById('exp-period').value = exp.period;
    document.getElementById('exp-responsibilities').value = exp.responsibilities;
    document.getElementById('exp-order').value = exp.order || 0;
    
    document.getElementById('exp-form-action').innerText = "Edit";
    document.getElementById('btn-cancel-exp-edit').classList.remove('hidden');
};

function resetExperienceForm() {
    document.getElementById('add-exp-form').reset();
    document.getElementById('exp-id').value = "";
    document.getElementById('exp-form-action').innerText = "Add";
    document.getElementById('btn-cancel-exp-edit').classList.add('hidden');
}

document.getElementById('btn-cancel-exp-edit').addEventListener('click', resetExperienceForm);

window.deleteExperience = async (id) => {
    if (confirm("Remove experience timeline record node instance?")) {
        await authFetch(`${API_URL}/admin/experience/${id}`, { method: 'DELETE' });
        loadAdminExperience();
    }
};

// TECHNICAL SKILLS CONFIGURATION CORE
async function loadAdminSkills() {
    const res = await fetch(`${API_URL}/skills`);
    adminSkills = await res.json();
    const container = document.getElementById('admin-skills-container');
    if (!adminSkills || adminSkills.length === 0) { container.innerHTML = '<p style="opacity:0.5; font-size:13px;">No skill blocks registered.</p>'; return; }
    
    container.innerHTML = adminSkills.map(s => `
        <div class="node-row">
            <div style="font-size:13px;"><strong>${s.category}</strong>: <span style="opacity:0.7;">${s.skillsList}</span></div>
            <div style="display:flex; gap:10px;">
                <button class="btn-action-toggle" style="background:#fca311; color:#000; padding:6px 10px;" onclick="editSkill('${s._id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-action-danger" onclick="deleteSkill('${s._id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `).join('');
}

document.getElementById('add-skill-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('skill-id').value;
    const payload = {
        category: document.getElementById('skill-category').value.trim(),
        iconClass: document.getElementById('skill-icon').value.trim(),
        skillsList: document.getElementById('skills-list').value.trim(),
        color: document.getElementById('skill-color').value.trim()
    };

    let res;
    if (id) {
        res = await authFetch(`${API_URL}/admin/skills/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } else {
        res = await authFetch(`${API_URL}/admin/skills`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }

    if (res.ok) {
        resetSkillForm();
        loadAdminSkills();
    }
});

window.editSkill = (id) => {
    const skill = adminSkills.find(s => s._id === id);
    if (!skill) return;
    document.getElementById('skill-id').value = skill._id;
    document.getElementById('skill-category').value = skill.category;
    document.getElementById('skill-icon').value = skill.iconClass;
    document.getElementById('skills-list').value = skill.skillsList;
    document.getElementById('skill-color').value = skill.color || '#00e5ff';
    
    document.getElementById('skill-form-action').innerText = "Edit";
    document.getElementById('btn-cancel-skill-edit').classList.remove('hidden');
};

function resetSkillForm() {
    document.getElementById('add-skill-form').reset();
    document.getElementById('skill-id').value = "";
    document.getElementById('skill-color').value = "#00e5ff";
    document.getElementById('skill-form-action').innerText = "Provision";
    document.getElementById('btn-cancel-skill-edit').classList.add('hidden');
}

document.getElementById('btn-cancel-skill-edit').addEventListener('click', resetSkillForm);

window.deleteSkill = async (id) => {
    if (confirm("Delete targeted structural skill block element?")) {
        await authFetch(`${API_URL}/admin/skills/${id}`, { method: 'DELETE' });
        loadAdminSkills();
    }
};

// FEATURED PORTFOLIO PROJECTS MATRIX CORE
async function loadProjects() {
    try {
        const res = await authFetch(`${API_URL}/admin/projects`);
        if (!res.ok) {
            console.error('loadProjects: server responded with', res.status);
            return;
        }
        adminProjects = await res.json();
        console.log('loadProjects: loaded', adminProjects.length, 'projects', adminProjects);

        const activeCount = adminProjects && Array.isArray(adminProjects) ? adminProjects.filter(p => p.status === 'active').length : 0;
        document.getElementById('metric-active-projects').innerText = activeCount;

        const tbody = document.getElementById('projects-table-body');
        tbody.innerHTML = '';

        if (!adminProjects || !Array.isArray(adminProjects) || adminProjects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; opacity:0.5;">No projects found.</td></tr>';
            return;
        }

        const rows = adminProjects.map(p => {
            const imgUrl = (p.imageUrl && (p.imageUrl.startsWith('http') || p.imageUrl.startsWith('data:'))) ? p.imageUrl : `${BASE_URL}${p.imageUrl || ''}`;
            return `<tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                <td style="padding:12px;"><img src="${imgUrl}" width="40" height="40" style="object-fit:cover; border-radius:6px; display:block;" onerror="this.onerror=null; this.src='https://placehold.co/40';"></td>
                <td style="padding:12px; color:#ffffff; font-size:14px;"><strong>${p.title || 'Untitled'}</strong></td>
                <td style="padding:12px; color:#8fa0c2; font-size:12px;">${p.projectType || 'Web Development'}</td>
                <td style="padding:12px;"><button class="btn-action-toggle ${p.status === 'active' ? 'active-btn' : ''}" onclick="toggleStatus('${p._id}')">${p.status || 'inactive'}</button></td>
                <td style="padding:12px;">
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button class="btn-action-toggle" style="background:#fca311; color:#000; padding:6px 10px; border-radius:4px; cursor:pointer;" onclick="editProject('${p._id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-action-danger" style="cursor:pointer;" onclick="deleteProject('${p._id}')"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
        tbody.innerHTML = rows;
        console.log('loadProjects: tbody now has', tbody.rows.length, 'rows');
    } catch (e) {
        console.error('loadProjects error:', e);
        const tbody = document.getElementById('projects-table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#ff357a;">Failed to load projects. Check console.</td></tr>';
    }
}

window.toggleStatus = async (id) => { try { await authFetch(`${API_URL}/admin/projects/${id}/status`, { method: 'PUT' }); loadProjects(); } catch(e) { console.error('toggleStatus error:', e); } };
window.deleteProject = async (id) => { if (confirm("Erase project?")) { try { await authFetch(`${API_URL}/admin/projects/${id}`, { method: 'DELETE' }); loadProjects(); } catch(e) { console.error('deleteProject error:', e); } } };

document.getElementById('project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('proj-id').value;
    const fd = new FormData();
    fd.append('title', document.getElementById('proj-title').value);
    fd.append('projectType', document.getElementById('proj-type').value);
    fd.append('description', document.getElementById('proj-desc').value);
    fd.append('link', document.getElementById('proj-link').value);
    
    const fileInput = document.getElementById('proj-file');
    if (fileInput.files[0]) {
        fd.append('projectImage', fileInput.files[0]);
    }
    
    let res;
    if (id) {
        res = await authFetch(`${API_URL}/projects/${id}`, { method: 'PUT', body: fd });
    } else {
        res = await authFetch(`${API_URL}/projects`, { method: 'POST', body: fd });
    }
    
    if (res.ok) {
        resetProjectForm();
        loadProjects();
    }
});

window.editProject = (id) => {
    const proj = adminProjects.find(p => p._id === id);
    if (!proj) return;
    document.getElementById('proj-id').value = proj._id;
    document.getElementById('proj-title').value = proj.title;
    document.getElementById('proj-type').value = proj.projectType || '';
    document.getElementById('proj-desc').value = proj.description;
    document.getElementById('proj-link').value = proj.link || '';
    
    // File upload is not required during edit
    document.getElementById('proj-file').removeAttribute('required');
    
    document.getElementById('proj-form-action').innerText = "Edit";
    document.getElementById('btn-cancel-proj-edit').classList.remove('hidden');
};

function resetProjectForm() {
    document.getElementById('project-form').reset();
    document.getElementById('proj-id').value = "";
    document.getElementById('proj-file').setAttribute('required', 'true');
    document.getElementById('proj-form-action').innerText = "Compile";
    document.getElementById('btn-cancel-proj-edit').classList.add('hidden');
}

document.getElementById('btn-cancel-proj-edit').addEventListener('click', resetProjectForm);

// PROJECT TYPES (CATEGORIES) LOGIC
async function loadProjectTypes() {
    const res = await fetch(`${API_URL}/project-types`);
    const types = await res.json();
    
    const select = document.getElementById('proj-type');
    const container = document.getElementById('admin-types-container');
    
    if (!select || !container) return;
    
    select.innerHTML = types.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
    
    if (types.length === 0) {
        container.innerHTML = '<p style="opacity:0.5; font-size:12px;">No custom categories registered.</p>';
        return;
    }
    
    container.innerHTML = types.map(t => `
        <div class="node-row" style="padding:10px 15px;">
            <span style="font-size:13px;">${t.name}</span>
            <button class="btn-action-danger" style="width:26px; height:26px;" onclick="deleteProjectType('${t._id}')"><i class="fas fa-trash-alt" style="font-size:11px;"></i></button>
        </div>
    `).join('');
}

document.getElementById('add-type-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('new-type-name');
    const res = await authFetch(`${API_URL}/admin/project-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.value.trim() })
    });
    if (res.ok) {
        nameInput.value = '';
        loadProjectTypes();
    } else {
        alert('Failed to add category. Duplicate or invalid.');
    }
});

window.deleteProjectType = async (id) => {
    if (confirm("Delete this project category? Projects in this category will display as uncategorized until assigned a new one.")) {
        await authFetch(`${API_URL}/admin/project-types/${id}`, { method: 'DELETE' });
        loadProjectTypes();
    }
};

// EDUCATION CRUD CONTROLLER PIPELINE
async function loadAdminEducation() {
    const res = await fetch(`${API_URL}/education`);
    adminEducations = await res.json();
    
    const container = document.getElementById('admin-education-container');
    if (!adminEducations || adminEducations.length === 0) {
        container.innerHTML = '<p style="opacity:0.5; font-size:13px;">Education list empty.</p>';
        return;
    }
    
    container.innerHTML = adminEducations.map(edu => `
        <div class="node-row">
            <div>
                <strong style="color:var(--accent-aqua); font-size:14px;">${edu.degree}</strong> at <b>${edu.schoolName}</b>
                <div style="font-size:12px; opacity:0.6; margin-top:2px;">${edu.period} | ${edu.description}</div>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn-action-toggle" style="background:#fca311; color:#000; padding:6px 10px;" onclick="editEducation('${edu._id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-action-danger" onclick="deleteEducation('${edu._id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `).join('');
}

document.getElementById('add-edu-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edu-id').value;
    const payload = {
        schoolName: document.getElementById('edu-school').value.trim(),
        degree: document.getElementById('edu-degree').value.trim(),
        period: document.getElementById('edu-period').value.trim(),
        description: document.getElementById('edu-description').value.trim(),
        order: parseInt(document.getElementById('edu-order').value) || 0
    };

    let res;
    if (id) {
        res = await authFetch(`${API_URL}/admin/education/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } else {
        res = await authFetch(`${API_URL}/admin/education`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }

    if (res.ok) {
        resetEducationForm();
        loadAdminEducation();
    }
});

window.editEducation = (id) => {
    const edu = adminEducations.find(e => e._id === id);
    if (!edu) return;
    document.getElementById('edu-id').value = edu._id;
    document.getElementById('edu-school').value = edu.schoolName;
    document.getElementById('edu-degree').value = edu.degree;
    document.getElementById('edu-period').value = edu.period;
    document.getElementById('edu-description').value = edu.description;
    document.getElementById('edu-order').value = edu.order || 0;
    
    document.getElementById('edu-form-action').innerText = "Edit";
    document.getElementById('btn-cancel-edu-edit').classList.remove('hidden');
};

function resetEducationForm() {
    document.getElementById('add-edu-form').reset();
    document.getElementById('edu-id').value = "";
    document.getElementById('edu-form-action').innerText = "Add";
    document.getElementById('btn-cancel-edu-edit').classList.add('hidden');
}

document.getElementById('btn-cancel-edu-edit').addEventListener('click', resetEducationForm);

window.deleteEducation = async (id) => {
    if (confirm("Remove education milestone record node?")) {
        await authFetch(`${API_URL}/admin/education/${id}`, { method: 'DELETE' });
        loadAdminEducation();
    }
};

// CV ASSET DISPATCH MOUNT
document.getElementById('cv-upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('cvFile', document.getElementById('cv-file').files[0]);
    const res = await authFetch(`${API_URL}/admin/cv/upload`, { method: 'POST', body: fd });
    if (res.ok) {
        alert('Static PDF attachment reference compiled successfully.');
        loadAdminCV();
    }
});

// LOAD ADMIN CV DISPLAY
async function loadAdminCV() {
    try {
        const res = await authFetch(`${API_URL}/cv`);
        const data = await res.json();
        const container = document.getElementById('admin-cv-container');
        if (!container) return;
        if (!data.fileUrl) {
            container.innerHTML = '<p style="opacity:0.5; font-size:13px;">No CV uploaded.</p>';
            return;
        }
        const link = data.fileUrl.startsWith('http') || data.fileUrl.startsWith('data:') ? data.fileUrl : `${BASE_URL}${data.fileUrl}`;
        container.innerHTML = `<a href="${link}" target="_blank" download="CV.pdf" class="btn btn-animated" style="display:inline-block; margin-top:10px;">View / Download CV</a>`;
    } catch (e) { console.error('Error loading CV asset:', e); }
}

async function loadAdminMessages() {
    try {
        const res = await authFetch(`${API_URL}/admin/messages`);
        const messages = await res.json();

        // SAFE FALLBACK DEFINED LENGTH CALCULATION
        const messageCount = messages && Array.isArray(messages) ? messages.length : 0;
        document.getElementById('notif-counter-badge').innerText = messageCount;
        document.getElementById('metric-total-messages').innerText = messageCount;

        const dashContainer = document.getElementById('dashboard-messages-container');
        if (messageCount === 0) {
            const structuralFallback = '<p style="opacity:0.5; font-size:13px; padding:10px;">Inbox empty.</p>';
            dashContainer.innerHTML = structuralFallback;
            return;
        }
        dashContainer.innerHTML = messages.map(m => `
            <div class="message-card">
                <div class="message-header">
                    <strong style="color:var(--accent-aqua);">${m.email || 'Anonymous'}</strong>
                    <span style="opacity:0.5;">${m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}</span>
                </div>
                <div style="font-size:13px; line-height:1.5; color: #e1e7f0;">${m.message || ''}</div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Error loading admin messages:', e);
    }
}