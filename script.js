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

document.addEventListener('DOMContentLoaded', () => {
    loadPublicProfile();
    loadPublicExperience();
    loadPublicSkills();
    loadPublicProjects();
    loadDynamicCv();
    setupContactForm();

    // Smooth Navigation Interceptor Logic Configuration
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

async function loadPublicProfile() {
    try {
        const res = await fetch(`${API_URL}/profile`);
        const data = await res.json();
        const profileImg = document.getElementById('profile-avatar');
        if (profileImg && data.avatarUrl) {
            profileImg.src = data.avatarUrl.startsWith('http') ? data.avatarUrl : `${BASE_URL}${data.avatarUrl}`;
        }
    } catch (e) { console.error('Error tracking image mapping reference downstream:', e); }
}

async function loadPublicExperience() {
    try {
        const res = await fetch(`${API_URL}/experience`);
        const data = await res.json();
        const container = document.getElementById('experience-container');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<p style="text-align:center; opacity:0.6;">Timeline is currently empty.</p>';
            return;
        }

        container.innerHTML = data.map(exp => {
            const responsibilityBullets = exp.responsibilities.split('\n')
                .filter(bullet => bullet.trim() !== '')
                .map(bullet => `<li>${bullet.trim()}</li>`).join('');

            return `
                <div class="glass-card experience-card" style="padding: 25px; border-left: 4px solid aqua; position: relative;">
                    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
                        <div>
                            <h3 style="color: #fff; margin-bottom: 2px;">${exp.jobTitle}</h3>
                            <h4 style="color: aqua; font-weight: 400;">${exp.companyName}</h4>
                        </div>
                        <div style="text-align: right; font-size: 14px; opacity: 0.8;">
                            <span style="display: block; font-weight: 600;"><i class="fas fa-calendar-alt"></i> ${exp.period}</span>
                            <span style="display: block;"><i class="fas fa-map-marker-alt"></i> ${exp.location}</span>
                        </div>
                    </div>
                    <ul style="margin-left: 20px; margin-top: 15px; display: flex; flex-direction: column; gap: 8px; line-height: 1.6; opacity: 0.95; font-size: 14px;">
                        ${responsibilityBullets}
                    </ul>
                </div>
            `;
        }).join('');
    } catch (err) { console.error('Error compiling timeline segments:', err); }
}

async function loadPublicSkills() {
    try {
        const res = await fetch(`${API_URL}/skills`);
        const skills = await res.json();
        const container = document.getElementById('skills-container');
        if (!container || skills.length === 0) return;

        container.innerHTML = skills.map(skill => `
            <div class="glass-card skill-card" style="padding:20px; text-align:center; border-radius:8px;">
                <i class="${skill.iconClass}" style="font-size:40px; color: ${skill.color || '#00c6ff'}; margin-bottom:15px;"></i>
                <h3 style="margin-bottom:10px;">${skill.category}</h3>
                <p style="opacity:0.8; font-size:14px;">${skill.skillsList}</p>
            </div>
        `).join('');
    } catch (e) { console.error(e); }
}

async function loadPublicProjects() {
    try {
        const res = await fetch(`${API_URL}/projects`);
        const projects = await res.json();
        const webContainer = document.getElementById('web-projects-container');
        const iotContainer = document.getElementById('iot-projects-container');

        if (webContainer) webContainer.innerHTML = '';
        if (iotContainer) iotContainer.innerHTML = '';

        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'glass-card project-card';
            card.style.padding = '15px';
            const img = project.imageUrl.startsWith('http') ? project.imageUrl : `${BASE_URL}${project.imageUrl}`;
            
            card.innerHTML = `
                <img src="${img}" alt="${project.title}" style="width:100%; height:200px; object-fit:cover; border-radius:6px; margin-bottom:15px;">
                <h3>${project.title}</h3>
                <p style="margin: 10px 0; font-size:14px; opacity:0.8;">${project.description}</p>
                ${project.link ? `<a href="${project.link}" target="_blank" class="btn btn-animated" style="display:inline-block; text-decoration:none; margin-top:10px; font-size:12px;">View Project Instance</a>` : ''}
            `;
            
            if (project.description?.toLowerCase().includes('iot') || project.title?.toLowerCase().includes('smart')) {
                iotContainer?.appendChild(card);
            } else {
                webContainer?.appendChild(card);
            }
        });
    } catch (e) { console.error(e); }
}

async function loadDynamicCv() {
    try {
        const res = await fetch(`${API_URL}/cv`);
        const data = await res.json();
        const cvBtn = document.getElementById('dynamicCvBtn');
        if (cvBtn && data.fileUrl) {
            cvBtn.href = `${BASE_URL}${data.fileUrl}`;
            cvBtn.removeAttribute('download');
        }
    } catch (e) { console.error(e); }
}

function setupContactForm() {
    const form = document.getElementById('contact-form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;

        const payload = {
            email: document.getElementById('email').value,
            message: document.getElementById('message').value
        };

        const res = await fetch(`${API_URL}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if ((await res.json()).success) {
            alert('Your dynamic pipeline transmission was committed successfully to MongoDB Compass.');
            form.reset();
        }
        btn.disabled = false;
    });
}