module.exports = {
  apps: [
    {
      name: 'clarity-backend',
      script: './dist/server.js',
      cwd: './backend',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        DATABASE_FILE: './data/minidrive.db'
      }
    }
  ]
};
