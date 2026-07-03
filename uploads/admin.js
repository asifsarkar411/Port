const API_URL = '/api';
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');

let token = localStorage.getItem('adminToken');
if (token) showDashboard();

function showDashboard() {
    loginContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    setupNavigationRouting();
    
    // Core Engine Refresher System Initialization
    loadProjects();
    loadAdminExperience();
    loadAdminSkills();
    loadAdminMessages();
    loadProfileState();
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
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: document.getElementById('admin-username').value,
            password: document.getElementById('admin-password').value
        })
    });
    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('adminToken', data.token);
        token = data.token;
        showDashboard();
    } else {
        alert('Authentication failed: ' + data.message);
    }
});

logoutBtn.addEventListener('click', showLogin);

// PROFILE AVATAR LIVE STORAGE MANAGER PIPELINE
async function loadProfileState() {
    const res = await fetch(`${API_URL}/profile`);
    const data = await res.json();
    const avatar = document.getElementById('profile-avatar');
    if (avatar && data.avatarUrl) {
        avatar.src = data.avatarUrl.startsWith('http') ? data.avatarUrl : `http://localhost:5000${data.avatarUrl}`;
    }
}

document.getElementById('hidden-avatar-input').addEventListener('change', async (e) => {
    if(!e.target.files[0]) return;
    const fd = new FormData();
    fd.append('profileImage', e.target.files[0]);
    
    const res = await fetch(`${API_URL}/profile`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` }, 
        body: fd 
    });
    if (res.ok) {
        const data = await res.json();
        document.getElementById('profile-avatar').src = `http://localhost:5000${data.avatarUrl}`;
    }
});

// WORK EXPERIENCE CONTROLLER PIPELINE
async function loadAdminExperience() {
    const res = await fetch(`${API_URL}/experience`);
    const experiences = await res.json();
    document.getElementById('metric-total-experience').innerText = experiences ? experiences.length : 0;
    
    const container = document.getElementById('admin-experience-container');
    if (!experiences || experiences.length === 0) {
        container.innerHTML = '<p style="opacity:0.5; font-size:13px;">Experience list empty.</p>';
        return;
    }
    
    container.innerHTML = experiences.map(exp => `
        <div class="node-row">
            <div>
                <strong style="color:var(--accent-aqua); font-size:14px;">${exp.jobTitle}</strong> at <b>${exp.companyName}</b>
                <div style="font-size:12px; opacity:0.6; margin-top:2px;">${exp.period} | ${exp.location}</div>
            </div>
            <button class="btn-action-danger" onclick="deleteExperience('${exp._id}')"><i class="fas fa-trash-alt"></i></button>
        </div>
    `).join('');
}

document.getElementById('add-exp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        jobTitle: document.getElementById('exp-title').value.trim(),
        companyName: document.getElementById('exp-company').value.trim(),
        location: document.getElementById('exp-location').value.trim(),
        period: document.getElementById('exp-period').value.trim(),
        responsibilities: document.getElementById('exp-responsibilities').value.trim(),
        order: parseInt(document.getElementById('exp-order').value) || 0
    };

    const res = await fetch(`${API_URL}/admin/experience`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        document.getElementById('add-exp-form').reset();
        loadAdminExperience();
    }
});

window.deleteExperience = async (id) => {
    if (confirm("Remove experience timeline record node instance?")) {
        await fetch(`${API_URL}/admin/experience/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        loadAdminExperience();
    }
};

// TECHNICAL SKILLS CONFIGURATION CORE
async function loadAdminSkills() {
    const res = await fetch(`${API_URL}/skills`);
    const data = await res.json();
    const container = document.getElementById('admin-skills-container');
    if (!data || data.length === 0) { container.innerHTML = '<p style="opacity:0.5; font-size:13px;">No skill blocks registered.</p>'; return; }
    
    container.innerHTML = data.map(s => `
        <div class="node-row">
            <div style="font-size:13px;"><strong>${s.category}</strong>: <span style="opacity:0.7;">${s.skillsList}</span></div>
            <button class="btn-action-danger" onclick="deleteSkill('${s._id}')"><i class="fas fa-trash-alt"></i></button>
        </div>
    `).join('');
}

document.getElementById('add-skill-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/admin/skills`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            category: document.getElementById('skill-category').value,
            iconClass: document.getElementById('skill-icon').value,
            skillsList: document.getElementById('skills-list').value,
            color: document.getElementById('skill-color').value
        })
    });
    document.getElementById('add-skill-form').reset();
    document.getElementById('skill-color').value = "#00e5ff";
    loadAdminSkills();
});

window.deleteSkill = async (id) => {
    if (confirm("Delete targeted structural skill block element?")) {
        await fetch(`${API_URL}/admin/skills/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        loadAdminSkills();
    }
};

// FEATURED PORTFOLIO PROJECTS MATRIX CORE
async function loadProjects() {
    const res = await fetch(`${API_URL}/admin/projects`, { headers: { 'Authorization': `Bearer ${token}` } });
    const projects = await res.json();
    
    const activeCount = projects && Array.isArray(projects) ? projects.filter(p => p.status === 'active').length : 0;
    document.getElementById('metric-active-projects').innerText = activeCount;

    const tbody = document.getElementById('projects-table-body');
    tbody.innerHTML = '';
    
    if(projects && Array.isArray(projects)) {
        projects.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="http://localhost:5000${p.imageUrl}" width="35" height="35" style="object-fit:cover; border-radius:4px;"></td>
                <td><strong>${p.title}</strong></td>
                <td><button class="btn-action-toggle ${p.status === 'active' ? 'active-btn' : ''}" onclick="toggleStatus('${p._id}')">${p.status}</button></td>
                <td><button class="btn-action-danger" onclick="deleteProject('${p._id}')"><i class="fas fa-trash-alt"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    }
}

window.toggleStatus = async (id) => { await fetch(`${API_URL}/projects/${id}/status`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } }); loadProjects(); };
window.deleteProject = async (id) => { if (confirm("Erase project?")) { await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); loadProjects(); } };

document.getElementById('project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('title', document.getElementById('proj-title').value);
    fd.append('description', document.getElementById('proj-desc').value);
    fd.append('link', document.getElementById('proj-link').value);
    fd.append('projectImage', document.getElementById('proj-file').files[0]);
    
    await fetch(`${API_URL}/projects`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
    document.getElementById('project-form').reset();
    loadProjects();
});

// CV ASSET DISPATCH MOUNT
document.getElementById('cv-upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('cvFile', document.getElementById('cv-file').files[0]);
    const res = await fetch(`${API_URL}/admin/cv/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
    if (res.ok) alert('Static PDF attachment reference compiled successfully.');
});

// REALTIME COMPASS LOG CAPTURE ENGINE PIPELINE
async function loadAdminMessages() {
    const res = await fetch(`${API_URL}/admin/messages`, { headers: { 'Authorization': `Bearer ${token}` } });
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
}