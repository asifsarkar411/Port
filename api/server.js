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

// Adjust uploads for Vercel's read-only serverless environment fallback (/tmp)
const uploadDir = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/uploads', express.static(uploadDir));

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
  .then(() => {
      const isLocal = dbURI.includes('localhost') || dbURI.includes('127.0.0.1');
      console.log(`🚀 Backend engine running smoothly on port ${PORT}`);
      console.log(`✅ Connected successfully to: ${isLocal ? 'MongoDB Compass Local Cluster' : 'MongoDB Atlas Cloud Cluster'}`);
  })
  .catch(err => {
      console.error('❌ MongoDB Connection Error:', err);
  });

// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir), // Uses dynamic directory path
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
        res.status(401).json({ message: 'Invalid token confirmation context.' });
    }
};

// --- API CONTROLLER ROUTES ---

// 1. Authentication
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    let user = await User.findOne({ username });
    
    const fallbackPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (!user && username === 'admin') {
        const hashedFallbackPassword = await bcrypt.hash(fallbackPassword, 10);
        user = new User({ username: 'admin', password: hashedFallbackPassword });
        await user.save();
    } else if (user && username === 'admin' && process.env.ADMIN_PASSWORD) {
        const dbPasswordMatch = await bcrypt.compare(password, user.password);
        if (!dbPasswordMatch && password === process.env.ADMIN_PASSWORD) {
            user.password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
            await user.save();
        }
    }
    
    if (!user) return res.status(404).json({ message: 'User record not found.' });
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ message: 'Invalid structural credentials.' });
    
    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token });
});

// 2. Projects
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

// 3. Profiles & CV Assets
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
    await Cv.deleteMany({});
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
app.delete('/api/admin/experience/:id', verifyToken, async (req, res) => {
    await Experience.findByIdAndDelete(req.params.id);
    res.json({ message: 'Experience record removed.' });
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