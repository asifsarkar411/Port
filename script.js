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
    loadPublicEducation();
    loadDynamicCv();
    setupContactForm();

    // Smooth Navigation Interceptor Logic Configuration
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId && targetId.startsWith('#') && targetId !== '#') {
                e.preventDefault();
                const target = document.querySelector(targetId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
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
            profileImg.onerror = () => { profileImg.src = 'https://placehold.co/150'; };
            profileImg.src = (data.avatarUrl.startsWith('http') || data.avatarUrl.startsWith('data:')) ? data.avatarUrl : `${BASE_URL}${data.avatarUrl}`;
        }
    } catch (e) { console.error('Error tracking image mapping reference downstream:', e); }
}

async function loadPublicExperience() {
    try {
        const res = await fetch(`${API_URL}/experience`);
        const apiData = await res.json();
        const container = document.getElementById('experience-timeline');
        if (!container) return;

        // Static Journey milestones requested by the user
        const journeyMilestones = [
            {
                jobTitle: "Began Coding Journey",
                companyName: "Self-Learning & Exploration",
                location: "Home Base",
                period: "Jan 2023",
                responsibilities: "Explored basic programming concepts.\nLearned HTML5, CSS3, and modern CSS layouts.\nBuilt first static webpages and terminal tools.",
                order: -100
            },
            {
                jobTitle: "Learned Modern Frameworks",
                companyName: "Vite, React, Express & MongoDB",
                location: "Bootcamps & Online Labs",
                period: "Mid 2023",
                responsibilities: "Mastered JavaScript ES6+ specifications.\nLearned React.js component-driven development.\nBuilt REST APIs with Node.js/Express and integrated MongoDB database layers.",
                order: -90
            },
            {
                jobTitle: "IoT Systems Automation Milestone",
                companyName: "Hardware Integration & Control Core",
                location: "IoT Lab Project",
                period: "Early 2024",
                responsibilities: "Designed and prototyped automated IoT pipelines with microcontrollers.\nCreated real-time monitoring web dashboards.\nProgrammed ESP32 modules for sensor data capture and cloud sync.",
                order: -80
            }
        ];

        // Merge and sort all items by order
        const allItems = [...journeyMilestones, ...apiData].sort((a, b) => (a.order || 0) - (b.order || 0));

        if (allItems.length === 0) {
            container.innerHTML = '<p style="text-align:center; opacity:0.6;">Timeline is currently empty.</p>';
            return;
        }

        container.innerHTML = allItems.map((exp, index) => {
            const responsibilityBullets = exp.responsibilities.split('\n')
                .filter(bullet => bullet.trim() !== '')
                .map(bullet => `<li>${bullet.trim()}</li>`).join('');

            // Odd items left, Even items right
            const alignClass = index % 2 === 0 ? 'reveal-timeline-left' : 'reveal-timeline-right';

            return `
                <div class="timeline-item ${alignClass}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
                            <div>
                                <h3 style="margin-bottom: 2px;">${exp.jobTitle}</h3>
                                <h4 style="font-weight: 500;">${exp.companyName}</h4>
                            </div>
                            <div style="text-align: right; font-size: 13px; opacity: 0.8;">
                                <span style="display: block; font-weight: 600;"><i class="fas fa-calendar-alt"></i> ${exp.period}</span>
                                <span style="display: block;"><i class="fas fa-map-marker-alt"></i> ${exp.location}</span>
                            </div>
                        </div>
                        <ul>
                            ${responsibilityBullets}
                        </ul>
                    </div>
                </div>
            `;
        }).join('');

        // Trigger animations trigger for timeline items after injection
        if (window.initTimelineReveal) {
            window.initTimelineReveal();
        }
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
        const [projectsRes, typesRes] = await Promise.all([
            fetch(`${API_URL}/projects`),
            fetch(`${API_URL}/project-types`)
        ]);
        const projects = await projectsRes.json();
        const categories = await typesRes.json();
        
        const rootContainer = document.getElementById('dynamic-projects-root');
        if (!rootContainer) return;
        rootContainer.innerHTML = '';
        
        if (!projects || projects.length === 0) {
            rootContainer.innerHTML = '<p style="text-align:center; opacity:0.6;">No projects published yet.</p>';
            return;
        }

        const projectsByCategory = {};
        categories.forEach(cat => {
            projectsByCategory[cat.name] = [];
        });
        
        if (!projectsByCategory['Web Development']) projectsByCategory['Web Development'] = [];
        if (!projectsByCategory['IoT & Systems Automation']) projectsByCategory['IoT & Systems Automation'] = [];

        projects.forEach(project => {
            const catName = project.projectType || 'Web Development';
            if (!projectsByCategory[catName]) {
                projectsByCategory[catName] = [];
            }
            projectsByCategory[catName].push(project);
        });

        const colors = ['aqua', '#fca311', '#ff357a', '#00c6ff', '#fca311'];
        let colorIdx = 0;
        const categoriesList = [...new Set([...categories.map(c => c.name), ...Object.keys(projectsByCategory)])];

        categoriesList.forEach(catName => {
            const catProjects = projectsByCategory[catName];
            if (!catProjects || catProjects.length === 0) return;

            const color = colors[colorIdx % colors.length];
            colorIdx++;

            const heading = document.createElement('h3');
            heading.className = 'category-title';
            heading.style.cssText = `margin-bottom: 20px; color: ${color}; padding-left: 10px; border-left: 3px solid ${color}; margin-top: 40px;`;
            heading.innerText = catName;

            const grid = document.createElement('div');
            grid.className = 'projects-grid';
            grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px; margin-bottom: 50px;';

            catProjects.forEach(project => {
                const card = document.createElement('div');
                card.className = 'glass-card project-card';
                card.style.padding = '15px';
                
                const imgUrl = (project.imageUrl && (project.imageUrl.startsWith('http') || project.imageUrl.startsWith('data:'))) ? project.imageUrl : `${BASE_URL}${project.imageUrl || ''}`;
                
                card.innerHTML = `
                    <img src="${imgUrl}" alt="${project.title}" style="width:100%; height:200px; object-fit:cover; border-radius:6px; margin-bottom:15px;" onerror="this.onerror=null; this.src='https://placehold.co/300x200?text=No+Image';">
                    <h3>${project.title}</h3>
                    <p style="margin: 10px 0; font-size:14px; opacity:0.8;">${project.description}</p>
                    ${project.link ? `<a href="${project.link}" target="_blank" class="btn btn-animated" style="display:inline-block; text-decoration:none; margin-top:10px; font-size:12px;">View Project Instance</a>` : ''}
                `;
                grid.appendChild(card);
            });

            rootContainer.appendChild(heading);
            rootContainer.appendChild(grid);
        });
    } catch (e) { console.error('Error loading projects dynamically:', e); }
}

async function loadDynamicCv() {
    try {
        const res = await fetch(`${API_URL}/cv`);
        const data = await res.json();
        const cvBtn = document.getElementById('dynamicCvBtn');
        if (cvBtn && data.fileUrl) {
            const isBase64 = data.fileUrl.startsWith('data:');
            cvBtn.href = (data.fileUrl.startsWith('http') || isBase64) ? data.fileUrl : `${BASE_URL}${data.fileUrl}`;
            if (isBase64) {
                cvBtn.setAttribute('download', 'SM_Ferdous_Ahmmed_CV.pdf');
            } else {
                cvBtn.removeAttribute('download');
            }
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

async function loadPublicEducation() {
    try {
        const res = await fetch(`${API_URL}/education`);
        const data = await res.json();
        const container = document.getElementById('education-container');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<p style="opacity:0.6; text-align:center; width:100%;">Education history is currently empty.</p>';
            return;
        }

        container.innerHTML = data.map(edu => `
            <div class="glass-card edu-card animate-right" style="width:100%; padding:25px; margin-bottom:15px; position:relative;">
                <span class="edu-year" style="display:block; font-weight:600; color:aqua; margin-bottom:10px;"><i class="fas fa-calendar-alt"></i> ${edu.period}</span>
                <div class="edu-header">
                    <h4 style="color:#fff; margin-bottom:5px;">${edu.degree}</h4>
                    <h5 style="color:aqua; font-weight:400;">${edu.schoolName}${edu.department ? ` &bull; ${edu.department}` : ''}</h5>
                </div>
                <p class="edu-desc" style="opacity:0.8; margin-top:10px; font-size:14px; line-height:1.5;">${edu.description}</p>
            </div>
        `).join('');
    } catch (err) { console.error('Error compiling education timeline segments:', err); }
}