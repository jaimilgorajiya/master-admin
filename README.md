    # Master Admin - Multi-Software Management Suite

    A comprehensive enterprise-grade platform designed for managing multiple software products, reseller networks, and client lifecycles. Built with the **Midnight Prism** aesthetic, it provides a high-performance, visually stunning interface for administrators, staff, and partners.

    ## 🌟 Key Features

    ### 🏢 Administration & Staff
    - **Centralized Control**: Manage all software products, additional services, and global system settings.
    - **Role-Based Access Control (RBAC)**: Distinct portals for Master Admin, Staff, and Employees.
    - **Software Inventory**: Configure software details, custom registration fields, and API proxy endpoints for external software integration.
    - **Client Management**: Full lifecycle tracking from onboarding to subscription renewal.

    ### 🤝 Partner/Reseller Ecosystem
    - **Self-Service Portal**: Resellers can onboard their own clients and manage their team.
    - **Commission Slabs**: Automated commission calculation based on revenue performance (Flat or Slab-wise).
    - **Earnings Tracking**: Real-time ledger history with payout status tracking (Paid, Pending, Partial).
    - **Team Management**: Resellers can create and manage their own employees.

    ### 🛡️ Core Infrastructure
    - **API Proxy System**: Seamlessly interact with external software APIs through a unified backend proxy.
    - **Payment Integration**: Automated payment link generation and subscription tracking via Razorpay.
    - **Real-time Engine**: Socket.io integration for instant notifications and status updates.
    - **Security**: Robust JWT authentication, rate limiting, and encrypted storage.

    ## 🚀 Technology Stack

    | Component | Technology |
    | :--- | :--- |
    | **Frontend** | React 19, Vite, React Router 7, Recharts, Lucide Icons |
    | **Styling** | Midnight Prism Design System (Vanilla CSS + Glassmorphism) |
    | **Backend** | Node.js, Express 5.1, MongoDB + Mongoose |
    | **Authentication** | JSON Web Tokens (JWT), BcryptJS |
    | **Real-time** | Socket.io |
    | **Payments** | Razorpay Integration |
    | **Email** | Nodemailer |

    ## 📂 Project Structure

    ```bash
    Master Admin/
    ├── backend/            # Express Server & MongoDB Models
    │   ├── config/         # Database & Socket configurations
    │   ├── controllers/    # Business logic for routes
    │   ├── middleware/     # Auth & validation guards
    │   ├── models/         # Mongoose Schemas
    │   ├── routes/         # API Endpoints
    │   └── services/       # External service integrations (Email, Proxy)
    ├── frontend/           # React Web Application
    │   ├── src/
    │   │   ├── components/ # Reusable UI Modules
    │   │   ├── pages/      # Route-level screens
    │   │   ├── utils/      # API helpers & constants
    │   │   └── App.jsx     # Main routing & state
    ```

    ## 🛠️ Installation & Setup

    ### Prerequisites
    - Node.js (v18+)
    - MongoDB (Local or Atlas)
    - NPM or Yarn

    ### 1. Backend Setup
    ```bash
    cd backend
    npm install
    ```
    Create a `.env` file in the `backend` directory:
    ```env
    PORT=3000
    MONGODB_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_email_app_password
    RAZORPAY_KEY_ID=your_key_id
    RAZORPAY_KEY_SECRET=your_key_secret
    ```
    Run the server:
    ```bash
    npm run dev
    ```

    ### 2. Frontend Setup
    ```bash
    cd frontend
    npm install
    ```
    Create a `.env` file in the `frontend` directory:
    ```env
    VITE_API_BASE_URL=http://localhost:3000
    ```
    Run the application:
    ```bash
    npm run dev
    ```

    ## 🎨 Design Philosophy: Midnight Prism
    The platform utilizes the **Midnight Prism** design system, characterized by:
    - **Deep Space Palette**: Navy and deep purple backgrounds (`#0a0118`).
    - **Glassmorphism**: Translucent surfaces with subtle border glows.
    - **Vibrant Accents**: Cyan (`#00c8ff`) and Royal Blue (`#3b82f6`) for interactive elements.
    - **Modern Typography**: Clean, high-readability sans-serif fonts.

    ---
    *Note: This repository also includes a Mobile Application (Expo/React Native) located in the `/mobile` directory, currently under development for full feature parity with the web portal.*
