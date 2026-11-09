# GramCraft (ग्रामक्राफ्ट)
### Data-Driven Rural Development Planning Platform for India

GramCraft is an enterprise-grade planning, spatial GIS, AI recommendation, and gamified monitoring platform designed for Block Planners, District Officers, and Panchayat Secretaries across India.

```
       RAW VILLAGE DATA
              │
              ▼
         GIS MAPPING (Leaflet / GeoJSON / GPS)
              │
              ▼
         AI ANALYSIS (ML Intelligence Service)
              │
              ▼
         COMPOSITE SCORING (6 Sectors: 0-100)
              │
              ▼
         EXPLAINABLE RECOMMENDATIONS (Rule-Based + ML)
              │
              ▼
         BUDGET OPTIMIZATION (Greedy Diminishing Returns)
              │
              ▼
         EXECUTION & MONITORING (Gamified Missions, XP, Badges)
```

---

## 1. Prerequisites Installation (Beginner Windows Guide)

If you are setting this up for the first time on Windows 10/11:

### 1.1 Install Git
- Download and run the 64-bit installer from [git-scm.com](https://git-scm.com/).
- Choose default settings during installation.
- Verify in PowerShell:
  ```powershell
  git --version
  ```

### 1.2 Install Node.js (v20+ LTS)
- Download the Windows Installer (.msi) from [nodejs.org](https://nodejs.org/).
- Ensure the checkbox "Automatically install necessary tools" is checked.
- Verify in PowerShell:
  ```powershell
  node -v
  npm -v
  ```

### 1.3 Install Python (3.10+)
- Download the installer from [python.org](https://www.python.org/downloads/).
- **CRITICAL STEP**: On the very first screen of the installer, check the box that says **"Add python.exe to PATH"**.
- Click "Install Now".
- Verify in PowerShell:
  ```powershell
  python --version
  ```

### 1.4 Install Visual Studio Code
- Download and install [VS Code](https://code.visualstudio.com/).
- Recommended extensions: ESLint, Tailwind CSS IntelliSense, Python.

---

## 2. Database Setup: MongoDB Atlas or Local

### Option A: MongoDB Atlas (Cloud - Recommended)
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and sign up for a free account.
2. Select **M0 Free Cluster** and choose AWS / Mumbai (`ap-south-1`) region.
3. In **Database Access**, create a user `gramcraft_admin` with a password.
4. In **Network Access**, click **Add IP Address** -> Select **Allow Access from Anywhere** (`0.0.0.0/0`) for development.
5. In **Database** -> Click **Connect** -> Choose **Drivers** -> Copy the connection string:
   ```
   mongodb+srv://gramcraft_admin:<password>@cluster0.abcde.mongodb.net/gramcraft?retryWrites=true&w=majority
   ```
6. Paste this string into `api-gateway/.env` as `MONGODB_URI`.

### Option B: Local MongoDB
If you prefer running MongoDB locally:
- Download MongoDB Community Server from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community).
- Your connection string will be: `mongodb://127.0.0.1:27017/gramcraft`.
- *Note*: If neither Atlas nor local MongoDB is reachable during local testing, the API Gateway automatically falls back to an embedded in-memory MongoDB instance.

---

## 3. Opening the Project in VS Code & Three-Terminal Workflow

Open the `gramcraft` folder in VS Code:
1. File -> Open Folder -> `gramcraft`.
2. Open three separate integrated terminals in VS Code (`Ctrl + Shift + ` ` ` or Terminal -> New Terminal):
   - **Terminal 1**: Python ML Service
   - **Terminal 2**: Node.js API Gateway
   - **Terminal 3**: React Frontend

---

## 4. Terminal 1: Setup & Run Python ML Service

In Windows PowerShell:

```powershell
# 1. Navigate to ml-service
cd ml-service

# 2. If PowerShell restricts running scripts, execute this once:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 3. Create virtual environment
python -m venv venv

# 4. Activate virtual environment
.\venv\Scripts\Activate.ps1
# (Your prompt should now show (venv))

# 5. Install dependencies
pip install -r requirements.txt

# 6. Run automated test suite (verifies scikit-learn, Ridge regression & optimizer)
python -m pytest

# 7. Start ML Service
python -m app.__init__
```
The ML Service is now running at `http://localhost:5001`. You can test it by visiting `http://localhost:5001/health`.

---

## 5. Terminal 2: Setup, Seed & Run Node.js API Gateway

In your second PowerShell terminal:

```powershell
# 1. Navigate to api-gateway
cd api-gateway

# 2. Copy environment configuration
Copy-Item .env.example .env

# 3. Install packages
npm install

# 4. Seed database with 30 villages, 8 quarters of history, users & 40 projects
npm run seed

# 5. Run test suite
npm test

# 6. Start development server
npm run dev
```
The API Gateway is now running at `http://localhost:5000`.
- Health check: `http://localhost:5000/health`
- Interactive OpenAPI Docs: `http://localhost:5000/docs`

---

## 6. Terminal 3: Setup & Run React Frontend

In your third PowerShell terminal:

```powershell
# 1. Navigate to frontend
cd frontend

# 2. Install packages
npm install

# 3. Run frontend tests
npm test

# 4. Start Vite development server
npm run dev
```
The React frontend is now live at:
👉 **`http://localhost:5173`**

---

## 7. One-Command Alternative with Docker Compose

If you have Docker Desktop installed and running, you can launch the complete ecosystem with a single command:

```powershell
# From the project root (gramcraft/)
docker-compose up --build
```
Once the containers are healthy, seed the database:
```powershell
docker exec -it gramcraft-api-gateway npm run seed
```

---

## 8. Demo User Credentials & Scope Rules

GramCraft comes pre-seeded with 5 official user personas representing the administrative hierarchy:

| Role | Email | Password | Scope & Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@gramcraft.gov.in` | `GramCraft@2026` | Full administrative control across all districts, users, and settings. |
| **District Officer** | `district@gramcraft.gov.in` | `GramCraft@2026` | Manages Sehore District, approves score changes, monitors schemes. |
| **Block Planner** | `ichhawar.planner@gramcraft.gov.in` | `GramCraft@2026` | Runs AI budget optimization and monitors Ichhawar Block schemes. |
| **Village Officer** | `bijori.officer@gramcraft.gov.in` | `GramCraft@2026` | Updates Bijori Panchayat metrics. Edits to other villages are blocked (403). |
| **Public Viewer** | `viewer@gramcraft.gov.in` | `GramCraft@2026` | Read-only citizen scoreboard and map inspection. |

*Quick login buttons are available directly on the login screen (`/login`) for instant access without typing.*

---

## 9. Troubleshooting Top 10 Common Errors

### 1. `Port 5000 or 5001 or 5173 is already in use`
- **Cause**: An earlier node or python process is still holding the port.
- **Fix (Windows PowerShell)**:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
  ```

### 2. `Execution of scripts is disabled on this system (Activate.ps1)`
- **Cause**: Windows PowerShell default execution policy blocks scripts.
- **Fix**: Run in PowerShell:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

### 3. `python: The term 'python' is not recognized`
- **Cause**: Python was installed without the "Add python.exe to PATH" checkbox.
- **Fix**: Rerun the Python installer, click "Modify", and ensure "Add Python to environment variables" is selected. Alternatively, try `py -m venv venv`.

### 4. `MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`
- **Cause**: Local MongoDB service is not started.
- **Fix**: GramCraft's `connectDB` will automatically fallback to memory mode in development. For persistent data, supply a MongoDB Atlas URI in `api-gateway/.env`.

### 5. `CORS error in browser console`
- **Cause**: Frontend origin not in allowlist.
- **Fix**: Verify `CLIENT_URL=http://localhost:5173` in `api-gateway/.env`.

### 6. `Leaflet map tiles blank or gray`
- **Cause**: Internet connection blocking CartoDB/OSM CDN tiles.
- **Fix**: Leaflet requires internet access to fetch base map tiles. Check your network proxy or enable mobile hotspot.

### 7. `numpy.dtype size changed / binary incompatibility`
- **Cause**: Scikit-learn compiled against different NumPy ABI.
- **Fix**: GramCraft's ML modules (`forecast.py`, `peers.py`) use native closed-form matrix math with zero Cython dependencies, guaranteeing full compatibility.

### 8. `Forbidden: You are only permitted to manage your assigned village`
- **Cause**: This is expected behavior! You are logged in as a `village_officer` trying to edit a village outside your assigned scope. Log in as `admin@gramcraft.gov.in` to edit all villages.

### 9. `Score increase exceeds threshold. Formal change request generated.`
- **Cause**: Integrity rule: single updates jumping more than 10 points cannot silently overwrite scores.
- **Fix**: Log in as `district@gramcraft.gov.in` and approve the change request from the Admin/Monitoring panel.

### 10. `npm install fails with ERESOLVE unable to resolve dependency tree`
- **Cause**: Conflicting peer dependencies.
- **Fix**: Run `npm install --legacy-peer-deps`.

---

## 10. Econometric Calibration & Response Curve Assumptions

The marginal budget allocation algorithm and scenario simulator use a diminishing marginal returns saturation curve:

$$\Delta S = \min\left(25, (100 - S_{curr}) \times \left(1 - \exp\left(-0.20 \times \left(\frac{I}{C_{eff}}\right)^{0.55}\right)\right)\right)$$

Where $S_{curr}$ is the baseline sector score, $I$ is investment capital in INR, and $C_{eff}$ is effective cost scaled by village population.

> **Calibration Notice**: The elasticity exponent ($\alpha = 0.55$) and baseline costs in `ml-service/app/config.py` are engineering placeholders reflecting standard developmental economics. They must be calibrated against verified post-implementation project outcome audits as GramCraft field monitoring data accumulates.

---

## 11. Production Deployment Guide

| Component | Target Platform | Build Command | Output / Start | Environment Variables |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | Vercel / Netlify | `npm run build` | `dist` | `VITE_API_BASE_URL` |
| **API Gateway** | Render / Railway | `npm ci` | `npm start` | `NODE_ENV`, `PORT`, `MONGODB_URI`, `ML_SERVICE_URL`, `JWT_SECRET`, `CLIENT_URL` |
| **ML Service** | Render / Railway / Cloud Run | `pip install -r requirements.txt` | `gunicorn ...` | `PORT`, `FLASK_ENV`, `CORS_ORIGIN` |
| **Database** | MongoDB Atlas | Managed M10+ | Port 27017 | `2dsphere` indexes on location |

### Post-Deployment Verification Checklist
- [x] Run `GET /health` on API Gateway and ML Service -> both return 200 OK.
- [x] Test login for each of the 5 demo roles.
- [x] Verify Leaflet map renders 30 seeded villages and boundary polygons.
- [x] Test AI recommendation engine and next-quarter Ridge regression forecast.
- [x] Test greedy budget optimizer and scenario simulator.
- [x] Verify CSV import preview, row validation, and commit.
- [x] Download official PDF dossier for a village and verify GramCraft header formatting.
- [x] Switch between English and Hindi, Light and Dark mode.
- [x] Verify keyboard shortcuts (`Ctrl+K` Command Palette).
