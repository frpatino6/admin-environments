const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

const FALLBACK_DNS_SERVERS = ['8.8.8.8', '1.1.1.1'];

const configureDnsServers = () => {
  const configuredServers = process.env.DNS_SERVERS
    ? process.env.DNS_SERVERS.split(',').map((server) => server.trim()).filter(Boolean)
    : [];

  if (configuredServers.length > 0) {
    dns.setServers(configuredServers);
    console.log(`🌐 DNS servers configurados para Node: ${configuredServers.join(', ')}`);
    return configuredServers;
  }

  const currentServers = dns.getServers();
  const hasOnlyLoopbackDns = currentServers.length > 0 && currentServers.every((server) => server.startsWith('127.'));
  if (hasOnlyLoopbackDns) {
    dns.setServers(FALLBACK_DNS_SERVERS);
    console.log(`🌐 DNS local detectado (${currentServers.join(', ')}), usando fallback: ${FALLBACK_DNS_SERVERS.join(', ')}`);
    return FALLBACK_DNS_SERVERS;
  }

  return currentServers;
};

const shouldRetryWithDnsFallback = (error) => {
  const errorMessage = (error && error.message ? error.message : '').toLowerCase();
  return errorMessage.includes('querysrv') && errorMessage.includes('econnrefused');
};

const connectDB = async () => {
  configureDnsServers();

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB conectado exitosamente');
  } catch (error) {
    if (!process.env.DNS_SERVERS && shouldRetryWithDnsFallback(error)) {
      console.warn('⚠️ Error DNS SRV detectado. Reintentando con DNS públicos...');
      dns.setServers(FALLBACK_DNS_SERVERS);

      try {
        await mongoose.connect(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true
        });
        console.log('✅ MongoDB conectado exitosamente (retry DNS)');
        return;
      } catch (retryError) {
        console.error('❌ Error conectando a MongoDB (retry):', retryError.message);
        process.exit(1);
      }
    }

    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
