#!/bin/bash

# --- COLISEO ANGEL CRUZ RTMP-HLS SERVER SETUP SCRIPT ---
# TARGET: UBUNTU 22.04
# SERVICE: Nginx + RTMP Module + HLS fragments

echo "Starting Coliseo Angel Cruz Video Infrastructure Setup..."

# 1. Update and install dependencies
sudo apt update
sudo apt install -y curl gnupg2 ca-certificates lsb-release ubuntu-keyring ffmpeg libnginx-mod-rtmp nginx

# 2. Configure Nginx RTMP Module
# We will append the RTMP block to the main nginx.conf
sudo tee -a /etc/nginx/nginx.conf <<EOF

rtmp {
    server {
        listen 1935;
        chunk_size 4096;

        application live {
            live on;
            record off;

            # HLS Output Configuration (Tuned for Low Latency)
            hls on;
            hls_path /var/www/html/hls;
            hls_fragment 1s;        # Samll fragments for low latency
            hls_playlist_length 3s; # Short playlist window
            hls_type live;
        }
    }
}
EOF

# 3. Configure HTTP to serve HLS fragments (with CORS)
sudo tee /etc/nginx/sites-available/default <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;

    server_name _;

    location /hls {
        # Enable CORS for web players
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range';
        add_header 'Access-Control-Allow-Methods' 'GET, HEAD, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';

        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
        
        # Disable caching for live playlist
        add_header Cache-Control no-cache;
        expires -1;
    }

    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF

# 4. Create HLS Directory and set permissions
sudo mkdir -p /var/www/html/hls
sudo chown -R www-data:www-data /var/www/html/hls

# 5. Restart Nginx
sudo systemctl restart nginx

echo "--------------------------------------------------------"
echo "COLISEO ANGEL CRUZ SERVER READY!"
echo "--------------------------------------------------------"
echo "RTMP INTAKE (OBS): rtmp://[YOUR_SERVER_IP]/live"
echo "STREAM KEY: pollo_live"
echo "WEB HLS URL: http://[YOUR_SERVER_IP]/hls/pollo_live.m3u8"
echo "--------------------------------------------------------"
