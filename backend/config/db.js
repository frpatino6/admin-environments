const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

const configureDnsServers = () => {
  const configuredServers = process.env.DNS_SERVERS
    ? process.env.DNS_SERVERS.split(',').map((server) => server.trim()).filter(Boolean)
    : [];

  if (configuredServers.length > 0) {
    dns.setServers(configuredServers);
    console.log(`🌐 DNS servers configurados para Node: ${configuredServers.join(', ')}`);
    return;
  }

  const currentServers = dns.getServers();
  if (currentServers.length === 1 && currentServers[0] === '127.0.0.1') {
    const fallbackServers = ['8.8.8.8', '1.1.1.1'];
    dns.setServers(fallbackServers);
    console.log(`🌐 DNS local detectado en 127.0.0.1, usando fallback: ${fallbackServers.join(', ')}`);
  }
};

const connectDB = async () => {
  try {
    configureDnsServers();
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB conectado exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
