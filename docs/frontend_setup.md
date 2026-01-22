# Frontend Setup Guide

This guide details how to set up, install, and run the **MedGemma Bridge** frontend application.

## Prerequisites

Before starting, ensure you have the following installed on your system:

### 1. Node.js & npm

The application is built with **Vite + React** and requires Node.js.

- **Download:** [Node.js Official Website](https://nodejs.org/) (Recommend: LTS Version, e.g., v18 or v20).
- **Verification:**
  Open your terminal (PowerShell or Command Prompt) and run:
  ```powershell
  node -v
  npm -v
  ```
  _You should see versions output (e.g., `v20.9.0` and `10.1.0`)._

## Installation

1.  **Navigate to the Frontend Directory**
    Open your terminal in the project root and move to the `frontend` folder:

    ```powershell
    cd frontend
    ```

2.  **Install Dependencies**
    Run the following command to install all required packages (React, Tailwind CSS, Lucide Icons, Framer Motion):
    ```powershell
    npm install
    ```
    _This will create a `node_modules` folder._

## Running the Application (Development)

To start the local development server with Hot Module Replacement (HMR):

1.  Run the dev command:

    ```powershell
    npm run dev
    ```

2.  **Access the App:**
    The terminal will show a local URL, typically:
    - [http://localhost:5173/](http://localhost:5173/)

    _Note: The app reloads automatically when you save changes to the code._

## Building for Production

To create an optimized build for deployment:

1.  Run the build command:

    ```powershell
    npm run build
    ```

    _This generates a `dist/` folder containing the static files._

2.  (Optional) Preview the production build locally:
    ```powershell
    npm run preview
    ```

## Troubleshooting

- **"Vite is not recognized"**: Ensure you ran `npm install` inside the `frontend` folder.
- **Blank Page**: Check the terminal for errors. Ensure you are running a supported Node.js version.
- **Port 5173 in use**: Vite will automatically switch to the next available port (e.g., 5174). Check the terminal output for the correct URL.
