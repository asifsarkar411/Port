require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 5000;
const app = express();

// Secure your JWT Secret Key using your Environment Variables
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SUPER_SECURE_SECRET_KEY_CHANGE_THIS';

// --- MIDDLEWARE LAYER ---
app.use(cors());
app.use(express.json());

// Serve committed uploads directory for legacy/existing files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve static frontend files from the root directory when running locally
if (!process.env.VERCEL) {
    app.use(express.static(path.join(__dirname, '..')));
    app.get('/admin', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'admin.html'));
    });
}

// --- DATA PERSISTENCE LAYER (MONGODB ATLAS ENGINE) ---
const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio';

mongoose.connect(dbURI)
  .then(async () => {
      const isLocal = dbURI.includes('localhost') || dbURI.includes('127.0.0.1');
      console.log(`🚀 Backend engine running smoothly on port ${PORT}`);
      console.log(`✅ Connected successfully to: ${isLocal ? 'MongoDB Compass Local Cluster' : 'MongoDB Atlas Cloud Cluster'}`);
      
      // Auto-seed default project categories
      try {
          const count = await ProjectType.countDocuments();
          if (count === 0) {
              await ProjectType.insertMany([
                  { name: 'Web Development' },
                  { name: 'IoT & Systems Automation' }
              ]);
              console.log('🌱 Seeded default project categories.');
          }
      } catch (err) {
          console.error('Error seeding project categories:', err);
      }
  })
  .catch(err => {
      console.error('❌ MongoDB Connection Error:', err);
  });

// --- MULTER CONFIGURATION (Memory Storage for MongoDB persistence) ---
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Helper: Convert uploaded file buffer to a base64 data URL
function fileToDataUrl(file) {
    const base64 = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64}`;
}

// --- DATA ACCESS LAYER (MONGOOSE SCHEMAS) ---
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}));

const Project = mongoose.model('Project', new mongoose.Schema({
    title: String,
    description: String,
    link: String,
    imageUrl: String,
    projectType: { type: String, default: 'Web Development' },
    status: { type: String, default: 'active' }
}));

const ProjectType = mongoose.model('ProjectType', new mongoose.Schema({
    name: { type: String, required: true, unique: true }
}));

const Profile = mongoose.model('Profile', new mongoose.Schema({ avatarUrl: String }));

const Message = mongoose.model('Message', new mongoose.Schema({
    email: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
}));

const Cv = mongoose.model('Cv', new mongoose.Schema({
    fileUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
}));

const Skill = mongoose.model('Skill', new mongoose.Schema({
    category: { type: String, required: true },
    iconClass: { type: String, required: true },
    skillsList: { type: String, required: true },
    color: { type: String, default: '#00c6ff' }
}));

const Experience = mongoose.model('Experience', new mongoose.Schema({
    jobTitle: { type: String, required: true },
    companyName: { type: String, required: true },
    location: { type: String, required: true },
    period: { type: String, required: true },
    responsibilities: { type: String, required: true },
    order: { type: Number, default: 0 }
}));

const Education = mongoose.model('Education', new mongoose.Schema({
    schoolName: { type: String, required: true },
    degree: { type: String, required: true },
    period: { type: String, required: true },
    description: { type: String, required: true },
    order: { type: Number, default: 0 }
}));

// Route Protection Interceptor (JWT Verification)
const verifyToken = (req, res, next) => {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ message: 'Access Denied. Token missing.' });
    try {
        const verified = jwt.verify(header.split(' ')[1], JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token confirmation context.' });
    }
};

// --- API CONTROLLER ROUTES ---

// 1. Authentication
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const fallbackPassword = process.env.ADMIN_PASSWORD || 'MySecurePassword123';
        
        let user = await User.findOne({ username });
        
        // Auto-create admin user if it doesn't exist
        if (!user && username === 'admin') {
            const hashedPassword = await bcrypt.hash(fallbackPassword, 10);
            user = new User({ username: 'admin', password: hashedPassword });
            await user.save();
        }
        
        if (!user) return res.status(404).json({ message: 'User record not found.' });
        
        // Check password against database
        let isValid = await bcrypt.compare(password, user.password);
        
        // Self-healing: if password doesn't match DB but matches the fallback, reset and allow
        if (!isValid && username === 'admin' && password === fallbackPassword) {
            user.password = await bcrypt.hash(fallbackPassword, 10);
            await user.save();
            isValid = true;
        }
        
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }
        
        const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during authentication.' });
    }
});

// 2. Projects
app.get('/api/projects', async (req, res) => res.json(await Project.find({ status: 'active' })));
app.get('/api/admin/projects', verifyToken, async (req, res) => res.json(await Project.find()));
app.post('/api/projects', verifyToken, upload.single('projectImage'), async (req, res) => {
    const newProject = new Project({
        title: req.body.title,
        description: req.body.description,
        link: req.body.link,
        projectType: req.body.projectType || 'Web Development',
        imageUrl: req.file ? fileToDataUrl(req.file) : '',
        status: 'active'
    });
    await newProject.save();
    res.json({ message: 'Project instance captured successfully!' });
});
app.put('/api/projects/:id', verifyToken, upload.single('projectImage'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        project.title = req.body.title || project.title;
        project.description = req.body.description || project.description;
        project.link = req.body.link;
        project.projectType = req.body.projectType || project.projectType;
        if (req.file) {
            project.imageUrl = fileToDataUrl(req.file);
        }
        await project.save();
        res.json({ message: 'Project updated successfully!', project });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating project.' });
    }
});
app.put('/api/projects/:id/status', verifyToken, async (req, res) => {
    const project = await Project.findById(req.params.id);
    project.status = project.status === 'active' ? 'inactive' : 'active';
    await project.save();
    res.json(project);
});
app.delete('/api/projects/:id', verifyToken, async (req, res) => {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project document completely eliminated.' });
});

// Project Types Routes
app.get('/api/project-types', async (req, res) => res.json(await ProjectType.find()));
app.post('/api/admin/project-types', verifyToken, async (req, res) => {
    try {
        const newType = new ProjectType({ name: req.body.name });
        await newType.save();
        res.json({ message: 'Project category deployed successfully.', type: newType });
    } catch (err) {
        res.status(400).json({ message: 'Category duplicate or invalid.' });
    }
});
app.delete('/api/admin/project-types/:id', verifyToken, async (req, res) => {
    await ProjectType.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project category removed.' });
});

// 3. Profiles & CV Assets
app.get('/api/profile', async (req, res) => res.json(await Profile.findOne() || { avatarUrl: '' }));
app.post('/api/profile', verifyToken, upload.single('profileImage'), async (req, res) => {
    let profile = await Profile.findOne();
    const dataUrl = fileToDataUrl(req.file);
    if (profile) profile.avatarUrl = dataUrl; else profile = new Profile({ avatarUrl: dataUrl });
    await profile.save();
    res.json({ message: 'Avatar image reassigned successfully.', avatarUrl: dataUrl });
});
app.get('/api/cv', async (req, res) => res.json(await Cv.findOne().sort({ uploadedAt: -1 }) || { fileUrl: '' }));
app.post('/api/admin/cv/upload', verifyToken, upload.single('cvFile'), async (req, res) => {
    await Cv.deleteMany({});
    const newCv = new Cv({ fileUrl: fileToDataUrl(req.file) });
    await newCv.save();
    res.json({ message: 'CV asset uploaded and attached successfully.' });
});

// 4. Skills Engine
app.get('/api/skills', async (req, res) => res.json(await Skill.find()));
app.post('/api/admin/skills', verifyToken, async (req, res) => {
    const newSkill = new Skill(req.body);
    await newSkill.save();
    res.json({ message: 'Technical skill card deployed.' });
});
app.put('/api/admin/skills/:id', verifyToken, async (req, res) => {
    try {
        const skill = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ message: 'Technical skill card updated.', skill });
    } catch (err) {
        res.status(500).json({ message: 'Error updating skill.' });
    }
});
app.delete('/api/admin/skills/:id', verifyToken, async (req, res) => {
    await Skill.findByIdAndDelete(req.params.id);
    res.json({ message: 'Skill entry removed.' });
});

// 5. Contact Form Messages
app.post('/api/contact', async (req, res) => {
    const { email, message } = req.body;
    if (!email || !message) return res.status(400).json({ success: false, error: 'Incomplete content streams' });
    await new Message({ email, message }).save();
    res.status(201).json({ success: true, message: 'Message logged in collection.' });
});
app.get('/api/admin/messages', verifyToken, async (req, res) => res.json(await Message.find().sort({ timestamp: -1 })));

// 6. Work Experience Logic
app.get('/api/experience', async (req, res) => res.json(await Experience.find().sort({ order: 1 })));
app.post('/api/admin/experience', verifyToken, async (req, res) => {
    const newExp = new Experience(req.body);
    await newExp.save();
    res.json({ message: 'Experience timeline instance synchronized.' });
});
app.put('/api/admin/experience/:id', verifyToken, async (req, res) => {
    try {
        const exp = await Experience.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ message: 'Experience timeline instance updated.', exp });
    } catch (err) {
        res.status(500).json({ message: 'Error updating experience.' });
    }
});
app.delete('/api/admin/experience/:id', verifyToken, async (req, res) => {
    await Experience.findByIdAndDelete(req.params.id);
    res.json({ message: 'Experience record removed.' });
});

// 7. Education Logic
app.get('/api/education', async (req, res) => res.json(await Education.find().sort({ order: 1 })));
app.post('/api/admin/education', verifyToken, async (req, res) => {
    const newEdu = new Education(req.body);
    await newEdu.save();
    res.json({ message: 'Education history record synchronized.' });
});
app.put('/api/admin/education/:id', verifyToken, async (req, res) => {
    try {
        const edu = await Education.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ message: 'Education history record updated.', edu });
    } catch (err) {
        res.status(500).json({ message: 'Error updating education.' });
    }
});
app.delete('/api/admin/education/:id', verifyToken, async (req, res) => {
    await Education.findByIdAndDelete(req.params.id);
    res.json({ message: 'Education history record removed.' });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'An internal server error occurred.'
    });
});

// --- ENGINES LIFECYCLE ---
// Boots a local listener ONLY if not executing inside Vercel's cloud cluster
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`📡 Local server listening at http://localhost:${PORT}`);
    });
}

module.exports = app;