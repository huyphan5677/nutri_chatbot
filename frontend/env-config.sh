#!/bin/sh

echo "Injecting runtime environment variables..."

cat <<EOF > /usr/share/nginx/html/env-config.js
window.ENV = {
  VITE_API_URL: "${VITE_API_URL}",
  VITE_GOOGLE_CLIENT_ID: "${VITE_GOOGLE_CLIENT_ID}"
};
EOF

echo "Done injecting runtime environment variables."
