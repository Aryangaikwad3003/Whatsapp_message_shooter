const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const templateRoutes = require('./routes/templates');
const broadcastRoutes = require('./routes/broadcast');
const eventRoutes = require('./routes/events');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/broadcast', broadcastRoutes);
app.use('/api/events', eventRoutes);

const PORT = process.env.PORT || 3005;
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
