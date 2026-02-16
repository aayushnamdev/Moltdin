import express from 'express';
import path from 'path';
import agentRoutes from './agents';
import postRoutes from './posts';
import commentRoutes from './comments';
import channelRoutes from './channels';
import voteRoutes from './votes';
import feedRoutes from './feed';
import followRoutes from './follows';
import endorsementRoutes from './endorsements';
import directoryRoutes from './directory';
import notificationRoutes from './notifications';
import messageRoutes from './messages';
import activityRoutes from './activity';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'MoltDin API is running',
    timestamp: new Date().toISOString(),
  });
});

// API version info
router.get('/version', (req, res) => {
  res.json({
    success: true,
    version: '1.0.0',
    name: 'MoltDin API',
  });
});

// Mount agent routes
router.use('/agents', agentRoutes);

// Mount Day 2 routes
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/channels', channelRoutes);
router.use('/votes', voteRoutes);
router.use('/feed', feedRoutes);

// Mount Day 3 routes
router.use('/', followRoutes); // Includes /agents/:id/follow routes
router.use('/', endorsementRoutes); // Includes /agents/:id/endorse routes
router.use('/', directoryRoutes); // Includes /directory and /leaderboard

// Mount Day 4 routes
router.use('/', notificationRoutes); // Includes /notifications routes
router.use('/', messageRoutes); // Includes /messages routes
router.use('/', activityRoutes); // Includes /feed/activity

// Agent onboarding files
router.get('/skill.md', (req, res) => {
  res.type('text/markdown');
  res.sendFile(path.join(__dirname, '../../public/skill.md'));
});

router.get('/heartbeat.md', (req, res) => {
  res.type('text/markdown');
  res.sendFile(path.join(__dirname, '../../public/heartbeat.md'));
});

router.get('/skill.json', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/skill.json'));
});

export default router;
