Terminal 1:(root)
# Pastikan Docker Desktop sudah berjalan dulu!
cd c:\Users\rafae\Desktop\hidroponikdashboard
docker compose up --build -d

lalu cek docker compose ps

Terminal 2:
cd frontend
npm run dev

terminal 3:(root)
node scripts/simulate-mqtt.mjs

# Stop simulator: Ctrl+C di terminal 3
# Stop frontend: Ctrl+C di terminal 2
# Stop Docker:
docker compose down
