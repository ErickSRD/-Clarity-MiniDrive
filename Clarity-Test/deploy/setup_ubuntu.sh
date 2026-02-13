#!/bin/bash

# Clarity System Production Setup Script for Ubuntu 24.04
# Run with: sudo bash setup_production.sh

echo "Starting Clarity System setup for Production..."

# 1. Update system
apt update && apt upgrade -y

# 2. Install Node.js (current LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs nginx sqlite3 git

# 3. Install PM2 globally
npm install -g pm2

# 4. Create directory structure
mkdir -p /var/www/clarity
chown -R $USER:$USER /var/www/clarity

echo "Software installed. Now you should copy the project files to /var/www/clarity"
echo "After copying files, run the following steps manually or uncomment them in this script:"

# Step to build backend
# cd /var/www/clarity/backend
# npm install
# npm run build

# Step to build frontend (ensure VITE_API_BASE is set to /api for same-domain proxy)
# cd /var/www/clarity/frontend
# npm install
# VITE_API_BASE=/api npm run build

# 5. Build and install dependencies
echo "Installing dependencies and building projects..."
cd /var/www/clarity/backend
npm install
npm run build
mkdir -p /var/www/clarity/backend/data

# Ensure the app files are accessible and data is writable by the service user (www-data)
sudo chown -R www-data:www-data /var/www/clarity/backend
sudo chmod -R 755 /var/www/clarity/backend

cd /var/www/clarity/frontend
npm install
# Set VITE_API_BASE to empty because the frontend code already includes '/api/' in its paths
VITE_API_BASE="" npm run build

# 6. Configure Nginx
echo "Configuring Nginx..."
sudo cp /var/www/clarity/deploy/nginx.conf /etc/nginx/sites-available/clarity
sudo ln -sf /etc/nginx/sites-available/clarity /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 7. Configure Backend as a systemd Service
echo "Installing Clarity Backend as a systemd service..."
sudo cp /var/www/clarity/deploy/clarity-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable clarity-backend
sudo systemctl start clarity-backend

# 8. Set up Production Admin
echo "Setting up production admin user..."
cd /var/www/clarity/backend
# This will generate the defined users and schema
DATABASE_FILE=/var/www/clarity/backend/data/minidrive.db node scripts/create_prod_admin.js

# 9. Final Permissions check
# Ensure the database directory and files are owned by www-data AFTER creation
sudo chown -R www-data:www-data /var/www/clarity/backend/data
sudo chmod -R 775 /var/www/clarity/backend/data

echo "Setup complete! The system should be running at http://your-server-ip"
echo "You can check the backend status with: sudo systemctl status clarity-backend"
echo "You can check the backend logs with: sudo journalctl -u clarity-backend -f"
