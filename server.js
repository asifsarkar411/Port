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
const JWT_SECRET = 'YOUR_SUPER_SECURE_SECRET_KEY_CHANGE_THIS';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Auto-generate target directories
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

/// Connect to MongoDB Database Engine

mongoose.connect('mongodb://localhost:27017/portfolio')

  .then(() => {

      console.log('🚀 Backend engine running smoothly on port 5000');

      console.log('✅ Connected successfully to MongoDB Compass local cluster');

  })

  .catch(err => console.error('❌ MongoDB Connection Error:', err));
// Multer Storage Pipeline Rules Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

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
    status: { type: String, default: 'active' }
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

// Route Protection Interceptor (JWT Verification)
const verifyToken = (req, res, next) => {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ message: 'Access Denied. Token missing.' });
    try {
        const verified = jwt.verify(header.split(' ')[1], JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: 'Invalid token confirmation context.' });
    }
};

// --- CONTROLLER ENDPOINTS (API ROUTES) ---

// 1. Authentication
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    // Base Seed Execution Fallback Check: Auto-provision default admin space if database is empty
    let user = await User.findOne({ username });
    if (!user && username === 'admin') {
        const hashedFallbackPassword = await bcrypt.hash('admin123', 10);
        user = new User({ username: 'admin', password: hashedFallbackPassword });
        await user.save();
    }
    
    if (!user) return res.status(404).json({ message: 'User record not found.' });
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ message: 'Invalid structural credentials.' });
    
    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token });
});

// 2. Public & Secure Projects
app.get('/api/projects', async (req, res) => res.json(await Project.find({ status: 'active' })));
app.get('/api/admin/projects', verifyToken, async (req, res) => res.json(await Project.find()));
app.post('/api/projects', verifyToken, upload.single('projectImage'), async (req, res) => {
    const newProject = new Project({
        title: req.body.title,
        description: req.body.description,
        link: req.body.link,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : '',
        status: 'active'
    });
    await newProject.save();
    res.json({ message: 'Project instance captured successfully!' });
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

// 3. Profiles & Dynamic CV Assets
app.get('/api/profile', async (req, res) => res.json(await Profile.findOne() || { avatarUrl: '' }));
app.post('/api/profile', verifyToken, upload.single('profileImage'), async (req, res) => {
    let profile = await Profile.findOne();
    const targetUrl = `/uploads/${req.file.filename}`;
    if (profile) profile.avatarUrl = targetUrl; else profile = new Profile({ avatarUrl: targetUrl });
    await profile.save();
    res.json({ message: 'Avatar image reassigned successfully.', avatarUrl: targetUrl });
});
app.get('/api/cv', async (req, res) => res.json(await Cv.findOne().sort({ uploadedAt: -1 }) || { fileUrl: '' }));
app.post('/api/admin/cv/upload', verifyToken, upload.single('cvFile'), async (req, res) => {
    await Cv.deleteMany({}); // Wipe stale pointers
    const newCv = new Cv({ fileUrl: `/uploads/${req.file.filename}` });
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
app.delete('/api/admin/skills/:id', verifyToken, async (req, res) => {
    await Skill.findByIdAndDelete(req.params.id);
    res.json({ message: 'Skill entry removed.' });
});

// 5. Secure Form Messaging
app.post('/api/contact', async (req, res) => {
    const { email, message } = req.body;
    if (!email || !message) return res.status(400).json({ success: false, error: 'Incomplete content streams' });
    await new Message({ email, message }).save();
    res.status(201).json({ success: true, message: 'Message logged in local cluster collection.' });
});
app.get('/api/admin/messages', verifyToken, async (req, res) => res.json(await Message.find().sort({ timestamp: -1 })));

// 6. Work Experience Logic
app.get('/api/experience', async (req, res) => res.json(await Experience.find().sort({ order: 1 })));
app.post('/api/admin/experience', verifyToken, async (req, res) => {
    const newExp = new Experience(req.body);
    await newExp.save();
    res.json({ message: 'Experience timeline instance successfully synchronized.' });
});
app.delete('/api/admin/experience/:id', verifyToken, async (req, res) => {
    await Experience.findByIdAndDelete(req.params.id);
    res.json({ message: 'Experience record removed.' });
});

// app.listen(5000);
module.exports = app;