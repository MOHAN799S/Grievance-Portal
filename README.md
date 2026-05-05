<div align="center">

<img src="https://img.shields.io/badge/Status-Published%20Research-brightgreen?style=for-the-badge" />

# 🏛️ Civic Connect
### AI-Based Public Grievance Analysis & Prioritization System

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-NoSQL-brightgreen?style=for-the-badge&logo=mongodb)](https://mongodb.com/)
[![Python](https://img.shields.io/badge/Python-3.10-blue?style=for-the-badge&logo=python)](https://python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-BERT-EE4C2C?style=for-the-badge&logo=pytorch)](https://pytorch.org/)
[![HuggingFace](https://img.shields.io/badge/🤗%20HuggingFace-Deployed-yellow?style=for-the-badge)](https://mohanbot799s-civicconnect-ai-engine.hf.space)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**📄 Peer-Reviewed Publication · IJSRA Vol.18, Issue 3, 2026**
**DOI: [10.30574/ijsra.2026.18.3.0473](https://doi.org/10.30574/ijsra.2026.18.3.0473)**

*B.Tech Final-Year Capstone · Aditya College of Engineering & Technology (2022–2026)*

[🌐 Live Demo](https://grievance-portal-one.vercel.app/) · [🤖 AI Engine](https://mohanbot799s-civicconnect-ai-engine.hf.space) · [📄 Research Paper](https://doi.org/10.30574/ijsra.2026.18.3.0473) · [🐛 Report Bug](https://github.com/MOHAN799S/grievance-portal/issues)

</div>

---

## 📌 Table of Contents

- [About the Project](#-about-the-project)
- [Key Innovations](#-key-innovations)
- [Repository Structure](#-repository-structure)
- [System Architecture](#-system-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [AI Engine (Hugging Face)](#-ai-engine-hugging-face)
- [AI Classification Modules](#-ai-classification-modules)
- [Database Design](#-database-design)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Testing & Results](#-testing--results)
- [Performance Metrics](#-performance-metrics)
- [Limitations](#-limitations)
- [Future Scope](#-future-scope)
- [Team](#-team)
- [Publication](#-publication)
- [License](#-license)

---

## 🔍 About the Project

Traditional government grievance portals like **CPGRAMS** rely on manual classification across 91+ departments and 15,000+ categories — leading to mis-routing, resolution delays, and poor prioritization. Citizens filing complaints in regional languages are often ignored entirely.

**Civic Connect** is a full-stack, AI-powered platform that automates the entire grievance lifecycle — from multilingual submission to intelligent classification, geo-verified evidence collection, fairness auditing, and transparent admin resolution.

> This project consists of **two separate deployments**:
> - **`grievance-portal`** — Full-stack web application (Next.js frontend + Node.js/Express backend)
> - **`civicconnect-ai-engine`** — Python AI microservice deployed on Hugging Face Spaces

> Published as a peer-reviewed research article in the *International Journal of Science and Research Archive* (IJSRA), 2026.

---

## 💡 Key Innovations

| Innovation | Description |
|---|---|
| **Token-Free Citizen Submission** | Citizens submit grievances without mandatory registration — removing barriers for low-literacy users |
| **Dual BERT Classification** | Separate fine-tuned models for English (`bert-base-uncased`) and Indic languages (`IndicBERT`) — classifies into 8 departments with 85–92% accuracy |
| **Urgency Sentiment Model** | Dedicated BERT-based urgency classifier (separate from category) for both English and Indic inputs |
| **Geo-Tagged Evidence (Geo-Camera)** | GPS coordinates, street address, and timestamp burned directly onto evidence photos — preventing fraudulent or backdated submissions |
| **Explainable Prioritization (X-PE)** | Priority assigned with SHAP + Integrated Gradients explanations — not just keyword matching |
| **Fairness Audit System (GFAS)** | Monitors classification bias across geographic regions and language groups — flags disparity in real time |
| **Multimodal Input** | Accepts text, geo-tagged images, and voice notes — processed through a unified NLP pipeline |
| **Dual-Access Security** | Open citizen portal + JWT-protected admin dashboard with strict privilege separation |

---

## 📁 Repository Structure

This project is split across **two repositories / deployment targets**:

```
📦 grievance-portal/              ← This repo (GitHub)
├── 📁 server/                    ← Node.js + Express REST API
│   ├── 📁 config/
│   │   └── resend.js             # Email service config
│   ├── 📁 models/
│   │   ├── Grievance.js          # Grievance schema
│   │   ├── HotspotAlert.js       # Hotspot alert schema
│   │   ├── Otp.js                # OTP verification schema
│   │   └── User.js               # User schema (citizen + admin)
│   ├── 📁 routes/
│   │   └── auth.routes.js        # Auth API routes
│   └── index.js                  # Main server entry point
│
└── 📁 web-portal/                ← Next.js 14 Frontend
    ├── 📁 app/
    │   ├── 📁 admin/
    │   │   ├── dashboard/page.jsx # Admin grievance dashboard
    │   │   └── login/page.jsx     # Admin login
    │   ├── 📁 citizen/
    │   │   ├── history/page.jsx   # Citizen complaint tracking
    │   │   ├── lodge/page.jsx     # Grievance submission (Geo-Camera)
    │   │   └── login/page.jsx     # Citizen login
    │   ├── layout.jsx
    │   └── page.jsx               # Landing page
    ├── 📁 components/
    │   └── GrievanceMap.jsx       # Live complaint heatmap
    ├── 📁 hooks/
    │   └── useAuth.js
    └── 📁 lib/
        └── auth.js
```

> **AI Microservice** is maintained separately and deployed on Hugging Face Spaces.
> See [AI Engine](#-ai-engine-hugging-face) section below.

---

## 🏗️ System Architecture

The platform follows a **three-tier architecture** with a decoupled AI microservice:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CITIZEN INTERFACE                         │
│   Smart Lodge Form │ Geo-Camera Module │ Voice Note Input        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST API
┌──────────────────────────▼──────────────────────────────────────┐
│                    BACKEND (Node.js / Express)                   │
│  Auth Controller (JWT) │ Grievance Controller │ File Handler     │
│  Multer Upload  │  Cloudinary Storage  │  AI Connector           │
└──────────┬──────────────────────────────────────┬───────────────┘
           │                                      │
┌──────────▼───────────┐      ┌───────────────────▼───────────────┐
│   MongoDB Database   │      │  Python AI Microservice (HF Space) │
│  Users / Grievances  │      │  ├── BERT Classification (EN/Indic)│
│  Departments / Logs  │      │  ├── Urgency Sentiment Model       │
│  HotspotAlerts       │      │  ├── X-PE Explainability (SHAP)    │
└──────────────────────┘      │  ├── GFAS Fairness Audit           │
                              │  └── Multimodal (Audio + Image)    │
                              └───────────────────────────────────┘
                                              │
                              ┌───────────────▼───────────────────┐
                              │         ADMIN DASHBOARD            │
                              │  Live Heatmap │ Analytics          │
                              │  Spam Filter  │ Resolve            │
                              │  Fairness Audit Widget             │
                              └───────────────────────────────────┘
```

**Data Flow:**
`Citizen submits grievance` → `Geo-tag + media embed` → `Upload to Cloudinary` → `AI classifies category + urgency + assigns priority with explanation` → `Stored in MongoDB` → `Admin notified` → `Admin resolves` → `Citizen status updated`

---

## ✨ Features

### 🧑‍💼 Citizen — Smart Lodge
- Submit grievances with text, geo-tagged photo, and optional voice note
- No mandatory login — name and area are sufficient
- Real-time GPS coordinate capture via browser API
- Reverse geocoding via OpenStreetMap — readable address embedded on image
- Unique tracking ID generated per submission
- "My History" page for tracking personal submissions

### 🤖 AI Engine
- Category classification into **8 departments**: Water Supply, Roads, Sanitation, Electricity, Garbage, Pollution, Public Transport, Stray Animals
- Separate **urgency sentiment model** (Critical / High / Medium / Low)
- **Dual-language models** — dedicated pipelines for English and Indic (Telugu/Hindi) inputs
- Explainable outputs via **SHAP** and **Integrated Gradients** (X-PE module)
- Multimodal support: audio transcription + image captioning as additional input
- Processing time: ~0.4 seconds per query

### 👨‍💻 Admin Dashboard
- Secure JWT login (admin role only)
- Live heatmap of active complaint zones (OpenStreetMap)
- Filter grievances by category, urgency, status, and area
- One-click Resolve with admin reply
- Spam detection and filtering
- **Fairness Audit widget** (GFAS) — Geographic: 69 · Category: 90 · Language: 93
- Real-time analytics: Total Filed, Active, Pending, Resolved, Critical

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 14 | Citizen portal + Admin dashboard |
| Tailwind CSS | Responsive UI styling |
| Lucide React | Icon library |
| Axios | HTTP client |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express.js | REST API server |
| Mongoose | MongoDB ODM |
| Multer | File upload handler |
| JSON Web Token (JWT) | Authentication & authorization |
| Cloudinary | Cloud media storage (images + audio) |
| Resend | Email notifications |

### AI / ML
| Technology | Purpose |
|---|---|
| Python 3.10 | AI microservice runtime |
| PyTorch | Deep learning framework |
| Hugging Face Transformers | BERT + IndicBERT model loading & inference |
| SHAP | Explainability (category) |
| Integrated Gradients | Explainability (urgency) |
| Scikit-learn | Label encoding, preprocessing |
| Pandas | Dataset management |
| Flask | AI microservice HTTP server |
| Docker | Containerized deployment on HF Spaces |

### Database & Storage
| Technology | Purpose |
|---|---|
| MongoDB (NoSQL) | Primary database |
| Cloudinary | Evidence images & audio files |

---

## 🤖 AI Engine (Hugging Face)

The AI microservice is **fully decoupled** from the Node.js backend and deployed independently on Hugging Face Spaces.

**🔗 Live AI Endpoint:** [`https://mohanbot799s-civicconnect-ai-engine.hf.space`](https://mohanbot799s-civicconnect-ai-engine.hf.space)

### AI Engine Structure

```
civicconnect-ai-engine/
├── 📁 civicconnect-bert-en/         # English category classification model
├── 📁 civicconnect-bert-indic/      # Indic category classification model
├── 📁 civicconnect-urgency-en/      # English urgency sentiment model
├── 📁 civicconnect-urgency-indic/   # Indic urgency sentiment model
│
├── 📁 classification/               # Classification inference scripts
│   ├── bert_classify.py             # English BERT inference
│   ├── bert_model.py                # English model definition
│   ├── indic_bert_classify.py       # Indic BERT inference
│   ├── indic_bert_model.py          # Indic model definition
│   └── 📁 artifacts/                # Tokenizers, label maps, datasets
│
├── 📁 sentiment_analysis/           # Urgency/severity prediction
│   ├── bert_predict.py              # English urgency inference
│   ├── bert_model.py
│   ├── indic_bert_predict.py        # Indic urgency inference
│   ├── indic_bert_model.py
│   └── 📁 artifacts/                # Urgency model weights + label maps
│
├── 📁 xpe/                          # Explainability module
│   ├── priority_engine.py           # Final priority decision logic
│   ├── hybrid_explainer.py          # Combined SHAP + IG explainer
│   ├── shap_category.py             # SHAP for category model
│   ├── shap_urgency.py              # SHAP for urgency model
│   └── integrated_gradients_explainer.py
│
├── 📁 gfas/                         # Fairness audit system
│   ├── gfas_engine.py               # Core GFAS engine
│   ├── fairness_audit.py
│   ├── fairness_metrics.py
│   ├── disparity_analysis.py
│   └── report_generator.py
│
├── 📁 multi_modal/                  # Multimodal input processing
│   ├── audio_to_text.py             # Voice note transcription
│   └── image_to_text.py             # Image captioning
│
├── app.py                           # Flask API entry point
├── Dockerfile                       # Container config for HF Spaces
└── requirements.txt
```

---

## 🧠 AI Classification Modules

### 1. Category Classification
Fine-tuned `bert-base-uncased` (English) and `IndicBERT` (Telugu/Hindi) classify grievances into 8 departments.

**Supported Categories:** `Water Supply` · `Roads` · `Sanitation` · `Electricity` · `Garbage` · `Pollution` · `Public Transport` · `Stray Animals`

### 2. Urgency Sentiment Analysis
A separate BERT-based urgency model predicts complaint severity independently from category — enabling more nuanced prioritization.

| Urgency Level | Examples |
|---|---|
| Critical | Fire, accident, medical emergency |
| High | No water for 3+ days, power outage, sewage overflow |
| Medium | Road damage, irregular garbage collection |
| Low | Stray animals, minor complaints |

### 3. Explainable Prioritization (X-PE)
The X-PE module combines SHAP values and Integrated Gradients to produce a **human-readable explanation** for every priority decision — not just a label.

```
Input  →  Category Model (SHAP)  ─┐
                                   ├→ Hybrid Explainer → Priority + Explanation
Input  →  Urgency Model  (IG)   ──┘
```

### 4. Fairness Audit System (GFAS)
Continuously monitors classification outputs for disparities across:
- **Geographic regions** (Score: 69/100 — Moderate)
- **Complaint categories** (Score: 90/100 — Equitable)
- **Language groups** (Score: 93/100 — Equitable)
- **Overall Fairness: 84/100 — Equitable**

### 5. Multimodal Input
- `audio_to_text.py` — Transcribes voice notes into text fed to the NLP pipeline
- `image_to_text.py` — Generates captions from geo-tagged photos as supplemental context

---

## 🗄️ Database Design

### MongoDB Collections

**Users**
```json
{
  "_id": "ObjectId",
  "name": "String",
  "email": "String (unique)",
  "password": "String (hashed)",
  "pincode": "String",
  "role": "citizen | admin",
  "createdAt": "Date"
}
```

**Grievances**
```json
{
  "_id": "ObjectId",
  "citizenName": "String",
  "userEmail": "String",
  "area": "String",
  "description": "String",
  "category": "String (AI-assigned)",
  "priority": "Critical | High | Medium | Low",
  "status": "Pending | In Progress | Resolved | Spam",
  "imageUrl": "String (Cloudinary URL)",
  "audioUrl": "String (Cloudinary URL)",
  "adminReply": "String",
  "estimatedTime": "String",
  "createdAt": "Date"
}
```

**HotspotAlerts**
```json
{
  "_id": "ObjectId",
  "area": "String",
  "category": "String",
  "count": "Number",
  "severity": "String",
  "createdAt": "Date"
}
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Python](https://python.org/) 3.10+
- [MongoDB](https://www.mongodb.com/) (local or Atlas)
- [Cloudinary](https://cloudinary.com/) account (free tier works)

### 1. Clone the Repository

```bash
git clone https://github.com/MOHAN799S/grievance-portal.git
cd grievance-portal
```

### 2. Configure Environment Variables

Create a `.env` file in the `server/` directory:

```env
# Server
PORT=5000
MONGO_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI Microservice
AI_ENGINE_URL=https://mohanbot799s-civicconnect-ai-engine.hf.space

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
```

### 3. Install & Run Backend

```bash
cd server
npm install
node index.js
# Server running on http://localhost:5000
```

### 4. Install & Run Frontend

```bash
cd web-portal
npm install
npm run dev
# App running on http://localhost:3000
```

### 5. AI Microservice

The AI engine is **pre-deployed on Hugging Face Spaces** and ready to use via the `AI_ENGINE_URL` env variable. No local setup needed.

To run locally (optional):

```bash
# Clone the AI engine separately
git clone https://huggingface.co/spaces/mohanbot799s/civicconnect-ai-engine
cd civicconnect-ai-engine
pip install -r requirements.txt
python app.py
# Flask AI service running on http://localhost:7860
```

### 6. Access the App

| Interface | URL |
|---|---|
| Citizen Portal | `http://localhost:3000` |
| Grievance Submission | `http://localhost:3000/citizen/lodge` |
| My History | `http://localhost:3000/citizen/history` |
| Admin Dashboard | `http://localhost:3000/admin/dashboard` |
| AI Service (Live) | `https://mohanbot799s-civicconnect-ai-engine.hf.space` |

> **Allow camera and location permissions** in your browser when prompted on the Lodge page.

---

## 📡 API Reference

### Auth Routes

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Register new citizen |
| `POST` | `/api/auth/login` | Public | Citizen login → returns JWT |
| `POST` | `/api/admin/login` | Public | Admin login → strict role check |

### Grievance Routes

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/grievances` | Public | Fetch grievances (filter by email) |
| `POST` | `/api/grievances/submit` | Public | Submit grievance with media |
| `PUT` | `/api/grievances/:id` | Admin JWT | Resolve grievance + admin reply |
| `DELETE` | `/api/grievances/:id` | Admin JWT | Delete grievance |

### AI Engine Routes (Hugging Face)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/classify` | Text → Category + Priority + Explanation |
| `GET` | `/health` | Service health check |

**Example Request:**
```json
POST https://mohanbot799s-civicconnect-ai-engine.hf.space/classify
{
  "text": "No water supply in our area since 3 days",
  "language": "en"
}
```

**Example Response:**
```json
{
  "category": "Water Supply",
  "urgency": "High",
  "priority": "High",
  "confidence": 0.923,
  "explanation": "Keywords 'no water supply' and 'since 3 days' indicate a critical infrastructure failure affecting daily life."
}
```

### Auth Headers (Admin Routes)
```
Authorization: Bearer <jwt_token>
```

---

## 🧪 Testing & Results

### Test Cases Summary

| Test ID | Description | Expected | Status |
|---|---|---|---|
| TC-01 | Citizen lodge without login | Data saved to MongoDB | ✅ Pass |
| TC-02 | Geo-tagging accuracy | Coords + address on image | ✅ Pass |
| TC-03 | English AI classification | Category: Electricity, Priority: High | ✅ Pass |
| TC-04 | Indic language classification | Correct Telugu/Hindi routing | ✅ Pass |
| TC-05 | Admin login + JWT validation | Dashboard access granted | ✅ Pass |
| TC-06 | Spam detection | Moved to spam folder | ✅ Pass |
| TC-07 | GFAS fairness audit | Scores returned correctly | ✅ Pass |
| TC-08 | Concurrent load (100 users) | No crash, stable response | ✅ Pass |

**Total Test Cases:** 30 · **Passed:** 28 · **Failed:** 2 · **Success Rate: 93%**

---

## 📊 Performance Metrics

| Metric | Value |
|---|---|
| AI Classification Accuracy | 85–92% (validation set) |
| Grievance Submission Response Time | ~1.5 seconds (incl. image upload) |
| AI Prediction Time | ~0.4 seconds per query |
| Concurrent Request Capacity | 100+ (stress tested) |
| Fairness — Geographic | 69 / 100 (Moderate) |
| Fairness — Category | 90 / 100 (Equitable) |
| Fairness — Language | 93 / 100 (Equitable) |
| Overall Fairness Score | **84 / 100 (Equitable)** |
| Test Cases Passed | 28 / 30 (93%) |

### Civic Connect vs. Existing Systems

| Feature | CPGRAMS (Manual) | Civic Connect |
|---|---|---|
| Classification | Manual clerks | Automated AI (BERT) |
| Prioritization | First-Come-First-Serve | AI severity-based |
| Evidence | Basic image upload | Geo-tagged + timestamped |
| Language Support | English + Hindi | English, Telugu, Hindi |
| Explainability | None | SHAP + Integrated Gradients |
| Bias Monitoring | None | Real-time GFAS |
| Citizen Access | Mandatory login | Token-free |

---

## ⚠️ Limitations

1. **Dataset Bias** — BERT models may struggle with unfamiliar regional slang or dialects not present in training data
2. **Internet Dependency** — Cloudinary, OpenStreetMap, and Hugging Face services require stable connectivity
3. **GPS Accuracy** — In dense urban environments or indoors, GPS accuracy can vary ±10–20 meters
4. **Scalability** — Single-instance setup requires load balancing beyond 1,000 concurrent users
5. **Mixed Language (Code-Switching)** — Hinglish or Telugu-English mixed inputs show reduced classification accuracy
6. **Privacy** — Geo-tagged images and personal descriptions constitute PII; full compliance required before production deployment

---

## 🔭 Future Scope

- **Multilingual Voice AI** — Speech-to-Text for Telugu and Hindi voice complaints
- **Blockchain Audit Trail** — Immutable grievance resolution records for tamper-proof accountability
- **IoT Integration** — Auto-generated complaints from smart city sensors
- **Predictive Analytics** — Hotspot prediction model to proactively identify complaint surge areas
- **Mobile Application** — Android/iOS app with push notifications and offline draft support
- **Government Portal Integration** — Direct API integration with CPGRAMS and state e-governance portals

---

## 👥 Team

| Name | Role | Reg. No. |
|---|---|---|
| **Sangidi Mohan Lakshman** | Full Stack + AI Integration | 22MH1A0562 |
| **Kunche Alekhya** | Frontend + Documentation | 22MH1A0531 |
| **Kasindala Pardhasaradhi** | Backend + Database | 22MH1A0525 |
| **Digumarthi Jaya Phani Srinivas** | AI Module + Testing | 22MH1A0514 |

**Project Guide:** Mr. S. Chittibabulu, M.Tech (Ph.D), Assistant Professor, Dept. of CSE

**Institution:** Aditya College of Engineering & Technology, Surampalem
*(Autonomous · AICTE Approved · NBA & NAAC A+ · Affiliated to JNTUK)*

---

## 📄 Publication

> **S. Mohan Lakshman, A. Alekhya, K. Pardhasaradhi, D. J. Phani Srinivas, S. Chittibabulu**
> *"Multimodal artificial intelligence priorities and analysis portal in citizen services"*
> International Journal of Science and Research Archive (IJSRA), Vol. 18, Issue 3, pp. 645–651, 2026
> **DOI:** [10.30574/ijsra.2026.18.3.0473](https://doi.org/10.30574/ijsra.2026.18.3.0473)
> Received: 29 Jan 2026 · Revised: 07 Mar 2026 · Accepted: 09 Mar 2026

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ at Aditya College of Engineering & Technology, Surampalem**

If this project helped you, please ⭐ star the repository!

</div>
