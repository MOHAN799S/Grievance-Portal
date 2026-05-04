<div align="center">

# 🏛️ Civic Connect
### AI-Based Public Grievance Analysis & Prioritization System

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-grievance--portal--one.vercel.app-00C7B7?style=for-the-badge)](https://grievance-portal-one.vercel.app/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-MOHAN799S%2FGrievance--Portal-181717?style=for-the-badge&logo=github)](https://github.com/MOHAN799S/Grievance-Portal)
[![ML on HuggingFace](https://img.shields.io/badge/🤗_ML_Model-Hugging_Face-FFD21E?style=for-the-badge)](https://huggingface.co/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![Made With](https://img.shields.io/badge/Made_with-❤️_in_India-orange?style=for-the-badge)](https://github.com/MOHAN799S/Grievance-Portal)

<br/>

> **An intelligent, AI-powered platform that bridges the gap between citizens and government — making grievance redressal faster, transparent, and accessible to all.**

> 📌 **This repository contains the Frontend (Next.js) and Backend (Node.js) of Civic Connect.**
> The ML/AI Classification Model is separately deployed on 🤗 Hugging Face → [View ML Model](https://huggingface.co/)

<br/>

![---------------------------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png)

</div>

## 📋 Table of Contents

- [🎯 About the Project](#-about-the-project)
- [🗂️ Repository Structure](#️-repository-structure)
- [🚨 The Problem](#-the-problem)
- [💡 Our Solution](#-our-solution)
- [✨ Key Features](#-key-features)
- [🏗️ System Architecture](#️-system-architecture)
- [🧠 How the AI Works](#-how-the-ai-works)
- [⚙️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
- [📊 Performance & Results](#-performance--results)
- [🔬 Testing](#-testing)
- [🔮 Future Scope](#-future-scope)
- [👥 Team](#-team)
- [🙏 Acknowledgements](#-acknowledgements)
- [📚 References](#-references)

---

## 🎯 About the Project

**Civic Connect** is a final year B.Tech project developed at **Aditya College of Engineering & Technology (A)**, Department of Computer Science & Engineering, affiliated to JNTUK.

The system is an **AI-powered, multimodal grievance redressal platform** that integrates advanced Natural Language Processing (NLP), Machine Learning (ML), and Explainable AI (XAI) to automate and improve public complaint handling in e-governance.

| Field | Details |
|-------|---------|
| 🎓 Degree | Bachelor of Technology — Computer Science & Engineering |
| 🏫 Institution | Aditya College of Engineering & Technology (A), Surampalem |
| 📅 Academic Year | 2022–2026 |
| 👨‍🏫 Guide | Mr. S. Chittibabulu M.Tech (Ph.D), Associate Professor |
| 🌐 Live Demo | [grievance-portal-one.vercel.app](https://grievance-portal-one.vercel.app/) |
| 🤗 ML Model | Deployed separately on Hugging Face |

---

## 🗂️ Repository Structure

> ⚠️ **This project is split across two separate repositories**

| Part | Repository | Deployed On |
|------|-----------|-------------|
| 🖥️ **Frontend + Backend** | [MOHAN799S/Grievance-Portal](https://github.com/MOHAN799S/Grievance-Portal) ← **You are here** | Vercel |
| 🤗 **ML / AI Classification Model** | Hugging Face Space | [Hugging Face 🤗](https://huggingface.co/) |

The **Frontend** (Next.js) communicates with the **Backend** (Node.js/Express), which calls the **ML API** hosted on Hugging Face to classify and prioritize grievances in real time.

```
[Next.js Frontend]  →  [Node.js Backend]  →  [🤗 Hugging Face ML API]
     Vercel               This Repo              Separate HF Space
```

---

## 🚨 The Problem

Traditional grievance redressal systems like **CPGRAMS** handle complaints across 91+ departments and 15,000+ categories but suffer from critical limitations:

| Issue | Impact |
|-------|--------|
| ❌ Manual Classification | Slow processing, human errors, misrouting |
| ❌ No Priority Detection | Urgent cases treated same as non-urgent |
| ❌ Zero Transparency | Citizens have no visibility into complaint status |
| ❌ Language Barrier | Limited support for regional Indian languages |
| ❌ No Accountability | No mechanism to ensure timely resolution |
| ❌ No Analytics | No predictive insights or real-time reporting |

---

## 💡 Our Solution

**Civic Connect** automates the entire grievance lifecycle using AI:

```
Citizen Submits Complaint (Text + Geo-Photo + Voice)
                    ↓
         Pre-processing (NLP Cleaning)
                    ↓
     🤗 BERT Classification API (Hugging Face)
                    ↓
       Priority Scoring → High / Medium / Low
                    ↓
        Auto-Routing to Correct Department
                    ↓
     Admin Dashboard + Citizen Notifications
                    ↓
        Resolution + Feedback Loop (Retraining)
```

---

## ✨ Key Features

### 👤 For Citizens
- **🔓 Token-Free Access** — No mandatory registration. Submit grievances with just name and area.
- **📸 Geo-Tagged Evidence** — Photos captured with GPS coordinates, address & timestamp embedded directly onto the image.
- **🎙️ Voice Notes** — Submit audio complaints via microphone.
- **📍 Real-Time GPS** — OpenStreetMap reverse-geocoding converts coordinates to readable addresses automatically.
- **🔔 Status Tracking** — Unique tracking ID + email/SMS status updates.

### 🤖 For the AI Engine (Hosted on 🤗 Hugging Face)
- **🧠 BERT Classification** — Fine-tuned `bert-base-uncased` model categorizes complaints into 8 departments with **85–90% accuracy**.
- **⚡ Fast Prediction** — AI responds in **~0.4 seconds** per query.
- **📊 Priority Assignment** — Severity-based tagging: `Immediate` / `High` / `Medium` / `Low`.
- **🔍 Explainable AI (XAI)** — SHAP-based rationales explain every priority decision transparently.
- **♻️ Feedback Loop** — Post-resolution ratings continuously improve the model.

### 🖥️ For Administrators
- **📡 Live Heatmap** — Visualize complaint hotspots across geography in real time.
- **🗂️ Smart Filters** — Sort grievances by category, priority, date, and status.
- **🚫 Spam Filtering** — One-click to move irrelevant reports to spam folder.
- **✅ One-Click Resolve** — Resolve complaints and auto-notify citizens instantly.
- **📈 Analytics Dashboard** — Charts and metrics on department performance and resolution trends.

### 🔒 Security
- **JWT Authentication** — Secure admin portal with JSON Web Token-based login.
- **Encrypted Storage** — Sensitive data encrypted at rest in MongoDB.
- **Role-Based Access** — Separate citizen and admin access levels.
- **Cloud-Scalable** — Cloudinary for media, scalable to thousands of complaints.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  PRESENTATION LAYER                     │
│         Next.js 14 Web Portal (Vercel)                  │
│      Citizen Interface  |  Admin Dashboard              │
└──────────────────────┬──────────────────────────────────┘
                       │ REST APIs
┌──────────────────────▼──────────────────────────────────┐
│                  APPLICATION LAYER                      │
│                                                         │
│         Node.js / Express.js Backend                    │
│         JWT Auth | Multer | Cloudinary                  │
│                       │                                 │
│                       │ HTTP API Call                   │
│                       ▼                                 │
│        🤗 Hugging Face ML API (External)                │
│         BERT Classification + Priority Scoring          │
│              SHAP Explainable AI                        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                    DATA LAYER                           │
│       MongoDB (NoSQL)  |  Cloudinary (Media)            │
│   Users | Grievances | Departments | Notifications      │
└─────────────────────────────────────────────────────────┘
```

---

## 🧠 How the AI Works

> 🤗 The ML model lives in a **separate Hugging Face repository**. The backend calls it via API.

### Grievance Classification Flow (BERT)
```
1. Backend receives raw grievance text from citizen
2. Sends POST request → Hugging Face ML API
3. BERT tokenizes text (padding=True, truncation=True)
4. Model predicts probability across 8 categories
5. Selects highest probability class C
6. Assigns Priority:
   IF C = "Fire" or "Accident"     → Priority = "Immediate"
   IF C = "Water" or "Electricity" → Priority = "High"
   ELSE                            → Priority = "Medium"
7. Returns { Category, Priority } → Backend stores in MongoDB
```

### Grievance Categories Supported

Supported Categories (8):
Water Supply · Roads · Sanitation · Electricity · Garbage · Pollution · Public Transport · Stray Animals
---

## ⚙️ Tech Stack

### Frontend
![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white)

### Backend
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=JSON%20web%20tokens&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat-square)

### AI / ML *(Separate — 🤗 Hugging Face)*
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)
![HuggingFace](https://img.shields.io/badge/🤗_Hugging_Face-FFD21E?style=flat-square)
![BERT](https://img.shields.io/badge/BERT-bert--base--uncased-blue?style=flat-square)
![Scikit-learn](https://img.shields.io/badge/Scikit--learn-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)

### Database & Storage
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=flat-square)

### Deployment
![Vercel](https://img.shields.io/badge/Frontend_+_Backend-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![HuggingFace](https://img.shields.io/badge/ML_Model-Hugging_Face-FFD21E?style=flat-square)

---

## 📁 Project Structure

> This repo contains **Frontend + Backend only**. ML model is on Hugging Face.

```
Grievance-Portal/                  ← You are here
│
├── web-portal/                    # Next.js 14 Frontend
│   ├── app/
│   │   ├── page.jsx               # Home / Landing Page
│   │   ├── lodge/
│   │   │   └── SmartLodge.jsx     # Geo-Camera Capture Module
│   │   ├── track/                 # Complaint Status Tracker
│   │   └── admin/
│   │       ├── login/             # JWT Admin Auth
│   │       └── dashboard/         # Heatmap + Analytics
│   ├── components/                # Reusable UI Components
│   ├── public/                    # Static Assets
│   └── tailwind.config.js
│
├── server/                        # Node.js + Express Backend
│   ├── index.js                   # Entry Point + Cloudinary Config
│   ├── routes/
│   │   ├── grievances.js          # Grievance CRUD APIs
│   │   ├── auth.js                # Admin JWT Auth
│   │   └── notifications.js       # Email/SMS Alerts
│   ├── models/
│   │   ├── Grievance.js           # MongoDB Schema
│   │   ├── User.js
│   │   └── Department.js
│   └── middleware/
│       └── authMiddleware.js
│
└── README.md
```

> 🤗 **ML Repo (Separate):** BERT model training, Flask/FastAPI inference, SHAP explainability → [Hugging Face Space](https://huggingface.co/)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/) (local or Atlas)
- [Git](https://git-scm.com/)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/MOHAN799S/Grievance-Portal.git
cd Grievance-Portal
```

### 2️⃣ Setup Backend (Node.js)

```bash
cd server
npm install
```

Create a `.env` file in `/server`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
HUGGINGFACE_API_URL=your_huggingface_space_api_url
```

Start the backend:
```bash
node index.js
```

### 3️⃣ Setup Frontend (Next.js)

```bash
cd web-portal
npm install
npm run dev
```

App runs at **http://localhost:3000**

### 4️⃣ ML Model (Hugging Face — Separate Repo)

> The AI classification model is **not part of this repository**.
> It is deployed as an API on 🤗 Hugging Face Spaces.
> Simply add your Hugging Face Space URL to `HUGGINGFACE_API_URL` in the `.env` file above.
>
> 👉 [View ML Model on Hugging Face](https://huggingface.co/)

---

## 📊 Performance & Results

| Metric | Result |
|--------|--------|
| 🎯 AI Classification Accuracy | **85–90%** |
| ⚡ AI Prediction Time | **~0.4 seconds** |
| 📬 Full Submission Response | **~1.5 seconds** |
| 👥 Concurrent Users | **1,000+** |
| ✅ Test Cases Passed | **28 / 30** |
| 🔄 Target Uptime | **99%** |

### Old System vs Civic Connect

| Feature | Old Manual System | Civic Connect |
|---------|------------------|---------------|
| Classification | Manual by clerks | ✅ Automated BERT AI |
| Prioritization | First-Come-First-Serve | ✅ Severity-Based AI |
| Evidence | Basic image upload | ✅ Geo-Tagged + Timestamped |
| Citizen Access | Login mandatory | ✅ Token-Free |
| Storage | Local server | ✅ Cloudinary Cloud |
| ML Hosting | — | ✅ Hugging Face |
| Transparency | None | ✅ SHAP Explainable AI |

---

## 🔬 Testing

| ID | Description | Input | Expected | Status |
|----|-------------|-------|----------|--------|
| TC-01 | Citizen Lodge (No Auth) | "Broken Road" + Photo | Data in MongoDB | ✅ Pass |
| TC-02 | Geo-Tagging Accuracy | Camera Permission | Address on image | ✅ Pass |
| TC-03 | AI Classification | "No power since morning" | Electricity, High | ✅ Pass |
| TC-04 | Admin Login | Valid credentials | Dashboard access | ✅ Pass |
| TC-05 | Spam Detection | "Mark as Spam" | Moved to spam | ✅ Pass |
| TC-06 | Audio Upload | .webm file | Stored in Cloudinary | ✅ Pass (after fix) |

**28/30 test cases passed.** 2 initially failed on audio format — fixed by updating Cloudinary config.

---

## 🔮 Future Scope

| Enhancement | Description |
|-------------|-------------|
| 🗣️ Multilingual Voice AI | Speech-to-Text for Telugu & Hindi audio |
| ⛓️ Blockchain | Immutable tamper-proof resolved complaint records |
| 🌐 IoT Integration | Smart City sensors auto-generate tickets |
| 📱 Mobile App | Native Android/iOS apps |
| 🌍 More Languages | IndicBERT for all 22 Indian scheduled languages |
| 📉 Predictive Analytics | Forecast complaint hotspots before they surge |

---

## 👥 Team

| Name | Roll Number | Role |
|------|------------|------|
| **Kunche Alekhya** | 22MH1A0531 | Frontend Developer |
| **Sangidi Mohan Lakshman** | 22MH1A0562 | Backend Developer & AI Integration |
| **Kasindala Pardhasaradhi** | 22MH1A0525 | AI/ML Engineer |
| **Digumarthi Jaya Phani Srinivas** | 22MH1A0514 | Full Stack & System Design |

**Project Guide:** Mr. S. Chittibabulu M.Tech (Ph.D), Associate Professor, Dept. of CSE
**Head of Department:** Dr. G. S. N. Murthy M.Tech Ph.D
**Institution:** Aditya College of Engineering & Technology (A), Surampalem

---

## 🙏 Acknowledgements

- **Mr. S. Chittibabulu M.Tech (Ph.D)** — Project Guide
- **Dr. G. S. N. Murthy** — Head of Department, CSE
- **Dr. A. Ramesh** — Principal, Aditya College of Engineering & Technology
- **Dr. P.S.V.V.S. Ravi Kumar** — Dean (Academics)
- All faculty members and lab programmers of the CSE Department
- Management of Aditya College of Engineering & Technology

---

## 📚 References

1. Devlin, J., et al. *"BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding."* NAACL, 2019.
2. Vaswani, A., et al. *"Attention Is All You Need."* NeurIPS, 2017.
3. [Next.js Documentation](https://nextjs.org/docs)
4. [Cloudinary API Reference](https://cloudinary.com/documentation)
5. [OpenStreetMap Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
6. [Hugging Face Transformers](https://huggingface.co/docs/transformers)

---

<div align="center">

**⭐ If you found this project useful, please give it a star!**

[![GitHub stars](https://img.shields.io/github/stars/MOHAN799S/Grievance-Portal?style=social)](https://github.com/MOHAN799S/Grievance-Portal/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/MOHAN799S/Grievance-Portal?style=social)](https://github.com/MOHAN799S/Grievance-Portal/network/members)

<br/>

Made with ❤️ by Team Civic Connect | Aditya College of Engineering & Technology (A)

🌐 [Live Demo](https://grievance-portal-one.vercel.app/) • 💻 [GitHub](https://github.com/MOHAN799S/Grievance-Portal) • 🤗 [ML Model on Hugging Face](https://huggingface.co/)

</div>
